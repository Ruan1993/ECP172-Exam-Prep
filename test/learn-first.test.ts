import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

type Card = {id:string;title:string;kind:string;body:string[]};
const data = JSON.parse(readFileSync(new URL('../src/guide.json',import.meta.url),'utf8')) as Record<string,Card[]>;
const app = readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const all = Object.values(data).flat();

test('the only chapter order is Q1 then Q2 then Q3 then Q4',()=>{
 assert.deepEqual(Object.keys(data),['q1','q2','q3','q4']);
 for(const cards of Object.values(data)) assert.ok(cards.length>=7);
});

test('every content card has stable identity and nonempty educational content',()=>{
 assert.equal(new Set(all.map(card=>card.id)).size,all.length);
 assert.ok(all.every(card=>card.title.trim()&&card.body.every(text=>text.trim())));
 assert.ok(all.every(card=>card.kind==='intro'||card.kind==='concept'||card.kind==='scenario'||card.kind==='proposal'));
});

test('the actual full worked answers are present in each chapter',()=>{
 const text=(q:string)=>data[q].flatMap(c=>c.body).join(' ');
 assert.match(text('q1'),/The principal and school management team should work with the district/);
 assert.match(text('q2'),/explanatory sequential design/);
 assert.match(text('q2'),/parent or guardian consent and learner assent/);
 assert.match(text('q2'),/purposive sampling/);
 assert.match(text('q3'),/A learner cannot participate confidently when peers ridicule/);
 assert.match(text('q4'),/Equity pedagogy requires teachers to adapt methods and assessment/);
});

test('all theory precedes worked application within Q1 Q3 Q4',()=>{
 for(const q of ['q1','q3','q4']){
  const cards=data[q];const firstWorked=cards.findIndex(c=>c.kind==='scenario');
  assert.ok(firstWorked>0);
  assert.ok(cards.slice(0,firstWorked).every(c=>c.kind==='intro'||c.kind==='concept'));
  assert.ok(cards.slice(firstWorked).every(c=>c.kind==='scenario'));
 }
});

test('new study experience is informative, not a quiz/answer-builder',()=>{
 assert.doesNotMatch(app,/\bAnswerBuilder\b|\bExamChallenge\b|\bQuickRevision\b|\bMockExam\b|\bxp\b|\bTrophy\b/);
 assert.match(app,/I understand it/);
 assert.match(app,/Revise later/);
 assert.match(app,/ecp172-learn-first-v1/);
 assert.doesNotMatch(app,/localStorage\.removeItem\('ecp172-progress-v1'\)/);
});
