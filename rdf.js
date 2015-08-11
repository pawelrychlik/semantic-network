var fs = require('fs');
var _ = require('lodash');
var N3 = require('n3');


var db = require("seraph")("http://localhost:7474");
db.index.createIfNone('Synset', 'wnid', console.log);
db.constraints.uniqueness.createIfNone('Synset', 'wnid', console.log);

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
// download the n-triple data form http://wordnet-rdf.princeton.edu direct link: http://wordnet-rdf.princeton.edu/wn31.nt.gz
var rdfStream = fs.createReadStream('./../data/wordnet.nt');
var streamParser = N3.StreamParser();
rdfStream.pipe(streamParser);
streamParser.pipe(new ConsumerStream());


var predicates = {};
var counter = 0;

function ConsumerStream() {

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
        // console.log(triple);
        // setTimeout(done, 100);

        if (pred !== 'label') {
            done();
            return;
        }

        var obj = {
            label: 'Synset',
            wnid: wnid,
            pos: pos,
            value: value,
            lang: lang
        };
        db.save(obj, function(err, result) {
            console.log(err || result);
            done();
        });
    }
    return writer;
}

process.on('SIGINT', function() {
    console.log("Counter: %s", counter);
    console.log(predicates);
    console.log(_.keys(predicates));

    process.exit();
});


// idea: run the whole thing twice:
// 1. create only nodes (labels) in batches
// 2. create only relationships (hypernyms, antonyms, see also, translations) in batches