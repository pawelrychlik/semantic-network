var natural = require('natural');
var wordnet = new natural.WordNet();
var when = require('when');
var _ = require('lodash');

var word = process.argv[2] || 'rodent';

wordnet.lookup(word, function(synsets) {

    if (!synsets || !synsets.length) {
        console.log('No synsets found.');
        return;
    }

    //-- Take only the most relevant synsets --
    var relevant = _(synsets)
        // wrap into object and calculate levenshtein distance
        .map(function(synset) { return { val: synset, distance: natural.LevenshteinDistance(word, synset.lemma) }; })
        .sortBy('distance')
        .filter(function(i) { return i.distance < 4; })
        // unwrap
        .pluck('val').value();

    _.forEach(relevant, function(synset) {
        // console.log('LOOKUP: %j', synset);

        var callback = function(theSynset, relatedSynsets) {
            _.forEach(relatedSynsets, function(relatedSynset) {
                console.log('%s (%s; %s) ==[%s]==> %s (%s; %s)', theSynset.lemma, theSynset.synsetOffset, theSynset.pos, relatedSynset.pointerSymbol, relatedSynset.lemma, relatedSynset.synsetOffset, relatedSynset.pos);

                findRelatedSynsets(relatedSynset, callback);
            });
        };
        
        findRelatedSynsets(synset, callback);

     });
});


function findRelatedSynsets(synset, cb) {
    var filteredPointers = synset.ptrs;
    filteredPointers = synset.ptrs.filter(function(ptr) {
        return ptr.pointerSymbol === "@";
    });

    wordnet.loadSynonyms([], [], _.clone(filteredPointers), function(relatedSynsets) {
        _.forEach(relatedSynsets, function(relatedSynset) {

            var symbol = _.find(filteredPointers, function(p) {
                return p.synsetOffset === relatedSynset.synsetOffset;
            }).pointerSymbol;

            relatedSynset.pointerSymbol = symbol;

            // console.log('%s (%s; %s) ==[%s]==> %s (%s; %s)', synset.lemma, synset.synsetOffset, synset.pos, symbol, relatedSynset.lemma, relatedSynset.synsetOffset, relatedSynset.pos);
        });

        cb(synset, relatedSynsets);
    });
}