import test from 'node:test';
import assert from 'node:assert/strict';
import guide from '../src/guide.json';
import {migrateReadingProgress} from '../src/readingProgress';

test('Q2 has exactly six ordered cards and two concise complete proposals',()=>{
 assert.deepEqual(guide.q2.map(c=>c.id),['q2-essentials','q2-a-intro','q2-a-proposal','q2-b-intro','q2-b-proposal','q2-final']);
 for(const i of [2,4]){
  const body=guide.q2[i].body;
  assert.equal(body.length,22);
  assert.deepEqual(body.filter((_,j)=>j%2===0).map(s=>Number(s.split('.')[0])),Array.from({length:11},(_,j)=>j+1));
  assert.ok(body.join(' ').split(/\s+/).length<300);
 }
 assert.match(guide.q2[1].tag,/SCENARIO A/);assert.match(guide.q2[3].tag,/SCENARIO B/);
});
test('migration preserves other chapters and source ratings, and clamps obsolete positions',()=>{
 const source={ratings:{'q1-intro':'later','q3-a':'understood','q4-intro':'later','q2-a1':'later'},position:{q1:3,q2:13,q3:2,q4:1},lastQuestion:'q2'};
 const next=migrateReadingProgress(source);
 for(const [id,rating] of Object.entries(source.ratings))assert.equal(next.ratings[id],rating);
 assert.deepEqual(next.position,{q1:3,q2:5,q3:2,q4:1});assert.equal(next.lastQuestion,'q2');
 assert.equal(next.ratings['q2-a-proposal'],'later');assert.equal(next.ratings['q2-b-proposal'],undefined);
 assert.deepEqual(source.position.q2,13);
});
test('merged understanding requires every source and keeps revision flags and newer choices',()=>{
 const ratings=Object.fromEntries(['q2-a1','q2-a2','q2-a3','q2-a4','q2-a5'].map(id=>[id,'understood']));
 assert.equal(migrateReadingProgress({ratings}).ratings['q2-a-proposal'],'understood');
 assert.equal(migrateReadingProgress({ratings:{...ratings,'q2-a5':'later'}}).ratings['q2-a-proposal'],'later');
 delete ratings['q2-a5'];assert.equal(migrateReadingProgress({ratings}).ratings['q2-a-proposal'],undefined);
 const next=migrateReadingProgress({ratings:{...ratings,'q2-a-proposal':'understood','q2-a1':'later'}});
 assert.equal(next.ratings['q2-a-proposal'],'understood');assert.deepEqual(migrateReadingProgress(next),next);
});
test('old and current backup payloads share migration; malformed positions cannot escape bounds',()=>{
 const backup={kind:'ECP172 Learn First',version:1,ratings:{'q2-types':'later'},position:{q2:Infinity,q1:2.8,q3:-1,q4:NaN},lastQuestion:'invalid'};
 assert.deepEqual(migrateReadingProgress(backup).position,{q1:2,q2:0,q3:0,q4:0});
 assert.equal(migrateReadingProgress(backup).ratings['q2-essentials'],'later');
 assert.equal(migrateReadingProgress(null).lastQuestion,'q1');
});
