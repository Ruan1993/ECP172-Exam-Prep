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
async function cleanup(){await act(async()=>{c.stop();root.unmount()});host.remove();document.body.innerHTML=''}
const button=(label:string)=>document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
async function click(element:Element){assert.ok(element);await act(async()=>element.dispatchEvent(new win.MouseEvent('click',{bubbles:true,clientX:20,clientY:910,button:0}) as any))}
const highlightText=()=>highlights.get('reading-sentence')?.ranges[0].toString();

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
 }finally{host.remove();document.body.innerHTML=''}
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
