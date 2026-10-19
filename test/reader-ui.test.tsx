import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {Window} from 'happy-dom';
import React,{act,useRef} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {readingSentences,sentenceWordRange,followScrollDelta} from '../src/readingSentences';
import {boundaryWord} from '../src/speech';

registerHooks({load(url,context,next){if(url.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};return next(url,context)}});
const win=new Window({url:'http://localhost/'});
for(const name of ['window','document','Node','Element','HTMLElement','HTMLDetailsElement','Text','NodeFilter','MutationObserver','MouseEvent','KeyboardEvent','Event','PointerEvent','ResizeObserver','localStorage','getComputedStyle']){
 Object.defineProperty(globalThis,name,{value:name==='window'?win:(win as any)[name],configurable:true,writable:true});
}
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const highlights=new Map<string,any>();
Object.defineProperty(globalThis,'CSS',{value:{highlights},configurable:true});
(globalThis as any).Highlight=class {ranges:Range[];constructor(...ranges:Range[]){this.ranges=ranges}};
let reduced=false;const scrolls:any[]=[];
win.matchMedia=(()=>({matches:reduced,addEventListener(){},removeEventListener(){}})) as any;
win.scrollBy=((value:any)=>scrolls.push(value)) as any;
Object.defineProperty(win,'innerHeight',{value:800,writable:true});
// This DOM emulator has no layout engine. Explicit test geometry tests the decisions,
// while real mobile sizing is checked separately in a browser.
const box=(top=160)=>({top,bottom:top+24,left:10,right:400,width:390,height:24,x:10,y:top,toJSON(){}});
Object.defineProperty(win.HTMLElement.prototype,'getClientRects',{value:function(){return this.closest('details:not([open]),[hidden]')?[]:[box(Number(this.dataset.top??160))]}});
Object.defineProperty(win.HTMLElement.prototype,'getBoundingClientRect',{value:function(){return this.classList.contains('reader-player')?{...box(680),height:120,bottom:800}:box(Number(this.dataset.top??0))}});
Object.defineProperty(win.Range.prototype,'getClientRects',{value:function(){return this.startContainer.parentElement?.closest('details:not([open]),[hidden]')?[]:[box(Number(this.startContainer.parentElement?.closest('[data-top]')?.getAttribute('data-top')??160))]}});
Object.defineProperty(win.Range.prototype,'getBoundingClientRect',{value:function(){return this.getClientRects()[0]??box(0)}});
const said:any[]=[];let cancels=0;
const engine={cancel(){cancels++},resume(){},speak(u:any){said.push(u)},getVoices:()=>[{voiceURI:'za',name:'Test English',lang:'en-ZA',localService:true}],addEventListener(){},removeEventListener(){}};
Object.defineProperty(win,'speechSynthesis',{value:engine});
(globalThis as any).SpeechSynthesisUtterance=class {text:string;constructor(text:string){this.text=text}};
const {ReadAloud,speech}=await import('../src/ReadAloud');
const {ReaderPlayer}=await import('../src/ReaderPlayer');
const c=speech();
let root:Root,host:HTMLDivElement;
function Fixture(){const scope=useRef<HTMLElement>(null);return <><ReadAloud label="Test lesson" scope={()=>scope.current}/><article ref={scope}><p data-top="900">First <strong>sentence</strong>. Second sentence!</p><p><a href="#example">A real link.</a></p><details><summary>Open explanation</summary><p>Hidden explanation.</p></details></article><ReaderPlayer controller={c}/></>}
async function mount(){said.length=0;cancels=0;scrolls.length=0;highlights.clear();reduced=false;host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root.render(<React.StrictMode><Fixture/></React.StrictMode>))}
async function cleanup(){await act(async()=>{c.stop();root.unmount()});host.remove();document.body.innerHTML='';win.history.replaceState(null,'','/')}
const button=(label:string)=>document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
async function click(element:Element){assert.ok(element);await act(async()=>element.dispatchEvent(new win.MouseEvent('click',{bubbles:true,clientX:20,clientY:910,button:0}) as any))}
const highlightText=()=>highlights.get('reading-sentence')?.ranges[0].toString();

test('concept paragraph follows narration and clears on pause, transition, stop and unmount',async()=>{
 await mount();try{
  const first=document.querySelector('article p')!;
  first.setAttribute('data-concept','equality');
  const next=document.createElement('p');next.setAttribute('data-concept','equity');next.textContent='Fair support.';first.after(next);
  await click(document.querySelector('.reader-start')!);
  assert.ok(first.classList.contains('reading-active'));
  await act(async()=>said.at(-1).onboundary({name:'word',charIndex:0,charLength:5}));
  assert.equal(highlightText(),'First');assert.ok(first.classList.contains('reading-active'));
  await act(async()=>c.pause());assert.equal(document.querySelectorAll('.reading-active').length,0);
  await act(async()=>c.resume());assert.ok(first.classList.contains('reading-active'));
  await act(async()=>c.navigate(1));await act(async()=>c.navigate(1));
  assert.ok(next.classList.contains('reading-active'));assert.equal(first.classList.contains('reading-active'),false);
  await act(async()=>c.stop());assert.equal(document.querySelectorAll('.reading-active').length,0);
 }finally{await cleanup()}
});

test('normalised speech boundaries highlight visible words after expanded acronyms',async()=>{
 await mount();try{
  const prose=document.querySelector('article p')!;prose.textContent='LoLT supports access.';
  await click(document.querySelector('.reader-start')!);const u=said.at(-1);
  assert.equal(u.text,'Language of Learning and Teaching supports access.');
  await act(async()=>u.onboundary({name:'word',charIndex:u.text.indexOf('supports'),charLength:8}));
  assert.equal(highlightText(),'supports');
  await act(async()=>u.onboundary({name:'word',charIndex:999,charLength:0}));
  assert.equal(highlightText(),'LoLT supports access.');
 }finally{await cleanup()}
});

test('DOM ranges preserve emphasis, punctuation, wrapping text and copying',()=>{
 const article=document.createElement('article');article.innerHTML='<p>  First <strong>sentence</strong>. Second sentence!</p><details><summary>Panel</summary><p>Hidden text.</p></details><p><button>Skip control</button></p>';document.body.append(article);
 const sentences=readingSentences(article);assert.deepEqual(sentences.map(s=>s.text),['First sentence.','Second sentence!']);
 assert.equal(sentenceWordRange(sentences[0],6,14).toString(),'sentence');assert.equal(sentences[1].range.toString(),'Second sentence!');
 const selection=win.getSelection()!;selection.removeAllRanges();selection.addRange(sentences[0].range as any);assert.equal(selection.toString(),'First sentence.');selection.removeAllRanges();article.remove();
 assert.deepEqual(boundaryWord('😀 Hello, world!',3,5,'word'),{start:3,end:8});
});
test('direct prose click starts speech once, stops after one sentence and exposes persistent icon controls',async()=>{
 await mount();try{
  const prose=document.querySelector('article p')!;await click(prose);assert.equal(said.length,1);assert.equal(said[0].text,'First sentence.');assert.ok(cancels>0);
  assert.equal(highlightText(),'First sentence.');assert.ok(document.querySelector('.reader-player'));assert.ok(button('Pause reading'));assert.equal(document.querySelector('article')!.getAttribute('style'),null);assert.ok(scrolls.length>0);
  await act(async()=>said[0].onend());assert.equal(c.status,'Paused');assert.equal(said.length,1);assert.ok(button('Play continuously from current sentence'));
  await click(button('Play continuously from current sentence'));assert.equal(said.at(-1).text,'First sentence.');await act(async()=>said.at(-1).onend());assert.equal(said.at(-1).text,'Second sentence!');
  await click(button('Stop reading and close player'));assert.equal(highlights.size,0);assert.equal(document.querySelector('.reader-player'),null);
 }finally{await cleanup()}
});
test('only the spoken word is painted after real boundaries, with immediate word and sentence cleanup',async()=>{
 await mount();try{
  await click(document.querySelector('article p')!);const u=said[0];
  await act(async()=>u.onboundary({name:'word',charIndex:0,charLength:5}));assert.equal(highlightText(),'First');assert.equal(highlights.size,1);
  await act(async()=>u.onboundary({name:'word',charIndex:6,charLength:8}));assert.equal(highlightText(),'sentence');assert.equal(highlights.size,1);
  await click(button('Next sentence'));assert.equal(highlightText(),'Second sentence!');
  await act(async()=>u.onboundary({name:'word',charIndex:0,charLength:5}));assert.equal(highlightText(),'Second sentence!');
  await act(async()=>said.at(-1).onboundary({name:'word',charIndex:0,charLength:6}));assert.equal(highlightText(),'Second');
  await act(async()=>said.at(-1).onboundary({name:'word',charIndex:999,charLength:0}));assert.equal(highlightText(),'Second sentence!');
 }finally{await cleanup()}
});
test('selection and interactive controls do not accidentally start playback',async()=>{
 await mount();try{
  const prose=document.querySelector('article p')!,range=document.createRange();range.selectNodeContents(prose);win.getSelection()!.addRange(range as any);
  await click(prose);assert.equal(said.length,0);win.getSelection()!.removeAllRanges();
  await click(document.querySelector('article a')!);assert.equal(said.length,0);await click(document.querySelector('summary')!);assert.equal(said.length,0);
 }finally{win.getSelection()!.removeAllRanges();await cleanup()}
});
test('volume popover toggles, Escape/outside close it, and mute restores the previous level',async()=>{
 await mount();try{
  await click(document.querySelector('article p')!);assert.equal(document.querySelector('.reader-volume'),null);
  await click(button('Speech volume'));assert.equal(button('Speech volume').getAttribute('aria-expanded'),'true');
  const slider=document.querySelector<HTMLInputElement>('input[type=range]')!;assert.equal(document.activeElement,slider);
  await act(async()=>c.configure({volume:.35}));await click(button('Mute speech'));assert.equal(c.preferences.volume,0);await click(button('Unmute speech'));assert.equal(c.preferences.volume,.35);
  await act(async()=>document.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true}) as any));assert.equal(document.querySelector('.reader-volume'),null);assert.equal(document.activeElement,button('Speech volume'));
  await click(button('Speech volume'));await act(async()=>document.querySelector('article')!.dispatchEvent(new win.PointerEvent('pointerdown',{bubbles:true}) as any));assert.equal(document.querySelector('.reader-volume'),null);
 }finally{await cleanup()}
});
test('manual scrolling suspends follow, toggle reactivates it, and reduced motion uses instant scrolling',async()=>{
 await mount();try{
  reduced=true;await act(async()=>c.setFollow(true));await click(document.querySelector('article p')!);assert.ok(scrolls.some(s=>s.behavior==='instant'));scrolls.length=0;
  await act(async()=>win.dispatchEvent(new win.Event('wheel')) as any);assert.equal(c.follow,false);await click(button('Next sentence'));assert.equal(scrolls.length,0);
  await click(button('Follow reading'));assert.equal(c.follow,true);assert.ok(scrolls.length>0);
 }finally{await cleanup()}
});
test('keyboard settings keep sentence navigation off the primary interface, and route cleanup stops speech',async()=>{
 await mount();try{
  await click(document.querySelector('article p')!);assert.equal(document.querySelector('select'),null);
  await click(button('Reading settings'));assert.ok(document.querySelector('select[aria-label="Read a sentence once"]'));
  const active=said.at(-1);await act(async()=>root.unmount());assert.equal(c.status,'Idle');active.onend();assert.equal(c.status,'Idle');assert.equal(highlights.size,0);
 }finally{host.remove();document.body.innerHTML='';win.history.replaceState(null,'','/')}
});
test('follow geometry respects header/player clearance and avoids scrolling visible sentences',()=>{
 assert.equal(followScrollDelta({top:150,bottom:180,height:30},80,680),0);
 assert.ok(followScrollDelta({top:700,bottom:730,height:30},80,680)>0);
 assert.ok(followScrollDelta({top:20,bottom:50,height:30},80,680)<0);
});
test('word painting never changes lesson markup and stop releases reserved player space',async()=>{
 await mount();try{
  const article=document.querySelector('article')!,original=article.innerHTML;
  localStorage.setItem('ecp172-progress','unchanged legacy scores');localStorage.setItem('ecp172-learn-first-v1','unchanged ratings');
  await click(article.querySelector('p')!);assert.ok(document.body.classList.contains('reader-active'));assert.equal(document.documentElement.style.getPropertyValue('--reader-space'),'120px');
  await act(async()=>said.at(-1).onboundary({name:'word',charIndex:6,charLength:8}));assert.equal(article.innerHTML,original);
  await click(button('Stop reading and close player'));assert.equal(document.body.classList.contains('reader-active'),false);assert.equal(document.documentElement.style.getPropertyValue('--reader-space'),'');
  assert.equal(localStorage.getItem('ecp172-progress'),'unchanged legacy scores');assert.equal(localStorage.getItem('ecp172-learn-first-v1'),'unchanged ratings');
 }finally{await cleanup()}
});
test('a click inside a nested past-paper reader is handled once',async()=>{
 function Nested(){const outer=useRef<HTMLElement>(null),inner=useRef<HTMLDivElement>(null);return <><ReadAloud scope={()=>outer.current}/><article ref={outer}><h2>Outer title.</h2><div ref={inner}><p data-top="900">Nested sentence.</p><ReadAloud scope={()=>inner.current}/></div></article><ReaderPlayer controller={c}/></>}
 host=document.createElement('div');document.body.append(host);root=createRoot(host);said.length=0;
 await act(async()=>root.render(<React.StrictMode><Nested/></React.StrictMode>));
 try{await click(document.querySelector('article p')!);assert.equal(said.length,1);assert.equal(said[0].text,'Nested sentence.');assert.equal(document.querySelectorAll('.reader-player').length,1)}finally{await cleanup()}
});
test('completed narration survives legacy card replacement and the next card can use the same handle',async()=>{
 function Cards({page}:{page:number}){return <><ReadAloud scope={()=>document.querySelector('.test-changing-card')}/><article className="test-changing-card" key={page}><p data-top="900">{page===0?'First card.':'Next card.'}</p></article><ReaderPlayer controller={c}/></>}
 host=document.createElement('div');document.body.append(host);root=createRoot(host);said.length=0;
 await act(async()=>root.render(<Cards page={0}/>));
 try{
  await click(document.querySelector('.reader-start')!);await act(async()=>said.at(-1).onend());assert.equal(c.status,'Finished');
  await act(async()=>root.render(<Cards page={1}/>));assert.equal(c.status,'Finished');
  await click(document.querySelector('.reader-start')!);assert.equal(said.at(-1).text,'Next card.');assert.equal(highlightText(),'Next card.');
 }finally{await cleanup()}
});
test('actual card and Q1–Q4/section navigation restore saved follow without autoplay',async()=>{
 // The service-worker hook is build-generated. Its inert test replacement keeps this
 // focused on actual App navigation; the production build verifies PWA generation.
 registerHooks({resolve(specifier,context,next){if(specifier==='virtual:pwa-register/react')return {url:'data:text/javascript,export function useRegisterSW(){return {needRefresh:[false,()=>{}],offlineReady:[false,()=>{}],updateServiceWorker:async()=>{}}}',shortCircuit:true};return next(specifier,context)}});
 const {default:App}=await import('../src/App');
 const textButton=(label:string)=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()===label)!;
 for(const saved of [true,false]){
  await act(async()=>c.setFollow(saved));said.length=0;host=document.createElement('div');document.body.append(host);root=createRoot(host);
  await act(async()=>root.render(<React.StrictMode><App/><ReaderPlayer controller={c}/></React.StrictMode>));
  try{
   await click(textButton('Start at Q1'));assert.equal(c.follow,saved);assert.equal(said.length,0);
   await click(document.querySelector('.reader-start')!);await act(async()=>win.dispatchEvent(new win.Event('wheel')) as any);assert.equal(c.follow,false);
   const count=said.length;await click(textButton('Next card'));assert.equal(c.follow,saved);assert.equal(c.status,'Idle');assert.equal(said.length,count);
   for(const question of ['Q2','Q3','Q4','Overview','Revise later','Q1']){
    await click(textButton(question));assert.equal(c.follow,saved);assert.equal(c.status,'Idle');assert.equal(said.length,count);
   }
   assert.equal(JSON.parse(localStorage.getItem('ecp172-read-aloud-v1')!).follow,saved);
  }finally{await cleanup()}
 }
});
test('persistent bottom card controls reuse real app navigation, stop speech and preserve ratings/preferences',async()=>{
 const {default:App}=await import('../src/App');
 localStorage.setItem('ecp172-learn-first-v1',JSON.stringify({ratings:{'q1-intro':'later'},position:{q1:0,q2:0,q3:0,q4:0},lastQuestion:'q1'}));
 await act(async()=>c.configure({follow:false,rate:1.25,voiceURI:'za',volume:.4}));const preferences=JSON.stringify(c.preferences);
 said.length=0;host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(<React.StrictMode><App/><ReaderPlayer controller={c}/></React.StrictMode>));
 const textButton=(label:string)=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()===label)!;
 const position=()=>document.querySelector('.reader-card-position')!.textContent;
 try{
  await click(textButton('Start at Q1'));assert.ok(position()?.includes('Card 1 of 8'));assert.equal(button('Previous card').disabled,true);assert.equal(said.length,0);assert.equal(document.querySelectorAll('.reader-player').length,1);
  assert.equal(button('Previous sentence').disabled,true);assert.equal(button('Next sentence').disabled,true);
  await click(button('Read current card'));const old=said.at(-1);assert.equal(c.status,'Speaking');const count=said.length;
  await click(button('Next card'));assert.ok(position()?.includes('Card 2 of 8'));assert.equal(c.status,'Idle');assert.equal(said.length,count);assert.equal(highlights.size,0);old.onend();old.onboundary({name:'word',charIndex:0,charLength:3});assert.equal(c.status,'Idle');
  assert.equal(JSON.stringify(c.preferences),preferences);assert.equal(c.follow,false);assert.equal(JSON.parse(localStorage.getItem('ecp172-learn-first-v1')!).position.q1,1);assert.equal(JSON.parse(localStorage.getItem('ecp172-learn-first-v1')!).ratings['q1-intro'],'later');
  await click(button('Previous card'));assert.ok(position()?.includes('Card 1 of 8'));
  for(let i=0;i<8;i++)await click(button('Next card'));assert.ok(position()?.includes('Q2'));assert.ok(position()?.includes('Card 1 of'));
  await click(button('Previous card'));assert.ok(position()?.includes('Q1'));assert.ok(position()?.includes('Card 8 of 8'));
  let traversed=0;while(button('Next card')){await click(button('Next card'));assert.ok(++traversed<40)}
  assert.ok(position()?.includes('Q4'));assert.ok(button('Finish guide and return to overview'));
  await click(button('Finish guide and return to overview'));assert.equal(document.querySelector('.reader-player'),null);assert.equal(c.status,'Idle');assert.equal(said.length,count);assert.equal(JSON.stringify(c.preferences),preferences);
 }finally{await cleanup()}
});
test('legacy Guided Learning bottom navigation keeps existing progress and completion behavior without autoplay',async()=>{
 const {GuidedLearning}=await import('../src/GuidedLearning');const {empty}=await import('../src/storage');
 let progress={...empty,reviewed:['keep-this-rating']} as any;const positions:number[]=[];let completed=0;
 function Legacy(){const [value,setValue]=React.useState(progress);progress=value;return <><GuidedLearning area="Q1" progress={value} setProgress={setValue} onPosition={index=>{positions.push(index)}} onComplete={()=>{completed++}}/><ReaderPlayer controller={c}/></>}
 reduced=true;said.length=0;host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root.render(<Legacy/>));
 const next=async()=>{await click(button('Next card'));await act(async()=>{await new Promise(resolve=>setTimeout(resolve,20))})};
 try{
  assert.ok(document.querySelector('.reader-player'));assert.equal(button('Previous card').disabled,true);assert.equal(said.length,0);
  await next();assert.ok(document.querySelector('.reader-card-position')!.textContent?.includes('Card 2 of'));assert.ok(positions.includes(1));assert.deepEqual(progress.reviewed,['keep-this-rating']);assert.ok(Object.keys(progress.learningTopics).length>=2);
  await click(button('Previous card'));await act(async()=>{await new Promise(resolve=>setTimeout(resolve,20))});assert.equal(button('Previous card').disabled,true);
  let steps=0;while(button('Next card')){await next();assert.ok(++steps<15)}
  await click(button('Complete learning sequence'));assert.equal(said.length,0);assert.equal(button('Complete learning sequence').disabled,true);
  const finish=Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Continue now')!;await click(finish);assert.equal(completed,1);assert.equal(c.status,'Idle');
 }finally{await cleanup()}
});

test('six revised Q2 cards navigate, narrate, persist ratings and retain scenario identity',async()=>{
 const {default:App}=await import('../src/App');
 localStorage.setItem('ecp172-learn-first-v1',JSON.stringify({ratings:{'q1-intro':'later','q2-a1':'later'},position:{q1:0,q2:12,q3:0,q4:0},lastQuestion:'q2'}));
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(<><App/><ReaderPlayer controller={c}/></>));
 const textButton=(label:string)=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()===label)!;
 try{
  await click(textButton('Q2'));assert.match(document.querySelector('.reader-number')!.textContent!,/CARD 6 OF 6/);
  for(let i=5;i>0;i--)await click(textButton('Previous'));
  const titles:string[]=[];
  for(let i=0;i<6;i++){
   titles.push(document.querySelector('.lf-page-card h2')!.textContent!);
   assert.match(document.querySelector('.reader-number')!.textContent!,new RegExp(`CARD ${i+1} OF 6`));
   if(i===1||i===2)assert.equal(document.querySelector('.lf-page-card')!.getAttribute('data-scenario'),'a');
   if(i===3||i===4)assert.equal(document.querySelector('.lf-page-card')!.getAttribute('data-scenario'),'b');
   await click(document.querySelector('.reader-start')!);assert.equal(c.status,'Speaking');assert.ok(said.at(-1).text);
   await click(textButton('I understand it'));
   if(i<5){await click(textButton('Next card'));assert.equal(c.status,'Idle');}
  }
  assert.equal(new Set(titles).size,6);
  const saved=JSON.parse(localStorage.getItem('ecp172-learn-first-v1')!);
  assert.equal(saved.position.q2,5);assert.equal(saved.ratings['q2-a-proposal'],'understood');assert.equal(saved.ratings['q1-intro'],'later');
  await click(textButton('Continue to next question'));assert.match(document.querySelector('.reader-number')!.textContent!,/CARD 1 OF/);
 }finally{await cleanup()}
});

test('actual Q4 cards render separate numbered concept blocks in both model answers',async()=>{
 const {default:App}=await import('../src/App');
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(<><App/><ReaderPlayer controller={c}/></>));
 const textButton=(label:string)=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()===label)!;
 try{
  await click(textButton('Q4'));
  const select=async(label:string)=>{const item=Array.from(document.querySelectorAll('.outline-list button')).find(b=>b.textContent?.includes(label))!;await click(item)};
  for(const label of ['Four approaches in plain language','Four approaches, one better classroom']){
   await select(label);
   assert.equal(document.querySelectorAll('.reader-start').length,1);
   const theme=document.querySelector<HTMLButtonElement>('button[title="Use light theme"],button[title="Use dark theme"],button[aria-label="Use light theme"],button[aria-label="Use dark theme"]');
   assert.ok(theme);await click(theme);assert.equal(document.querySelectorAll('.reader-start').length,1);
   const blocks=Array.from(document.querySelectorAll('.learning-concept'));
   assert.deepEqual(blocks.map(b=>b.getAttribute('data-tone')),['yellow','green','blue','purple']);
   assert.ok(blocks.every((b,i)=>b.tagName==='P'&&b.textContent?.startsWith(`${i+1}. `)));
  }
  await select('Equality, equity and discrimination');
  assert.deepEqual(Array.from(document.querySelectorAll('.learning-concept')).map(b=>b.getAttribute('data-concept')),['equality','equity','discrimination']);
  assert.ok(Array.from(document.querySelectorAll('.reading-prose p')).find(p=>p.textContent?.startsWith('A stereotype')&&!p.hasAttribute('data-concept')));
 }finally{await cleanup()}
});

test('active recall hides answers from DOM and speech, reveals hints and saves separate question ratings',async()=>{
 const {default:App}=await import('../src/App');
 localStorage.setItem('ecp172-learn-first-v1',JSON.stringify({ratings:{'q4-b':'later'},position:{q1:0,q2:0,q3:0,q4:0},lastQuestion:'q4'}));
 host=document.createElement('div');document.body.append(host);root=createRoot(host);said.length=0;
 await act(async()=>root.render(<><App/><ReaderPlayer controller={c}/></>));
 const textButton=(label:string)=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()===label)!;
 try{
  await click(textButton('Revise Again'));
  assert.match(document.querySelector('#revision-question')!.textContent!,/Compare equality and equity/);
  assert.equal(document.querySelector('#revision-answer'),null);assert.equal(document.querySelector('#revision-hint'),null);
  assert.equal(textButton('Got it!'),undefined);
  await click(button('Read current card'));
  assert.ok(c.segments.some(t=>t.includes('Compare equality')));assert.ok(c.segments.every(t=>!t.includes('possess equal dignity')));
  const stale=said.at(-1);await click(textButton('Show hint'));assert.equal(c.status,'Idle');assert.ok(document.querySelector('#revision-hint'));
  await click(textButton('Reveal Answer'));assert.ok(document.querySelector('#revision-answer'));
  assert.deepEqual(Array.from(document.querySelectorAll('#revision-answer [data-tone]')).map(p=>p.getAttribute('data-tone')),['yellow','green']);
  await click(button('Read current card'));assert.ok(c.segments.some(t=>t.includes('possess equal dignity')));
  await act(async()=>{const i=c.segments.findIndex(t=>t.includes('possess equal dignity'));c.selectSentence(i)});
  assert.equal(document.querySelector('.reading-active')?.getAttribute('data-concept'),'equality');
  await act(async()=>c.pause());assert.equal(document.querySelector('.reading-active'),null);
  await click(textButton('Got it!'));
  let saved=JSON.parse(localStorage.getItem('ecp172-learn-first-v1')!);assert.equal(saved.ratings['q4-b'],'later');assert.equal(saved.revision.ratings['rev-q4-equality-equity'],'understood');
  await click(textButton('Revise Again'));saved=JSON.parse(localStorage.getItem('ecp172-learn-first-v1')!);assert.equal(saved.revision.ratings['rev-q4-equality-equity'],'later');
  await click(document.querySelector('.reader-start')!);await act(async()=>c.setFollow(false,false));
  await click(textButton('Next question'));assert.equal(c.status,'Idle');assert.equal(document.querySelector('#revision-answer'),null);assert.equal(document.querySelector('#revision-hint'),null);
  const before=said.length;await act(async()=>stale.onend());assert.equal(said.length,before);
  await click(button('Read current card'));assert.equal(c.follow,c.preferences.follow??true);
  await click(textButton('Previous question'));assert.equal(document.querySelector('#revision-answer'),null);assert.match(document.querySelector('.revision-position')!.textContent!,/Queued/);
  assert.equal(document.querySelectorAll('.reader-start').length,1);assert.equal(document.querySelectorAll('.reader-player').length,1);
  await click(textButton('Overview'));assert.equal(c.status,'Idle');
  await click(textButton('Revise Again'));assert.match(document.querySelector('#revision-question')!.textContent!,/Compare equality/);
 }finally{await cleanup()}
});

test('revision finish, all-understood replay and learning bookmarks retain distinct states',async()=>{
 const {default:App}=await import('../src/App');
 const {revisionBank}=await import('../src/revisionBank');
 localStorage.setItem('ecp172-learn-first-v1',JSON.stringify({ratings:{'q1-intro':'understood'},position:{q1:0,q2:0,q3:0,q4:0},lastQuestion:'q1',revision:{ratings:Object.fromEntries(revisionBank.filter(q=>q.section==='q1').map(q=>[q.id,'understood']))}}));
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(<><App/><ReaderPlayer controller={c}/></>));
 const textButton=(label:string)=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()===label)!;
 try{
  await click(textButton('Start at Q1'));await click(textButton('Revise Again'));
  assert.ok(document.querySelector('.revision-card'));assert.match(document.querySelector('.learning-feedback')!.textContent!,/Saved for revision/);assert.equal(JSON.parse(localStorage.getItem('ecp172-learn-first-v1')!).ratings['q1-intro'],'later');
  for(let i=0;i<7;i++)await click(textButton('Next question'));
  await click(textButton('Finish section'));assert.ok(document.querySelector('.revision-complete'));
  await click(textButton('Revise this section again'));assert.match(document.querySelector('.revision-position')!.textContent!,/Question 1 of 8/);assert.equal(document.querySelector('#revision-answer'),null);
 }finally{await cleanup()}
});

test('learning navigation scrolls once to the stable reading heading and restores URL navigation',async()=>{
 reduced=false;
 const {default:App}=await import('../src/App');
 localStorage.setItem('ecp172-learn-first-v1',JSON.stringify({ratings:{},position:{q1:0,q2:0,q3:0,q4:0},lastQuestion:'q1'}));
 const originalScrollTo=win.scrollTo;
 const pageTops:any[]=[];
 win.scrollTo=((options:any)=>pageTops.push(options)) as any;
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(<React.StrictMode><App/><ReaderPlayer controller={c}/></React.StrictMode>));
 const textButton=(label:string)=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()===label)!;
 try{
  scrolls.length=0;pageTops.length=0;
  await click(textButton('Start at Q1'));
  assert.equal(scrolls.length,1);assert.equal(scrolls[0].behavior,'smooth');assert.equal(pageTops.length,0);
  assert.equal(document.activeElement,document.querySelector('.lf-page-card>h2'));assert.equal(win.location.hash,'#q1/q1-intro');
  await click(document.querySelectorAll('.outline-list button')[2]);assert.equal(win.location.hash,'#q1/q1-school');assert.equal(scrolls.length,2);assert.equal(pageTops.length,0);
  await click(textButton('Next card'));assert.match(document.querySelector('.lf-page-card>h2')!.textContent!,/Admission/);assert.equal(scrolls.length,3);
  reduced=true;await click(textButton('Previous'));assert.equal(scrolls.at(-1).behavior,'instant');assert.equal(pageTops.length,0);
  const article=document.querySelector('.lf-page-card');await click(textButton('I understand it'));assert.equal(document.querySelector('.lf-page-card'),article);assert.match(document.querySelector('.learning-feedback')!.textContent!,/Marked understood/);assert.equal(scrolls.length,4);
  win.history.replaceState(null,'','#q1/q1-rights');await act(async()=>win.dispatchEvent(new win.PopStateEvent('popstate')) as any);
  assert.match(document.querySelector('.lf-page-card>h2')!.textContent!,/Constitution/);assert.equal(document.activeElement,document.querySelector('.lf-page-card>h2'));assert.equal(scrolls.length,5);
 }finally{await cleanup();win.scrollTo=originalScrollTo;reduced=false}
});

test('all 32 revision questions omit removed instructions from UI, speech and sentence navigation',async()=>{
 const {Revision}=await import('../src/Revision');
 const {revisionBank}=await import('../src/revisionBank');
 const {migrateReadingProgress}=await import('../src/readingProgress');
 const removed=['Pause here. What would you include in an exam answer?','Compare your reasoning with these key points. Equivalent accurate wording is welcome.'];
 host=document.createElement('div');document.body.append(host);root=createRoot(host);said.length=0;
 const textButton=(label:string)=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent?.trim()===label)!;
 let checked=0;
 try{
  for(const section of ['q1','q2','q3','q4'] as const){
   await act(async()=>root.render(<Revision key={section} state={migrateReadingProgress({lastQuestion:section})} setState={()=>{}} onLearning={()=>{}}/>));
   for(let i=0;i<8;i++){
    const question=revisionBank.filter(q=>q.section===section)[i];
    assert.equal(host.querySelector('#revision-question')!.textContent,question.prompt);
    for(const revealed of [false,true]){
     if(revealed)await click(textButton('Reveal Answer'));
     for(const text of removed)assert.ok(!host.textContent!.includes(text));
     assert.equal(host.querySelector('.revision-think,.revision-answer-note'),null);
     const sentences=readingSentences(host.querySelector('.revision-card')!).map(s=>s.text);
     for(const text of removed)for(const sentence of sentences)assert.ok(!text.includes(sentence));
     await click(host.querySelector('.reader-start')!);
     assert.deepEqual(c.segments,sentences);
     for(let index=0;index<c.segments.length;index++){
      await act(async()=>c.selectSentence(index));
      for(const text of removed)assert.ok(!text.includes(said.at(-1).text));
     }
     await act(async()=>c.stop());
     if(revealed)assert.deepEqual(Array.from(host.querySelectorAll('.revision-points>li p')).map(p=>p.textContent!.replace(/^\d+\. /,'')),question.points.map(p=>p.replace(/^\d+\. /,'')));
    }
    await click(textButton('Hide Answer'));assert.equal(host.querySelector('#revision-answer'),null);
    checked++;if(i<7)await click(textButton('Next question'));
   }
  }
  assert.equal(checked,32);
 }finally{await cleanup()}
});

test('Reveal Hide Reveal removes spoken answers and focus targets while preserving ratings',async()=>{
 const {default:App}=await import('../src/App');
 localStorage.setItem('ecp172-learn-first-v1',JSON.stringify({ratings:{'q4-b':'later'},position:{q1:0,q2:0,q3:0,q4:0},lastQuestion:'q4'}));
 host=document.createElement('div');document.body.append(host);root=createRoot(host);said.length=0;
 await act(async()=>root.render(<><App/><ReaderPlayer controller={c}/></>));
 const textButton=(label:string)=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()===label)!;
 try{
  await click(textButton('Revise Again'));const toggle=textButton('Reveal Answer');
  assert.equal(toggle.getAttribute('aria-expanded'),'false');const controlled=document.getElementById(toggle.getAttribute('aria-controls')!)!;assert.ok(controlled.hidden);
  await click(toggle);const answer=document.querySelector('#revision-answer')!;assert.equal(toggle.getAttribute('aria-expanded'),'true');assert.ok(!controlled.hidden);
  await click(textButton('Got it!'));const saved=localStorage.getItem('ecp172-learn-first-v1');
  await click(document.querySelector('.reader-start')!);const index=c.segments.findIndex(t=>t.includes('possess equal dignity'));await act(async()=>c.selectSentence(index));
  const old=said.at(-1);assert.equal(c.status,'Speaking');
  await click(textButton('Hide Answer'));assert.equal(c.status,'Idle');assert.deepEqual(c.segments,[]);assert.ok(controlled.hidden);assert.equal(document.querySelector('#revision-answer'),null);assert.equal(answer.isConnected,false);
  assert.equal(document.querySelector('.reading-active'),null);assert.notEqual(document.activeElement?.textContent,'Model answer');assert.equal(localStorage.getItem('ecp172-learn-first-v1'),saved);
  const count=said.length;await act(async()=>{old.onend();c.restart();c.resume()});assert.equal(said.length,count);
  await click(document.querySelector('.reader-start')!);assert.ok(c.segments.every(t=>!t.includes('possess equal dignity')));await act(async()=>c.stop());
  await click(textButton('Reveal Answer'));assert.ok(document.querySelector('#revision-answer'));assert.notEqual(document.querySelector('#revision-answer'),answer);assert.equal(localStorage.getItem('ecp172-learn-first-v1'),saved);
 }finally{await cleanup()}
});
