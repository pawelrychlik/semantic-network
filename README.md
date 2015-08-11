# semantic-network
WordNet + Neo4j = semantic network

### index.js
A handy console lookup tool for WordNet 3.1.

Run: `node index.js greyhound` where `greyhound` is your query.

### rdf.js
Reads the [WordNet-RDF](http://wordnet-rdf.princeton.edu) dump (~1.3 GB), and inserts the entries (synsets / relationships) into Neo4j in batches.

Run: `node rdf.js`

##### TODO: let's run the whole thing twice:
* create only nodes (labels) in batches
* create only relationships (hypernyms, antonyms, see also, translations) in batches