import test from 'node:test';
import assert from 'node:assert/strict';
import guide from '../src/guide.json';
import {revisionBank} from '../src/revisionBank';
import {flashcardBank} from '../src/flashcardBank';
import {createFlashcardSession} from '../src/flashcardSession';
import {rateRevision} from '../src/revisionProgress';
import {isReadingBackup,migrateReadingProgress,restoreReadingBackup} from '../src/readingProgress';
import {examFocusFlashcards} from '../src/examFocusFlashcards';

test('content audit retains official course terminology and the lecturer-focused exam distinctions',()=>{
 const card=(id:string)=>flashcardBank.find(c=>c.id===id)!;
 for(const [id,term] of [['fc-q1-sasa','South African Schools Act 84 of 1996'],['fc-q1-employment','Employment of Educators Act 76 of 1998'],['fc-q1-safe-search','Education Laws Amendment Act 31 of 2007'],['fc-q1-admission-policy','Admission Policy for Ordinary Public Schools']])assert.ok(card(id).answer.includes(term));
 assert.match(card('rev-q4-knowledge-construction').answer,/collaborative learning/);
 assert.match(card('fc-q3-lac-expansion').answer,/reading, writing, speaking, listening/);
 assert.match(card('rev-q2-ethics').answer,/ethical clearance.*before collecting data/);
 assert.match(card('fc-q2-final-chain').answer,/secondary questions.*objectives.*instrument.*ethical clearance.*findings.*recommendations/);
 assert.match(card('fc-q2-framework').prompt,/worked-example guide/);
 assert.match(card('fc-q2-instrument-alignment').answer,/No\. Choose an approach/);
 assert.match(card('fc-q4-cultural-differences').answer,/Form of address, customary behaviour, feedback, communication style and perception of time/);
 assert.match(card('fc-q4-goals').answer,/empowering both dominant and subordinate groups/);
 assert.match(card('fc-q3-medical-social').answer,/individual.*systems, environments and social interaction/);
 assert.match(card('fc-q3-differentiation-areas').answer,/Content; process.*product.*environment/);
});

test('every verified exam-focus addition records its source section and keeps stable unique IDs',()=>{
 assert.equal(examFocusFlashcards.length,24);
 for(const card of examFocusFlashcards){assert.ok(card.noteSections?.length,card.id);assert.ok(flashcardBank.some(c=>c.id===card.id));assert.ok(card.answer.length<500,card.id)}
 assert.equal(flashcardBank.length,109);
});

test('flashcards cover all four chapters, have short answers and retain every prior full explanation and rating ID',()=>{
 assert.equal(new Set(flashcardBank.map(c=>c.id)).size,flashcardBank.length);
 for(const section of ['q1','q2','q3','q4'] as const)assert.ok(flashcardBank.filter(c=>c.section===section).length>=20);
 for(const card of flashcardBank){
  assert.ok(card.answer&&card.answer.length<500,card.id);assert.ok(card.prompt.length>10);
  assert.ok(card.sourceIds.length&&card.sourceIds.every(id=>guide[card.section].some(source=>source.id===id)),card.id);
 }
 for(const old of revisionBank){
  const card=flashcardBank.find(c=>c.id===old.id)!;assert.ok(card);assert.equal(card.prompt,old.prompt);
  assert.deepEqual(card.details,[...old.points,...(old.remember?[old.remember]:[])]);
 }
 const content=flashcardBank.map(c=>`${c.prompt} ${c.answer}`).join(' ');
 for(const term of ['SASA','BELA','White Paper 6','SACE','HIV/AIDS','Employment of Educators Act','Education Laws Amendment Act','parental consent','learner assent','qualitative','quantitative','Mixed methods','Population','Sample','SIAS','LoLT','LiEP','LAC','Scaffolding','Differentiation','Knowledge construction','Content integration','Prejudice reduction','Equity pedagogy'])assert.match(content,new RegExp(term,'i'),term);
});

test('all five filters form exact unique decks; shuffling changes order without omissions or repeats',()=>{
 const state=migrateReadingProgress({});
 for(const filter of ['all','q1','q2','q3','q4'] as const){
  const expected=flashcardBank.filter(c=>filter==='all'||c.section===filter).map(c=>c.id).sort();
  const first=createFlashcardSession(filter,()=>0),second=createFlashcardSession(filter,()=>.999);
  assert.deepEqual(first.map(c=>c.id).sort(),expected);assert.equal(new Set(first.map(c=>c.id)).size,first.length);
  assert.notDeepEqual(first.map(c=>c.id),second.map(c=>c.id));
 }
});

test('flashcard shuffling never consults or changes existing ratings or bookmarks',()=>{
 const state=migrateReadingProgress({ratings:{'q1-rights':'later'},revision:{ratings:{'rev-q1-rights':'understood','rev-q2-approaches':'later'}}});
 const before=JSON.stringify(state),ids=createFlashcardSession('all',()=>.999).map(card=>card.id);
 assert.deepEqual(ids,flashcardBank.map(card=>card.id));
 rateRevision(state,'rev-q1-rights','later');
 assert.deepEqual(createFlashcardSession('all',()=>.999).map(card=>card.id),ids);
 assert.equal(JSON.stringify(state),before);
});

test('old revision ratings and new flashcard ratings round-trip in unchanged version-one backups',()=>{
 const state=migrateReadingProgress({ratings:{'q2-a1':'later','q4-b':'understood'},position:{q1:2,q2:1,q3:0,q4:1},lastQuestion:'q2',revision:{ratings:{'rev-q1-rights':'later','rev-q3-lolt':'understood','fc-q2-proposal':'later'}}});
 const backup={version:1,kind:'ECP172 Learn First',...state};assert.ok(isReadingBackup(backup));
 assert.deepEqual(migrateReadingProgress(JSON.parse(JSON.stringify(backup))),state);
 const restored=restoreReadingBackup(JSON.parse(JSON.stringify(backup)),migrateReadingProgress({}));assert.deepEqual(restored,state);
 const older={version:1,kind:'ECP172 Learn First',ratings:{'q1-intro':'later'},position:{q1:0,q2:0,q3:0,q4:0},lastQuestion:'q1'};
 assert.ok(isReadingBackup(older));assert.deepEqual(restoreReadingBackup(older,state).revision,state.revision);
 const rated=rateRevision(restored,'fc-q3-lac-expansion','understood');assert.equal(rated.revision?.ratings['rev-q1-rights'],'later');assert.equal(rated.revision?.ratings['fc-q2-proposal'],'later');assert.deepEqual(rated.ratings,state.ratings);
});
