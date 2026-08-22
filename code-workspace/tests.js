// Focused tests for main.js
// The website editor can replace this file with tests based on your mistakes.

const expected = 'hello';
if (solve('hello') !== expected) {
  throw new Error(`Expected ${expected}, received ${solve('hello')}`);
}

console.log('All tests passed');
