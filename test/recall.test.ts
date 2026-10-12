import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{advanceRecall}from'../src/recall.ts';

test('every section exposes every recall card once and stops at its actual total',()=>{
 const source=readFileSync(new URL('../src/data.ts',import.meta.url),'utf8');
 const expected={Q1:12,Q2:16,Q3:16,Q4:12};
 for(const[area,total]of Object.entries(expected)){
  const actual=[...source.matchAll(new RegExp(`fc\\('[^']+','${area}'`,'g'))].length;
  assert.equal(actual,total);
  let current=0;
  for(let answered=0;answered<actual;answered++)current=advanceRecall(current,actual);
  assert.equal(current,actual);
  assert.equal(advanceRecall(current,actual),actual);
 }
});
