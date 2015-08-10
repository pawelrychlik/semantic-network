var natural = require('natural');
var wordnet = new natural.WordNet();
var when = require('when');
var _ = require('lodash');

var word = process.argv[2] || 'rodent';

wordnet.lookup(word, function(synsets) {

    var sorted = _.sortBy(synsets, function(synset) {
        return 1 - natural.JaroWinklerDistance(word, synset.lemma);
    });

    synset = sorted[0];
    _.forEach(synsets, function(synset) {
        console.log('LOOKUP: %j', synset);

        var filteredPointers = synset.ptrs;
        filteredPointers = synset.ptrs.filter(function(ptr) {
            return ptr.pointerSymbol === "@";
        });


        var callback = function(relatedSynsets) {
            _.forEach(relatedSynsets, function(relatedSynset) {
                console.log('%s (%s; %s) ==[%s]==> %s (%s; %s)', synset.lemma, synset.synsetOffset, synset.pos, relatedSynset.pointerSymbol, relatedSynset.lemma, relatedSynset.synsetOffset, relatedSynset.pos);


                var filteredPointers = relatedSynset.ptrs.filter(function(ptr) {
                    return ptr.pointerSymbol === "@";
                });
                findRelatedSynsets(filteredPointers, callback);
            });
        };
        
        findRelatedSynsets(filteredPointers, callback);

     });
});


function findRelatedSynsets(pointers, cb) {
    wordnet.loadSynonyms([], [], _.clone(pointers), function(relatedSynsets) {
        _.forEach(relatedSynsets, function(relatedSynset) {

            var symbol = _.find(pointers, function(p) {
                return p.synsetOffset === relatedSynset.synsetOffset;
            }).pointerSymbol;

            relatedSynset.pointerSymbol = symbol;

            // console.log('%s (%s; %s) ==[%s]==> %s (%s; %s)', synset.lemma, synset.synsetOffset, synset.pos, symbol, relatedSynset.lemma, relatedSynset.synsetOffset, relatedSynset.pos);
        });

        cb(relatedSynsets);
    });
}