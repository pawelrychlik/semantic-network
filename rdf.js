var fs = require('fs');
var _ = require('lodash');
var N3 = require('n3');


var db = require("seraph")("http://localhost:7474");
db.index.createIfNone('Synset', 'wnid', function(err, res) { err && console.log(err); });
db.constraints.uniqueness.createIfNone('Synset', 'wnid', function(err, res) { err && console.log(err); });

function testSaveNode() {
    db.save({
        label: 'Synset',
        wnid: '100021007',
        pos: 'n',
        value: 'matter',
        lang: 'eng'
    }, console.log);
}
// return testSaveNode();

// var rdfStream = fs.createReadStream('./../wordnet-3.0-rdf/rdf/rdf/basic/void.ttl');
// download the n-triple data from http://wordnet-rdf.princeton.edu direct link: http://wordnet-rdf.princeton.edu/wn31.nt.gz
var rdfStream = fs.createReadStream('./../data/wordnet.nt');
var streamParser = N3.StreamParser();
rdfStream.pipe(streamParser);
streamParser.pipe(new ConsumerStream());


var predicates = {}; // a map - just to see what predicates are there in the dataset
var counter = 0;
var txCounter = 0;

function ConsumerStream() {

    var tx = db.batch();

    var writer = new require('stream').Writable({ objectMode: true });
    writer._write = function (triple, encoding, done) {
        // example triple:
        // {
        //     "subject":"http://wordnet-rdf.princeton.edu/wn31/100021007-n",
        //     "predicate":"http://www.w3.org/2000/01/rdf-schema#label",
        //     "object":"\"matter\"@eng",
        //     "graph":""
        // }

        counter += 1;

        var urlid = triple.subject.slice(triple.subject.lastIndexOf('/') + 1);
        var wnid = urlid.slice(0, -2);
        var pos = urlid.slice(-1);

        var pred = triple.predicate.slice(triple.predicate.lastIndexOf('#') + 1);

        var lang = (pred === 'label' && triple.object.slice(triple.object.lastIndexOf('@') + 1)) || 'eng';
        var value = (pred === 'label' && triple.object.slice(1, triple.object.lastIndexOf('"'))) || '';

        predicates[pred] = triple.object;

        // console.log('%s (%s) ==[%s]==> %s', wnid, pos, pred, triple.object)

        if (pred !== 'label') {
            done();
            return;
        }

        tx.save({
            label: 'Synset',
            wnid: wnid,
            pos: pos,
            value: value,
            lang: lang
        });

        if (++txCounter % 5000 === 0) {
            tx.commit(function(err, results) {
                console.log(err || "COMMITTED, total: %s", txCounter);

                tx = db.batch();

                done();
            });
        } else {
            done();
        }
    }

    writer.on('finish', function() {
        console.log('stream finished')
        tx.commit(function(err, results) {
            console.log(err || "COMMITTED, total: %s", txCounter);
        });
    });
    writer.on('error', console.error);

    return writer;
}

function printStats() {
    console.log("N-triples processed: %s", counter);
    console.log("Created synsets: %s", txCounter);
    console.log(predicates);
    console.log(_.keys(predicates));
}
process.on('exit', printStats);
process.on('SIGINT', function() {
    printStats();
    process.exit();
});

// idea: run the whole thing twice:
// 1. create only nodes (labels) in batches
// 2. create only relationships (hypernyms, antonyms, see also, translations) in batches