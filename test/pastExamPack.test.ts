import test from 'node:test';
import assert from 'node:assert/strict';
import pack from '../src/pastExamPack.json';
import {readRoute,routeHash} from '../src/contentNavigation';

test('study pack retains its complete labelled question inventory and cautions',()=>{
 assert.deepEqual(pack.sections.map(s=>s.id),['q1','q2','q3','q4']);
 assert.deepEqual(pack.sections.map(s=>s.entries.filter(e=>e.kind==='question').length),[10,17,10,17]);
 const questions=pack.sections.flatMap(s=>s.entries.filter(e=>e.kind==='question'));
 assert.equal(new Set(questions.map(q=>q.id)).size,54);
 for(const q of questions){
  assert.ok(q.answer);assert.match(q.prompt!,/marks?[:)]/);
  if(q.prompt!.includes('[Predicted]'))assert.equal(q.label,'Predicted');
  if(q.prompt!.includes('[Practice]')||q.prompt!.startsWith('PRACTICE:')||q.prompt!.includes('converted to study prompt'))assert.equal(q.label,'Practice');
 }
 assert.equal(questions.filter(q=>q.label==='Predicted').length,6);
 const text=JSON.stringify(pack);
 assert.match(text,/Confirm the exact FOUR/);
 assert.match(text,/remaining nine marks/);
 assert.match(text,/private interviews are safer for victims/);
 assert.match(text,/Ms\. Phindi/);assert.match(text,/Ms\. Zama/);
 assert.equal(routeHash({page:'past-exams'}),'#past-exams');
 assert.deepEqual(readRoute('#past-exams'),{page:'past-exams'});
});
