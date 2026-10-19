import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {examFormat2026,pastPaperSummaries,questionSourceNotice,readingQuestionTopics,guidedQuestionTopics} from '../src/pastPaperQuestions.ts';
const source=(name:string)=>readFileSync(new URL(`../src/${name}`,import.meta.url),'utf8');

test('historical panels use only clearly qualified repository summaries',()=>{
 assert.equal(Object.keys(pastPaperSummaries).length,4);
 const historical=source('data.ts');
 for(const item of Object.values(pastPaperSummaries)){
  assert.ok(historical.includes(`id:'${item.sourceId}'`));
  assert.deepEqual(Object.keys(item).sort(),['preparation','sourceId','summary','title']);
  assert.ok(item.summary.length>100&&item.preparation.length>100);
 }
 assert.match(questionSourceNotice,/not been verified/);
 assert.match(questionSourceNotice,/not an original quotation/);
 assert.match(questionSourceNotice,/exam year, paper, question number and marks/);
 // No historical metadata or quotes are promoted from the unverified source labels.
 assert.doesNotMatch(JSON.stringify(pastPaperSummaries),/2025|Semester|FIS|[“”]/);
});
test('2026 preparation preserves the final lecturer format',()=>{
 assert.match(examFormat2026,/four compulsory questions worth 25 marks each/);
 assert.match(examFormat2026,/no essays/);
 assert.match(examFormat2026,/Q1–Q3 are scenario-based/);
 assert.match(examFormat2026,/Q4 is theory-based/);
 assert.match(pastPaperSummaries.bela.preparation,/Do not copy the historical essay format/);
 assert.match(pastPaperSummaries.multilingual.preparation,/do not reproduce the historical essay format/);
});
test('panels are attached only to related existing cards and no Q4 history is invented',()=>{
 const guide=JSON.parse(source('guide.json')) as Record<string,{id:string}[]>;
 const ids=new Set(Object.values(guide).flat().map(c=>c.id));
 for(const [id,topic] of Object.entries(readingQuestionTopics)){assert.ok(ids.has(id));assert.ok(topic in pastPaperSummaries);assert.ok(!id.startsWith('q4'))}
 assert.deepEqual(new Set(Object.values(readingQuestionTopics)),new Set(Object.keys(pastPaperSummaries)));
 for(const [key,topic] of Object.entries(guidedQuestionTopics)){assert.match(key,/^Q[1-3]:\d$/);assert.ok(topic in pastPaperSummaries)}
});
test('native disclosure is collapsed by default, with reading assistance only when expanded',()=>{
 const panel=source('ExamQuestionPanel.tsx');
 assert.match(panel,/useState\(false\)/);
 assert.match(panel,/<details[^>]+open=\{expanded\}/);
 assert.match(panel,/<summary>Show past-paper question<\/summary>/);
 assert.doesNotMatch(panel,/Show original exam question/);
 assert.match(panel,/expanded&&<div/);
 assert.match(panel,/Past-paper question summary/);
 assert.match(panel,/How to prepare for the 2026 exam/);
 assert.match(panel,/<ReadAloud[^>]+scope=\{\(\)=>content.current\}/);
 assert.doesNotMatch(panel,/localStorage|setProgress|speechSynthesis|autoPlay/);
 const app=source('App.tsx');assert.match(app,/<ExamQuestionPanel key=\{current.id\}/);
 assert.match(source('GuidedLearning.tsx'),/<ExamQuestionPanel key=\{`\$\{area\}:\$\{safeIndex\}`\}/);
});
