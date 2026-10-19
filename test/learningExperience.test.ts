import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import guide from '../src/guide.json';
import {learningConcepts,conceptForText} from '../src/learningConcepts';
import {normaliseSpeech} from '../src/speechText';
import {boundaryWord,SpeechController,preferenceKey} from '../src/speech';

test('natural sequence and causal narration preserve all concepts',()=>{
 assert.equal(normaliseSpeech('Problem → Question → Aim').text,'Problem , followed by  research question , followed by  Aim');
 const causal=normaliseSpeech('Belief → attitude → behaviour. Know the difference.');
 assert.equal(causal.text,'Belief leads to attitude, which can influence behaviour. Know the difference.');
 assert.equal(causal.mapWord({start:0,end:6}),null);
 assert.equal(normaliseSpeech('20% & support = access + participation').text.replace(/\s+/g,' '),'20 per cent and support means access plus participation');
});
test('every spoken word after expansions maps to the original UTF-16 source',()=>{
 const source='😀 LoLT → support & dignity.',spoken=normaliseSpeech(source);
 for(const word of new Intl.Segmenter('en',{granularity:'word'}).segment(spoken.text)){
  if(!word.isWordLike)continue;
  const mapped=spoken.mapWord(boundaryWord(spoken.text,word.index,word.segment.length,'word')!);
  if(['followed','by'].includes(word.segment)){assert.equal(mapped,null);continue}
  assert.ok(mapped);const visible=source.slice(mapped.start,mapped.end);
  if(['Language','of','Learning','and','Teaching'].includes(word.segment)&&word.index<spoken.text.indexOf('followed'))assert.equal(visible,'LoLT');
  else if(word.segment==='support'||word.segment==='dignity')assert.equal(visible,word.segment);
 }
 assert.equal(normaliseSpeech('Unchanged prose.').mapWord({start:0,end:9})?.end,9);
});
test('new sessions and resuming restore only the saved follow preference',()=>{
 const values=new Map<string,string>(),storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)};
 const engine={cancel(){},resume(){},getVoices:()=>[],speak(){}} as any;
 let c=new SpeechController(engine,()=>({}) as any,storage);assert.equal(c.follow,true);
 c.play('First.');c.setFollow(false,false);c.play('Second.');assert.equal(c.follow,true);
 c.setFollow(false,false);c.pause();c.resume();assert.equal(c.follow,true);
 c.setFollow(false);c.play('Third.');assert.equal(c.follow,false);
 c=new SpeechController(engine,()=>({}) as any,storage);c.play('Reopened.');assert.equal(c.follow,false);assert.equal(JSON.parse(values.get(preferenceKey)!).follow,false);
});
test('Q4 definitions and full answers share explicit numbers and colour associations',()=>{
 const expected=['yellow','green','blue','purple','yellow','green','blue'];
 assert.deepEqual(learningConcepts.map(c=>c.tone),expected);
 for(const concept of learningConcepts){
  const matches=guide.q4.flatMap(c=>c.body).filter(t=>conceptForText(t)?.id===concept.id);
  assert.equal(matches.length,2,concept.label+' has an introduction and a model explanation');
 }
 assert.equal(conceptForText('Equality and equity are related.'),undefined);
 assert.equal(conceptForText('A stereotype is a generalised belief.'),undefined);
});
test('revision preserves all card IDs, both complete Q2 proposals and learning content volume',()=>{
 const ids={"q1": ["q1-intro", "q1-rights", "q1-school", "q1-access", "q1-inclusion", "q1-teachers", "q1-safety", "q1-scenario"], "q2": ["q2-essentials", "q2-a-intro", "q2-a-proposal", "q2-b-intro", "q2-b-proposal", "q2-final"], "q3": ["q3-intro", "q3-a", "q3-b", "q3-c", "q3-d", "q3-story-a", "q3-story-b"], "q4": ["q4-intro", "q4-a", "q4-b", "q4-c", "q4-d", "q4-e", "q4-f", "q4-answer-a", "q4-answer-b"]};
 assert.equal(createHash('sha256').update(JSON.stringify(guide.q2)).digest('hex'),'93a8f47952d2210a0c04f56d30dacdb385a0f0070f9e4d1aedcaed05a812af39');
 for(const area of ['q1','q2','q3','q4'] as const){
  assert.deepEqual(guide[area].map(c=>c.id),ids[area]);
  const baseline={"q1": 5498, "q2": 4585, "q3": 5085, "q4": 5117};
  assert.ok(guide[area].flatMap(c=>c.body).join(' ').length>=baseline[area]*.97);
 }
});
