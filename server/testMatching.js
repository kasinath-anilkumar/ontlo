/**
 * Quick sanity check for Matchmaker module shape (singleton + class for isolated tests).
 * Run from repo root: `node server/testMatching.js`
 */
const mm = require('./services/Matchmaker');

if (typeof mm.joinQueue !== 'function') {
  console.error('FAIL: matchmaker singleton missing joinQueue');
  process.exit(1);
}
if (typeof mm.Matchmaker !== 'function') {
  console.error('FAIL: mm.Matchmaker class not attached for tests');
  process.exit(1);
}

console.log('OK: matchmaker singleton loaded; Matchmaker class available for `new mm.Matchmaker()`.');
console.log('Current queue length (prod singleton):', mm.queue.length);
