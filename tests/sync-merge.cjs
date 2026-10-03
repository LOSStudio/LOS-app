const assert=require('assert');const {merge}=require('../.github/scripts/sync-merge.js');
assert.deepEqual(merge({a:1,b:1},{a:2,b:1},{a:1,b:3}),{a:2,b:3});
assert.deepEqual(merge([{id:'a',qty:1},{id:'b',qty:2}],[{id:'a',qty:3},{id:'b',qty:2}],[{id:'a',qty:1},{id:'b',qty:4}]),[{id:'a',qty:3},{id:'b',qty:4}]);
assert.deepEqual(merge([{id:'a'},{id:'b'}],[{id:'b'}],[{id:'a'},{id:'b'},{id:'c'}]),[{id:'b'},{id:'c'}]);
assert.deepEqual(merge({text:'old'},{text:'device A'},{text:'device B'}),{text:'device A'});
console.log('PASS: disjoint fields, disjoint records, deletion plus addition, and same-field last committing edit');
