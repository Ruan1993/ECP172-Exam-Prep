import assert from'node:assert/strict';
import test from'node:test';
import{learningSequences,narrationText}from'../src/guidedData.ts';

test('every exam section has a short guided sequence',()=>{
 for(const area of ['Q1','Q2','Q3','Q4']as const){
  assert.ok(learningSequences[area].length>=6);
  for(const card of learningSequences[area]){
   assert.ok(card.title.length>0);
   assert.ok(card.body.length<320);
   assert.ok(card.takeaway.length>0);
  }
 }
});

test('narration combines each card into a useful spoken explanation',()=>{
 const spoken=narrationText(learningSequences.Q2[0]);
 assert.match(spoken,/Remember:/);
 assert.match(spoken,/For example:/);
});
