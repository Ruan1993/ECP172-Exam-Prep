import test from 'node:test';
import assert from 'node:assert/strict';
import {SpeechController,segmentText,preferenceKey} from '../src/speech.ts';
function setup(available=true){
 const said:any[]=[];let cancels=0;const data=new Map([['ecp172-progress','existing scores'],['ecp172-learn-first-v1','existing ratings']]);
 const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v)}};
 const engine={cancel(){cancels++},resume(){},getVoices:()=>[{voiceURI:'za',lang:'en-ZA'}],speak(u:any){said.push(u)}};
 const c=new SpeechController(available?engine as any:undefined,t=>({text:t}) as any,storage);
 return {c,said,data,storage,cancels:()=>cancels};
}
test('starts with one short utterance and retains it until completion',()=>{const {c,said}=setup();c.play('First sentence. Second sentence.');assert.equal(c.status,'Speaking');assert.equal(said.length,1);assert.equal(c.utterance,said[0]);said[0].onend();assert.equal(said.length,2);assert.equal(c.index,1)});
test('multiple pauses resume current segment without trusting native paused state',()=>{const {c,said}=setup();c.play('First. Second. Third.');said[0].onend();for(let i=0;i<4;i++){const old=said.at(-1);c.pause();assert.equal(c.status,'Paused');old.onend();old.onerror({error:'canceled'});assert.equal(c.index,1);c.resume();assert.equal(c.status,'Speaking');assert.equal(said.at(-1).text,'Second.')}assert.equal(c.index,1)});
test('stop, restart, duplicate starts and navigation ignore stale callbacks',()=>{const {c,said}=setup();c.play('Old.');const old=said[0];c.play('New. Next.');old.onend();assert.equal(c.index,0);c.pause();c.restart();assert.equal(said.at(-1).text,'New.');const active=said.at(-1);c.stop();active.onend();assert.equal(c.status,'Idle');assert.equal(c.utterance,null)});
test('finished runs completion only once',()=>{const {c,said}=setup();let completed=0;c.play('Done.',()=>completed++);said[0].onend();said[0].onend();assert.equal(c.status,'Finished');assert.equal(completed,1)});
test('long prose preserves decimals and divides long sentences without losing words',()=>{const text='Dr. Smith teaches at 1.25 speed. '+('education '.repeat(200));const parts=segmentText(text);assert.ok(parts.length>5);assert.ok(parts.every(s=>s.length<=220));assert.equal(parts.join(' ').replace(/\s+/g,' ').trim(),text.trim())});
test('preferences persist independently of study progress and pause at the current sentence',()=>{const {c,said,data,storage}=setup();c.play('One. Two.');said[0].onend();c.configure({rate:1.25,voiceURI:'za'});assert.equal(c.status,'Paused');c.resume();assert.equal(said.at(-1).text,'Two.');assert.equal(said.at(-1).rate,1.25);assert.equal(said.at(-1).voice.voiceURI,'za');assert.deepEqual(new SpeechController(undefined,()=>({}) as any,storage).preferences,{rate:1.25,voiceURI:'za'});assert.equal(data.get('ecp172-progress'),'existing scores');assert.equal(data.get('ecp172-learn-first-v1'),'existing ratings');assert.ok(data.has(preferenceKey))});
test('unavailable API and engine errors are recoverable and explicit',()=>{const unavailable=setup(false);unavailable.c.play('Hello.');assert.equal(unavailable.c.status,'Error');const {c,said}=setup();c.play('Hello.');said[0].onerror({error:'network'});assert.equal(c.status,'Error');assert.match(c.message,/network/);c.resume();assert.equal(c.status,'Speaking')});
test('storage errors and malformed preferences do not prevent reading',()=>{const c=new SpeechController(undefined,()=>({}) as any,{getItem(){throw Error()},setItem(){throw Error()}});assert.equal(c.preferences.rate,1);assert.doesNotThrow(()=>c.configure({rate:.75}))});
test('sentence selection cancels continuous playback and never advances or completes the lesson',()=>{const {c,said,cancels}=setup();let done=0;c.play('Old. Later.',()=>done++);const old=said[0];c.playSentences(['First.','Selected.','Last.'],1,true);assert.ok(cancels()>=2);old.onend();old.onerror({error:'canceled'});assert.equal(c.index,1);assert.equal(said.at(-1).text,'Selected.');const selected=said.at(-1);selected.onend();selected.onend();assert.equal(c.status,'Paused');assert.equal(c.index,1);assert.equal(said.length,2);assert.equal(done,0);c.resume();assert.equal(said.at(-1).text,'Selected.');said.at(-1).onend();assert.equal(c.status,'Paused')});
test('continuous reading explicitly resumes at the selected sentence',()=>{const {c,said}=setup();c.playSentences(['First.','Selected.','Last.'],1,true);said.at(-1).onend();c.continueReading();assert.equal(said.at(-1).text,'Selected.');said.at(-1).onend();assert.equal(said.at(-1).text,'Last.');said.at(-1).onend();assert.equal(c.status,'Finished')});
test('rapid sentence changes, stop and error recovery reject stale utterances',()=>{const {c,said}=setup();for(let i=0;i<12;i++){c.playSentences(['One.','Two.'],i%2,true);const u=said.at(-1);c.pause();u.onend();u.onerror({error:'canceled'});assert.equal(c.status,'Paused')}c.resume();said.at(-1).onerror({error:'network'});assert.equal(c.status,'Error');c.resume();const last=said.at(-1);c.stop();last.onend();assert.equal(c.status,'Idle')});
test('sentence playback uses the saved voice, rate and volume without changing progress',()=>{const {c,said,data,storage}=setup();c.configure({rate:1.5,voiceURI:'za',volume:.35});c.playSentences(['Selected.'],0,true);assert.equal(said[0].rate,1.5);assert.equal(said[0].voice.voiceURI,'za');assert.equal(said[0].volume,.35);assert.equal(new SpeechController(undefined,()=>({}) as any,storage).preferences.volume,.35);assert.equal(data.get('ecp172-progress'),'existing scores')});
test('volume changes apply to the next utterance without interrupting active speech',()=>{const {c,said}=setup();c.playSentences(['One.','Two.']);const first=said[0];c.configure({volume:.2});assert.equal(c.status,'Speaking');assert.equal(c.utterance,first);assert.equal(first.volume,1);first.onend();assert.equal(said[1].volume,.2)});

test('word boundaries use actual UTF-16 offsets and clear on sentence transitions',()=>{
 const {c,said}=setup();c.playSentences(['Hello, world!','Next sentence.']);
 assert.equal(c.word,null);said[0].onboundary({name:'word',charIndex:0,charLength:5});assert.deepEqual(c.word,{start:0,end:5});
 said[0].onboundary({name:'word',charIndex:7,charLength:0});assert.deepEqual(c.word,{start:7,end:12});
 said[0].onend();assert.equal(c.index,1);assert.equal(c.word,null);
 said[0].onboundary({name:'word',charIndex:0,charLength:5});assert.equal(c.word,null);
 said[1].onboundary({name:'word',charIndex:0,charLength:4});assert.deepEqual(c.word,{start:0,end:4});c.stop();assert.equal(c.word,null);
});
test('missing, sentence-only, invalid and out-of-order boundaries fall back without fake timing',()=>{
 const {c,said}=setup();c.play('One two three.');assert.equal(c.word,null);
 const u=said[0];u.onboundary({name:'sentence',charIndex:0,charLength:14});assert.equal(c.word,null);
 u.onboundary({name:'word',charIndex:4,charLength:3});assert.deepEqual(c.word,{start:4,end:7});
 u.onboundary({name:'word',charIndex:0,charLength:3});assert.equal(c.word,null);
 u.onboundary({name:'word',charIndex:8,charLength:5});assert.equal(c.word,null);
 c.restart();const next=said.at(-1);next.onboundary({name:'word',charIndex:999,charLength:0});assert.equal(c.word,null);
 c.restart();said.at(-1).onboundary({name:'word',charIndex:1,charLength:1});assert.equal(c.word,null);
});
test('mute restores the last nonzero volume across reloads',()=>{
 const {c,storage}=setup();c.configure({volume:.4});c.toggleMute();assert.equal(c.preferences.volume,0);
 const restored=new SpeechController(undefined,()=>({}) as any,storage);restored.toggleMute();assert.equal(restored.preferences.volume,.4);
 restored.configure({volume:.7});restored.toggleMute();restored.toggleMute();assert.equal(restored.preferences.volume,.7);
});
test('previous and next preserve sentence mapping and reject stale speech events',()=>{
 const {c,said}=setup(),segments=['One.','Two.','Three.'];c.playSentences(segments);const old=said[0];
 c.navigate(1);assert.equal(c.index,1);assert.equal(c.segments,segments);old.onend();old.onboundary({name:'word',charIndex:0,charLength:3});assert.equal(c.word,null);
 c.navigate(-1);assert.equal(c.index,0);c.navigate(-1);assert.equal(c.index,0);c.navigate(99);assert.equal(c.index,2);
});
test('manual follow suspension is transient while explicit follow preferences persist',()=>{
 const {c,storage}=setup();c.setFollow(false,false);assert.equal(c.follow,false);assert.equal(new SpeechController(undefined,()=>({}) as any,storage).follow,true);
 c.setFollow(false);assert.equal(new SpeechController(undefined,()=>({}) as any,storage).follow,false);c.setFollow(true);assert.equal(c.preferences.follow,true);
});
test('sentence selection retains deliberate continuous completion without advancing on a single sentence',()=>{
 const {c,said}=setup();let completed=0;c.playSentences(['One.','Two.'],0,false,()=>completed++);c.selectSentence(1);said.at(-1).onend();assert.equal(completed,0);assert.equal(c.status,'Paused');c.continueReading();said.at(-1).onend();assert.equal(completed,1);
});
test('Follow Along defaults ON for new users and existing preferences without a saved boolean',()=>{
 const {c,said,data,storage}=setup();assert.equal(c.follow,true);assert.equal(c.status,'Idle');assert.equal(said.length,0);
 for(const follow of [undefined,null,'false',0]){
  data.set(preferenceKey,JSON.stringify({rate:1.25,voiceURI:'za',volume:.4,follow}));
  const reopened=new SpeechController(undefined,()=>({}) as any,storage);
  assert.equal(reopened.follow,true);assert.equal(reopened.preferences.rate,1.25);assert.equal(reopened.preferences.volume,.4);assert.equal(reopened.preferences.voiceURI,'za');assert.equal(reopened.status,'Idle');
 }
});
test('explicit ON and OFF survive refresh or PWA reopen without starting narration',()=>{
 const {c,data,storage,said}=setup();
 for(const follow of [false,true,false]){
  c.setFollow(follow);assert.equal(JSON.parse(data.get(preferenceKey)!).follow,follow);
  let starts=0;const reopened=new SpeechController({cancel(){},resume(){},getVoices:()=>[],speak(){starts++}} as any,()=>({}) as any,storage);
  assert.equal(reopened.follow,follow);assert.equal(reopened.status,'Idle');assert.deepEqual(reopened.segments,[]);assert.equal(starts,0);
 }
 assert.equal(said.length,0);assert.equal(data.get('ecp172-progress'),'existing scores');assert.equal(data.get('ecp172-learn-first-v1'),'existing ratings');
});
test('navigation resets only temporary manual suspension to the saved follow preference',()=>{
 const {c,data,said}=setup();c.configure({rate:1.25,voiceURI:'za',volume:.4});
 for(const saved of [true,false]){
  c.setFollow(saved);c.play('A sentence.');c.setFollow(false,false);const settings=data.get(preferenceKey),count=said.length;
  c.stop();assert.equal(c.follow,saved);assert.equal(c.status,'Idle');assert.equal(said.length,count);assert.equal(data.get(preferenceKey),settings);
  assert.equal(c.preferences.rate,1.25);assert.equal(c.preferences.voiceURI,'za');assert.equal(c.preferences.volume,.4);
 }
 const fresh=setup();fresh.c.play('A sentence.');fresh.c.setFollow(false,false);fresh.c.stop();assert.equal(fresh.c.follow,true);
});
test('a new card after completed narration restores saved follow without changing pause or manual-scroll behavior',()=>{
 for(const saved of [true,false]){
  const {c,said}=setup();c.setFollow(saved);c.play('First card.');c.setFollow(false,false);c.pause();assert.equal(c.follow,false);c.resume();assert.equal(c.follow,saved);
  said.at(-1).onend();assert.equal(c.status,'Finished');c.play('Next card.');assert.equal(c.follow,saved);
 }
});
