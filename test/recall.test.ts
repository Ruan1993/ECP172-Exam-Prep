import assert from'node:assert/strict';
import test from'node:test';
import{advanceRecall}from'../src/recall.ts';

test('a four-question recall session completes once and cannot advance again',()=>{
 let current=0;
 for(let answered=0;answered<4;answered++)current=advanceRecall(current,4);
 assert.equal(current,4);
 assert.equal(advanceRecall(current,4),4);
});
