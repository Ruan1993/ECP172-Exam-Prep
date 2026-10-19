import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import guide from '../src/guide.json';
import {revisionBank} from '../src/revisionBank';
import {orderedRevision,rateRevision} from '../src/revisionProgress';
import {migrateReadingProgress,restoreReadingBackup,isReadingBackup} from '../src/readingProgress';
import {conceptForText} from '../src/learningConcepts';

test('curated bank has eight stable unique questions per section and valid learning sources',()=>{
 assert.equal(new Set(revisionBank.map(q=>q.id)).size,32);
 for(const section of ['q1','q2','q3','q4'] as const){
  const questions=revisionBank.filter(q=>q.section===section);assert.equal(questions.length,8);
  for(const q of questions){
   assert.match(q.id,new RegExp(`^rev-${section}-[a-z-]+$`));assert.ok(q.prompt.length>30);assert.ok(q.hint.length>15);
   assert.ok(q.points.length>0&&q.points.every(p=>typeof p==='string'&&p.length>20));
   assert.ok(q.sourceIds.length&&q.sourceIds.every(id=>guide[section].some(card=>card.id===id)));
  }
 }
 const approaches=revisionBank.find(q=>q.id==='rev-q2-approaches')!.points.join(' ');
 for(const name of ['Qualitative','Quantitative','Mixed methods'])assert.match(approaches,new RegExp(name));
 assert.match(revisionBank.find(q=>q.id==='rev-q2-sampling')!.points.join(' '),/Population.*Sample/s);
 assert.match(revisionBank.find(q=>q.id==='rev-q2-cyberbullying-design')!.points.join(' '),/percentages/);
});

test('bookmarks feed priority without changing old ratings; explicit question ratings take precedence',()=>{
 const original=migrateReadingProgress({ratings:{'q1-safety':'later','q2-types':'later'},position:{q1:2},lastQuestion:'q1'});
 assert.equal(orderedRevision('q1',original)[0].id,'rev-q1-safety-dignity');
 assert.ok(orderedRevision('q2',original)[0].sourceIds.includes('q2-essentials'));
 let next=rateRevision(original,'rev-q1-safety-dignity','understood');
 assert.deepEqual(next.ratings,original.ratings);assert.deepEqual(next.position,original.position);
 assert.equal(orderedRevision('q1',next).at(-1)!.id,'rev-q1-safety-dignity');
 next=rateRevision(next,'rev-q1-religion','later');assert.equal(orderedRevision('q1',next)[0].id,'rev-q1-religion');
 assert.equal(original.revision,undefined);
 for(const q of revisionBank.filter(q=>q.section==='q1'))next=rateRevision(next,q.id,'understood');
 assert.equal(orderedRevision('q1',next).length,8);
});

test('extended version-one backups round-trip both rating sets and accept old backups',()=>{
 const old={version:1,kind:'ECP172 Learn First',ratings:{'q1-intro':'later'},position:{q1:2,q2:0,q3:0,q4:0},lastQuestion:'q1'};
 const state=rateRevision(migrateReadingProgress(old),'rev-q1-rights','later');
 const backup={...old,...state};
 assert.ok(isReadingBackup(old));assert.ok(isReadingBackup(backup));assert.equal(isReadingBackup({...backup,revision:{ratings:{x:'invalid'}}}),false);assert.equal(isReadingBackup({...backup,revision:{ratings:[]}}),false);const restored=migrateReadingProgress(JSON.parse(JSON.stringify(backup)));
 assert.deepEqual(restored,state);assert.equal(migrateReadingProgress(old).revision,undefined);
 assert.equal(migrateReadingProgress({...backup,revision:{ratings:{'rev-q1-rights':'wrong','rev-q1-religion':'understood'}}}).revision?.ratings['rev-q1-rights'],undefined);
 assert.deepEqual(restored.ratings,old.ratings);
 assert.deepEqual(restoreReadingBackup(old,state).revision,state.revision);
 assert.deepEqual(restoreReadingBackup(backup,migrateReadingProgress(old)),state);
});

test('revision reuses all seven numbered Q4 colour associations without unrelated colour matches',()=>{
 const matches=revisionBank.filter(q=>q.section==='q4').flatMap(q=>q.points).map(conceptForText).filter(Boolean);
 for(const id of ['knowledge-construction','content-integration','prejudice-reduction','equity-pedagogy','equality','equity','discrimination'])assert.ok(matches.some(c=>c!.id===id),id);
 assert.equal(conceptForText('The teacher adapts methods.'),undefined);
});

test('flashcard animation respects reduced motion',()=>{
 const css=readFileSync(new URL('../src/flashcards.css',import.meta.url),'utf8');
 for(const name of ['fc-enter','fc-countdown','fc-confetti','fc-finish'])assert.match(css,new RegExp('@keyframes '+name));
 assert.match(css,/backface-visibility:hidden/);assert.match(css,/rotateY\(180deg\)/);assert.match(css,/animation-play-state:paused/);assert.doesNotMatch(css,/\binfinite\b/);
 assert.match(css,/\.fc-card-inner,\.fc-back\{transform:none!important/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/animation:none!important/);assert.match(css,/transition:none!important/);
 const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');assert.match(app,/Learn it\. Understand it\. Remember it\. 🌿/);assert.doesNotMatch(app,/Made for understanding, not testing/);
});
