import test from 'node:test';
import assert from 'node:assert/strict';
import {SpokenRevision} from '../src/spokenRevision';

function fixture(total=2){
 let now=0,id=0,index=0;const timers=new Map<number,{at:number;fn:()=>void}>(),events:string[]=[];
 let questionDone=()=>{},answerDone=()=>{};
 const session=new SpokenRevision({question:done=>{events.push(`question-${index}`);questionDone=done},answer:done=>{events.push(`answer-${index}`);answerDone=done},reveal:()=>events.push('reveal'),advance:()=>++index<total,pause:()=>events.push('pause'),resume:()=>events.push('resume'),stop:()=>events.push('stop')},{now:()=>now,set:(fn,ms)=>{timers.set(++id,{at:now+ms,fn});return id},clear:id=>{timers.delete(id as number)}});
 const tick=(ms:number)=>{now+=ms;for(const [id,timer] of timers)if(timer.at<=now){timers.delete(id);timer.fn()}};
 return {session,events,timers,tick,questionDone:()=>questionDone(),answerDone:()=>answerDone(),stale:()=>questionDone};
}

test('question completion starts five seconds; full answer completion starts a short pause; queue ends',()=>{
 const f=fixture();f.session.start();f.tick(20000);assert.equal(f.session.phase,'question');assert.equal(f.timers.size,0);
 f.questionDone();f.tick(4999);assert.equal(f.session.phase,'thinking');assert.ok(!f.events.includes('reveal'));
 f.tick(1);assert.equal(f.session.phase,'reveal');f.session.answerReady();assert.equal(f.session.phase,'answer');
 f.tick(20000);assert.equal(f.session.phase,'answer');f.answerDone();f.tick(1499);assert.equal(f.session.phase,'between');
 f.tick(1);assert.equal(f.session.phase,'moving');f.session.questionReady();assert.equal(f.events.at(-1),'question-1');
 f.questionDone();f.tick(5000);f.session.answerReady();f.answerDone();f.tick(1500);assert.equal(f.session.phase,'finished');assert.equal(f.timers.size,0);
 assert.deepEqual(f.events.filter(s=>/^(question|answer)-/.test(s)),['question-0','answer-0','question-1','answer-1']);
});

test('pausing during either delay preserves remaining time, without background advancement',()=>{
 const f=fixture();f.session.start();f.questionDone();f.tick(2000);f.session.pause();f.tick(60000);assert.equal(f.session.phase,'thinking');
 f.session.play();f.tick(2999);assert.equal(f.session.phase,'thinking');f.tick(1);f.session.answerReady();
 f.answerDone();f.tick(500);f.session.pause();f.tick(60000);assert.equal(f.session.phase,'between');f.session.play();f.tick(999);assert.equal(f.session.phase,'between');f.tick(1);assert.equal(f.session.phase,'moving');
});

test('Repeat, Next and Stop invalidate old speech completions and pending timers',()=>{
 const f=fixture();f.session.start();const stale=f.stale();f.session.repeat();stale();assert.equal(f.session.phase,'question');assert.equal(f.timers.size,0);
 f.questionDone();f.session.next();f.tick(10000);assert.equal(f.session.phase,'moving');assert.ok(!f.events.includes('reveal'));
 f.session.questionReady();f.questionDone();f.session.stop();f.tick(10000);assert.equal(f.session.phase,'idle');assert.equal(f.timers.size,0);
 f.session.start();f.questionDone();f.tick(5000);f.session.answerReady();f.session.stop();f.answerDone();f.tick(10000);assert.equal(f.session.phase,'idle');
});

test('speech pause, engine errors and external stop never skip the active question',()=>{
 const f=fixture();f.session.start();f.session.speechChanged('Paused');assert.equal(f.session.paused,true);f.session.play();assert.equal(f.events.at(-1),'resume');
 f.session.speechChanged('Error','Tap Play to retry');assert.equal(f.session.paused,true);assert.match(f.session.message,/retry/);f.tick(10000);assert.equal(f.session.phase,'question');
 f.session.retry();assert.equal(f.events.at(-1),'question-0');f.questionDone();f.tick(5000);f.session.answerReady();f.session.speechChanged('Error');f.session.retry();assert.equal(f.events.at(-1),'answer-0');
 f.session.speechChanged('Idle');assert.equal(f.session.phase,'idle');
});

test('five and ten second thinking countdowns update only after question completion and retain pause safety',()=>{
 const f=fixture();f.session.setThinkingTime(10);f.session.start();f.tick(20000);assert.equal(f.session.phase,'question');
 f.questionDone();assert.equal(f.session.countdown,10);f.tick(1000);assert.equal(f.session.countdown,9);
 f.session.pause();f.tick(50000);assert.equal(f.session.countdown,9);f.session.play();f.tick(8000);assert.equal(f.session.countdown,1);
 f.tick(1000);assert.equal(f.session.phase,'reveal');f.session.answerReady();f.answerDone();f.tick(1500);f.session.questionReady();
 f.questionDone();f.session.setThinkingTime(5);assert.equal(f.session.countdown,5);f.tick(4999);assert.equal(f.session.countdown,1);f.tick(1);assert.equal(f.session.phase,'reveal');
});
