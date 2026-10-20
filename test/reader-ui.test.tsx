import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {Window} from 'happy-dom';
import React,{act,useRef} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {readingSentences,sentenceWordRange,followScrollDelta} from '../src/readingSentences';
import {boundaryWord} from '../src/speech';

registerHooks({load(url,context,next){if(url.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};return next(url,context)}});
registerHooks({resolve(specifier,context,next){if(specifier==='virtual:pwa-register/react')return {url:'data:text/javascript,export function useRegisterSW(){return {needRefresh:[false,()=>{}],offlineReady:[false,()=>{}],updateServiceWorker:async()=>{}}}',shortCircuit:true};return next(specifier,context)}});
const win=new Window({url:'http://localhost/'});
for(const name of ['window','document','Node','Element','HTMLElement','HTMLDetailsElement','Text','NodeFilter','MutationObserver','MouseEvent','KeyboardEvent','Event','PointerEvent','ResizeObserver','localStorage','sessionStorage','FileReader','getComputedStyle']){
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

test('past exam revision preserves Q4 progress, hides answers, saves separately and supports return navigation',async()=>{
 const {default:App}=await import('../src/App');
 const {pastExamStorageKey}=await import('../src/PastExamQuestions');
 const saved=JSON.stringify({ratings:{'q4-b':'understood'},position:{q1:0,q2:0,q3:0,q4:1},lastQuestion:'q4'});
 localStorage.setItem('ecp172-learn-first-v1',saved);
 localStorage.setItem('ecp172-progress-v1','{"legacy":"keep"}');
 localStorage.removeItem(pastExamStorageKey);
 win.history.replaceState(null,'','#q4/'+(await import('../src/guide.json')).default.q4[1].id);
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(<App/>));
 const preserved=localStorage.getItem('ecp172-learn-first-v1');
 const find=(text:string)=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent===text)!;
 await click(find('Past Exam Questions'));
 assert.equal(win.location.hash,'#past-exams');
 assert.equal(host.querySelectorAll('.past-exam-question').length,10);
 assert.equal(host.querySelector('.past-exam-answer'),null);
 await click(find('Reveal model answer'));
 assert.match(host.querySelector('.past-exam-answer strong')!.textContent!,/South African Schools Act/);
 await click(find('I understand it'));
 assert.equal(JSON.parse(localStorage.getItem(pastExamStorageKey)!)['q1-1'],'understood');
 await click(find('Revise later'));
 assert.equal(JSON.parse(localStorage.getItem(pastExamStorageKey)!)['q1-1'],'later');
 assert.equal(localStorage.getItem('ecp172-learn-first-v1'),preserved);
 assert.equal(localStorage.getItem('ecp172-progress-v1'),'{"legacy":"keep"}');
 const sectionQ4=host.querySelectorAll('.past-exam-nav button')[3];await click(sectionQ4);
 assert.equal(host.querySelectorAll('.past-exam-question').length,17);
 assert.equal(host.querySelector('.past-exam-answer'),null);
 assert.equal(host.querySelectorAll('.past-exam-label[data-label="Original Past-Exam"]').length,2);
 await click(find('Overview'));
 assert.ok(host.querySelector('.lf-countdown'));
 await click(find('Past Exam Questions'));
 assert.equal(find('Revise later').getAttribute('aria-pressed'),'true');
 await click(Array.from(host.querySelectorAll('header nav button')).find(b=>b.textContent==='Q4')!);
 assert.ok(host.querySelector('.lf-page-card'));
 assert.equal(localStorage.getItem('ecp172-learn-first-v1'),preserved);
 await cleanup();localStorage.clear();
});
const highlightText=()=>highlights.get('reading-sentence')?.ranges[0].toString();

test('past exam UI preserves every paragraph and question while removing only source prefixes and returning to section navigation',async()=>{
 const {PastExamQuestions,pastExamSections,scenarioText}=await import('../src/PastExamQuestions');
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(<PastExamQuestions/>));
 const nav=host.querySelector<HTMLElement>('.past-exam-nav')!;
 assert.equal(host.querySelector('.past-exam-back-to-top'),null);
 for(const [i,section] of pastExamSections.entries()){
  await click(nav.querySelectorAll('button')[i]);
  assert.deepEqual(Array.from(host.querySelectorAll('.past-exam-context'),p=>p.textContent),section.entries.filter(e=>e.kind==='text'&&!e.heading).map(e=>scenarioText(e.text)));
  assert.doesNotMatch(host.querySelector('.past-exam-scenario')!.textContent!,/ORIGINAL [^•]+•/);
  assert.deepEqual(Array.from(host.querySelectorAll('.past-exam-question h3'),q=>q.textContent),section.entries.filter(e=>e.kind==='question').map(e=>e.prompt));
 }
 let returned:unknown;
 nav.dataset.top='-200';
 nav.scrollIntoView=(options)=>{returned=options};
 await act(async()=>win.dispatchEvent(new win.Event('scroll')));
 await click(host.querySelector('.past-exam-back-to-top')!);
 assert.equal(document.activeElement,nav);
 assert.deepEqual(returned,{block:'start',behavior:'smooth'});
 nav.dataset.top='100';
 await act(async()=>win.dispatchEvent(new win.Event('scroll')));
 assert.equal(host.querySelector('.past-exam-back-to-top'),null);
 await cleanup();
});

test('Flashcards replace revision navigation, manual flips stay silent, and legacy ratings persist',async(t)=>{
 const {default:App}=await import('../src/App');
 t.mock.method(Math,'random',()=>.999);
 const saved={ratings:{'q4-b':'later'},position:{q1:0,q2:0,q3:1,q4:0},lastQuestion:'q3',revision:{ratings:{'rev-q1-rights':'understood','rev-q1-religion':'later'}}};
 localStorage.setItem('ecp172-learn-first-v1',JSON.stringify(saved));
 host=document.createElement('div');document.body.append(host);root=createRoot(host);said.length=0;highlights.clear();
 const textButton=(label:string)=>Array.from(host.querySelectorAll('button')).find(b=>(b.textContent?.trim()===label||b.getAttribute('aria-label')===label))!;
 try{
  await act(async()=>root.render(<React.StrictMode><App/><ReaderPlayer controller={c}/></React.StrictMode>));
  assert.equal(textButton('Revise later'),undefined);await click(textButton('Flashcards'));assert.equal(win.location.hash,'#flashcards');
  assert.equal(host.querySelector('#fc-answer'),null);assert.equal(document.querySelector('.reader-player'),null);assert.equal(textButton('Show hint'),undefined);
  assert.equal(host.querySelectorAll('.fc-filters button').length,5);
  await click(textButton('Q1 only'));await click(textButton('Flip card'));assert.ok(host.querySelector('#fc-answer'));assert.equal(said.length,0);
  assert.match(host.querySelector('#fc-question')!.textContent!,/constitutional rights/);
  for(const label of ['Got it','Revise Again','I understand'])assert.equal(textButton(label),undefined);
  assert.equal(host.querySelector('.fc-ratings,.fc-feedback,[role="progressbar"]'),null);
  assert.match(host.querySelector('.fc-position')!.textContent!,/^Card 1 of \d+$/);
  const detail=host.querySelector<HTMLDetailsElement>('.fc-detail')!;assert.ok(detail);await act(async()=>{detail.open=true});assert.match(detail.textContent!,/Section 9/);
  assert.deepEqual(JSON.parse(localStorage.getItem('ecp172-learn-first-v1')!),saved);
  const question=host.querySelector('#fc-question')!.textContent,counter=host.querySelector('.fc-position')!.textContent;
  await click(textButton('Repeat card'));assert.equal(host.querySelector('#fc-answer'),null);assert.equal(host.querySelector('#fc-question')!.textContent,question);assert.equal(host.querySelector('.fc-position')!.textContent,counter);
  await click(textButton('Flip card'));await click(textButton('Hide answer'));assert.equal(host.querySelector('#fc-answer'),null);assert.equal(said.length,0);assert.equal(highlights.size,0);
  await click(textButton('Q3'));assert.ok(document.querySelector('.lf-page-card'));assert.ok(document.querySelector('.reader-player'));
 }finally{await cleanup()}
});

test('manual flashcard filters and finite sessions present each selected card once with hidden answers',async()=>{
 const {Flashcards}=await import('../src/Flashcards');const {migrateReadingProgress}=await import('../src/readingProgress');const {flashcardBank}=await import('../src/flashcardBank');
 host=document.createElement('div');document.body.append(host);root=createRoot(host);said.length=0;
 const textButton=(label:string)=>Array.from(host.querySelectorAll('button')).find(b=>(b.textContent?.trim()===label||b.getAttribute('aria-label')===label))!;
 try{
  await act(async()=>root.render(<Flashcards onLearning={()=>{}}/>));
  for(const filter of ['Q1 only','Q2 only','Q3 only','Q4 only','All content combined (Q1 + Q2 + Q3 + Q4)']){
   await click(textButton(filter));assert.equal(host.querySelector('#fc-answer'),null);
   if(filter.startsWith('Q'))assert.ok(host.querySelector('.fc-card .lf-eyebrow')!.textContent!.includes(filter.slice(0,2)));
  }
  await click(textButton('Q4 only'));const total=flashcardBank.filter(c=>c.section==='q4').length,seen=new Set<string>();
  for(let i=0;i<total;i++){
   const question=host.querySelector('#fc-question')!.textContent!;assert.ok(!seen.has(question));seen.add(question);
   assert.equal(host.querySelector('#fc-answer'),null);await click(textButton('Flip card'));assert.ok(host.querySelector('#fc-answer'));
   await click(textButton(i===total-1?'Finish session':'Next card'));
  }
  assert.equal(seen.size,total);assert.ok(host.querySelector('.fc-complete'));assert.equal(said.length,0);
  await click(textButton('Start a new session'));assert.equal(host.querySelector('.fc-complete'),null);assert.equal(host.querySelector('#fc-answer'),null);
 }finally{await cleanup()}
});

test('listen mode waits for completed narration, counts five or ten seconds, reads full answers and has no highlighting',async(t)=>{
 const {Flashcards}=await import('../src/Flashcards');const {migrateReadingProgress}=await import('../src/readingProgress');const {flashcardBank}=await import('../src/flashcardBank');
 t.mock.method(Math,'random',()=>.999);
 const state=migrateReadingProgress({revision:{ratings:{'rev-q1-rights':'later'}}}),original=JSON.stringify(state);
 host=document.createElement('div');document.body.append(host);root=createRoot(host);said.length=0;highlights.clear();t.mock.timers.enable({apis:['setTimeout','Date']});
 const textButton=(label:string)=>Array.from(host.querySelectorAll('button')).find(b=>(b.textContent?.trim()===label||b.getAttribute('aria-label')===label))!;
 const finish=async()=>{let count=0;while(c.status==='Speaking'){assert.ok(++count<100);await act(async()=>said.at(-1).onend())}};
 try{
  await act(async()=>root.render(<><Flashcards onLearning={()=>{}}/><ReaderPlayer controller={c}/></>));
  await click(textButton('Q1 only'));await click(textButton('Listen'));assert.equal(c.status,'Idle');assert.equal(host.querySelector('#fc-answer'),null);
  const toolbar=host.querySelector('[role=toolbar][aria-label="Flashcard playback"]')!;assert.ok(toolbar);
  assert.deepEqual(Array.from(toolbar.querySelectorAll('button')).map(b=>b.getAttribute('aria-label')),['Repeat','Play','Next','Stop']);assert.ok(Array.from(toolbar.querySelectorAll('button')).every(b=>b.title&&b.querySelector('svg[aria-hidden="true"]')));
  await click(textButton('Play'));assert.equal(c.status,'Speaking');assert.equal(document.querySelector('.reader-player'),null);assert.equal(host.querySelector('.fc-countdown'),null);
  await act(async()=>said.at(-1).onboundary({name:'word',charIndex:0,charLength:5}));assert.equal(highlights.size,0);assert.equal(host.querySelector('.reading-active'),null);
  await act(async()=>t.mock.timers.tick(20000));assert.equal(host.querySelector('#fc-answer'),null);
  await finish();assert.match(host.querySelector('.fc-listen [role=status]')!.textContent!,/5 seconds/);assert.equal(host.querySelector('.fc-countdown')!.getAttribute('aria-hidden'),'true');assert.match(host.querySelector('.fc-countdown')!.getAttribute('style')!,/5s/);
  await act(async()=>t.mock.timers.tick(1000));assert.match(host.querySelector('.fc-listen [role=status]')!.textContent!,/4 seconds/);
  await click(textButton('Pause'));assert.equal(host.querySelector('.fc-countdown')!.getAttribute('data-paused'),'true');await act(async()=>t.mock.timers.tick(20000));assert.equal(host.querySelector('#fc-answer'),null);
  await click(textButton('Play'));await act(async()=>t.mock.timers.tick(3999));assert.equal(host.querySelector('#fc-answer'),null);
  await act(async()=>t.mock.timers.tick(1));assert.ok(host.querySelector('#fc-answer'));assert.equal(c.status,'Speaking');assert.equal(host.querySelector('.fc-countdown'),null);assert.equal(host.querySelector('.fc-front')!.getAttribute('inert'),'');assert.equal(host.querySelector('.fc-card')!.getAttribute('data-revealed'),'true');
  const first=flashcardBank.find(card=>card.prompt===host.querySelector('#fc-question')!.textContent)!;
  assert.equal(host.querySelector('.fc-answer>p')!.textContent,first.answer);assert.equal(c.segments.join(' '),first.answer);
  await finish();await act(async()=>t.mock.timers.tick(1499));assert.equal(host.querySelector('#fc-question')!.textContent,first.prompt);
  await act(async()=>t.mock.timers.tick(1));assert.notEqual(host.querySelector('#fc-question')!.textContent,first.prompt);assert.equal(host.querySelector('#fc-answer'),null);assert.equal(c.status,'Speaking');
  const select=host.querySelector<HTMLSelectElement>('select[aria-label="Thinking time"]')!;
  await act(async()=>{select.value='10';select.dispatchEvent(new win.Event('change',{bubbles:true}) as any)});
  await finish();assert.match(host.querySelector('.fc-countdown')!.getAttribute('style')!,/10s/);await act(async()=>t.mock.timers.tick(9999));assert.equal(host.querySelector('#fc-answer'),null);await act(async()=>t.mock.timers.tick(1));assert.ok(host.querySelector('#fc-answer'));
  assert.equal(highlights.size,0);assert.equal(JSON.stringify(state),original);
  await click(textButton('Repeat'));assert.equal(host.querySelector('#fc-answer'),null);assert.equal(c.status,'Speaking');
  await click(textButton('Stop'));const count=said.length;await act(async()=>t.mock.timers.tick(20000));assert.equal(c.status,'Idle');assert.equal(said.length,count);
 }finally{await cleanup();t.mock.timers.reset()}
});

test('flashcard speech errors, backgrounding, mode/filter changes and unmount never leak playback or reveal early',async(t)=>{
 const {Flashcards}=await import('../src/Flashcards');const {migrateReadingProgress}=await import('../src/readingProgress');
 host=document.createElement('div');document.body.append(host);root=createRoot(host);said.length=0;t.mock.timers.enable({apis:['setTimeout','Date']});
 const textButton=(label:string)=>Array.from(host.querySelectorAll('button')).find(b=>(b.textContent?.trim()===label||b.getAttribute('aria-label')===label))!;
 try{
  await act(async()=>root.render(<Flashcards onLearning={()=>{}}/>));await click(textButton('Listen'));await click(textButton('Play'));const stale=said.at(-1);
  await act(async()=>stale.onerror({error:'not-allowed'}));assert.equal(c.status,'Error');assert.match(host.querySelector('.fc-listen')!.textContent!,/not-allowed/);await act(async()=>t.mock.timers.tick(20000));assert.equal(host.querySelector('#fc-answer'),null);
  await click(textButton('Play'));assert.equal(c.status,'Speaking');const question=host.querySelector('#fc-question')!.textContent;
  Object.defineProperty(document,'hidden',{configurable:true,value:true});await act(async()=>document.dispatchEvent(new win.Event('visibilitychange') as any));assert.equal(c.status,'Paused');
  await act(async()=>t.mock.timers.tick(20000));assert.equal(host.querySelector('#fc-question')!.textContent,question);assert.equal(host.querySelector('#fc-answer'),null);
  Reflect.deleteProperty(document,'hidden');await click(textButton('Play'));await click(textButton('Next'));assert.notEqual(host.querySelector('#fc-question')!.textContent,question);
  const count=said.length;await act(async()=>stale.onend());assert.equal(said.length,count);
  await click(textButton('Q2 only'));assert.equal(c.status,'Idle');assert.equal(host.querySelector('#fc-answer'),null);await act(async()=>t.mock.timers.tick(20000));assert.equal(c.status,'Idle');
  await click(textButton('Play'));await click(textButton('Manual'));assert.equal(c.status,'Idle');assert.ok(textButton('Flip card'));await click(textButton('Flip card'));assert.ok(host.querySelector('#fc-answer'));
  await click(textButton('Listen'));assert.equal(host.querySelector('#fc-answer'),null);await click(textButton('Play'));await act(async()=>{while(c.status==='Speaking')said.at(-1).onend()});
  const before=said.length;await cleanup();await act(async()=>t.mock.timers.tick(20000));assert.equal(said.length,before);assert.equal(c.status,'Idle');
 }finally{if(host.isConnected)await cleanup();Reflect.deleteProperty(document,'hidden');t.mock.timers.reset()}
});

test('a complete listen session visits its selected deck once and stops without changing ratings',async(t)=>{
 const {Flashcards}=await import('../src/Flashcards');const {migrateReadingProgress}=await import('../src/readingProgress');const {flashcardBank}=await import('../src/flashcardBank');
 host=document.createElement('div');document.body.append(host);root=createRoot(host);said.length=0;t.mock.timers.enable({apis:['setTimeout','Date']});
 const textButton=(label:string)=>Array.from(host.querySelectorAll('button')).find(b=>(b.textContent?.trim()===label||b.getAttribute('aria-label')===label))!;
 const finish=async()=>{let count=0;while(c.status==='Speaking'){assert.ok(++count<100);await act(async()=>said.at(-1).onend())}};
 try{
  await act(async()=>root.render(<Flashcards onLearning={()=>{}}/>));
  await click(textButton('Q3 only'));await click(textButton('Listen'));await click(textButton('Play'));
  const total=flashcardBank.filter(card=>card.section==='q3').length,seen=new Set<string>();
  for(let i=0;i<total;i++){
   const prompt=host.querySelector('#fc-question')!.textContent!;assert.ok(!seen.has(prompt));seen.add(prompt);assert.equal(host.querySelector('#fc-answer'),null);assert.equal(host.querySelector('.fc-celebration'),null);
   await finish();await act(async()=>t.mock.timers.tick(5000));assert.ok(host.querySelector('#fc-answer'));await finish();await act(async()=>t.mock.timers.tick(1500));
  }
  assert.equal(seen.size,total);assert.ok(host.querySelector('.fc-complete'));assert.equal(host.querySelector('.fc-celebration')!.getAttribute('aria-hidden'),'true');assert.equal(host.querySelectorAll('.fc-celebration span').length,8);assert.equal(c.status,'Idle');
  const count=said.length;await act(async()=>t.mock.timers.tick(60000));assert.equal(said.length,count);
 }finally{await cleanup();t.mock.timers.reset()}
});

test('backup pickers allow provider MIME types but validate contents and require restore confirmation',async()=>{
 const {ReadingProgressTransfer}=await import('../src/ReadingProgressTransfer');
 const {ProgressTransfer}=await import('../src/ProgressTransfer');
 const {createBackup,empty}=await import('../src/storage');
 const reading={version:1,kind:'ECP172 Learn First',ratings:{'q1-intro':'later'},position:{q1:1,q2:0,q3:0,q4:0},lastQuestion:'q1',revision:{ratings:{'rev-q1-rights':'later'}}};
 const legacy=createBackup({...empty,reviewed:['intro']});
 const cases=[{Component:ReadingProgressTransfer,key:'ecp172-learn-first-v1',backup:reading,trigger:'Backup',select:'Restore a backup',confirm:'Yes, restore the backup'},
  {Component:ProgressTransfer,key:'ecp172-progress-v1',backup:legacy,trigger:'Backup Progress',select:'Restore Progress from Google Drive',confirm:'Restore this backup'}];
 for(const {Component,key,backup,trigger,select,confirm} of cases){
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
  const original=JSON.stringify({sentinel:'existing progress'});localStorage.setItem(key,original);
  const textButton=(label:string)=>Array.from(host.querySelectorAll('button')).find(b=>(b.textContent?.trim()===label||b.getAttribute('aria-label')===label));
  try{
   await act(async()=>root.render(<Component/>));await click(textButton(trigger)!);
   const input=host.querySelector<HTMLInputElement>('input[type="file"]')!;
   assert.equal(input.hasAttribute('accept'),false);assert.equal(input.multiple,false);
   let launches=0;input.click=()=>{launches++};await click(textButton(select)!);assert.equal(launches,1);
   const choose=async(file?:File)=>{
    Object.defineProperty(input,'files',{value:file?[file]:[],configurable:true});
    await act(async()=>{input.dispatchEvent(new win.Event('change',{bubbles:true}) as any);await win.happyDOM.whenAsyncComplete()});
    assert.equal(input.value,'');assert.equal(localStorage.getItem(key),original);
   };
   await choose();assert.equal(textButton(confirm),undefined);
   for(const type of ['application/json','text/plain','application/octet-stream','']){
    await choose(new win.File([JSON.stringify(backup)],'backup.json',{type}) as any);
    assert.ok(textButton(confirm));await click(textButton('Cancel')!);
    assert.equal(textButton(confirm),undefined);assert.equal(localStorage.getItem(key),original);
   }
   for(const contents of ['not JSON','{}',JSON.stringify({...backup,version:999}),JSON.stringify({...backup,kind:'unrelated'}),JSON.stringify({...backup,ratings:{x:'invalid'},progress:{...empty,cards:{x:'invalid'}}})]){
    await choose(new win.File([contents],'unrelated.txt',{type:'text/plain'}) as any);
    assert.equal(textButton(confirm),undefined);
    assert.ok(host.querySelector('.lf-transfer-error,.transfer-message')!.textContent);
   }
   const unreadable=new win.File([''],'backup.json');const OriginalReader=globalThis.FileReader;
   // Reproduce the provider's File API error after a previous valid selection.
   await choose(new win.File([JSON.stringify(backup)],'backup.json') as any);assert.ok(textButton(confirm));
   Object.defineProperty(globalThis,'FileReader',{configurable:true,value:class {onerror?:()=>void;error={name:'NotFoundError'};readAsText(){queueMicrotask(()=>this.onerror?.())}}});
   try{await choose(unreadable as any);assert.match(host.textContent!,/Could not access.*NotFoundError/);assert.match(host.textContent!,/choose the file from Google Drive again/);assert.equal(textButton(confirm),undefined)}finally{Object.defineProperty(globalThis,'FileReader',{configurable:true,value:OriginalReader})}
   if(Component===ReadingProgressTransfer){
    const oversized=new win.File([''],'backup.json');Object.defineProperty(oversized,'size',{value:1024*1024+1});
    await choose(oversized as any);assert.match(host.textContent!,/too large/);assert.equal(textButton(confirm),undefined);
   }
   await choose(new win.File([JSON.stringify(backup)],'backup.json',{type:'application/octet-stream'}) as any);
   assert.ok(textButton(confirm));assert.equal(localStorage.getItem(key),original);
  }finally{await cleanup();localStorage.removeItem(key)}
 }
});

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
 const {default:App}=await import('../src/App');
 const textButton=(label:string)=>Array.from(document.querySelectorAll('button')).find(b=>(b.textContent?.trim()===label||b.getAttribute('aria-label')===label))!;
 for(const saved of [true,false]){
  await act(async()=>c.setFollow(saved));said.length=0;host=document.createElement('div');document.body.append(host);root=createRoot(host);
  await act(async()=>root.render(<React.StrictMode><App/><ReaderPlayer controller={c}/></React.StrictMode>));
  try{
   await click(textButton('Start at Q1'));assert.equal(c.follow,saved);assert.equal(said.length,0);
   await click(document.querySelector('.reader-start')!);await act(async()=>win.dispatchEvent(new win.Event('wheel')) as any);assert.equal(c.follow,false);
   const count=said.length;await click(textButton('Next card'));assert.equal(c.follow,saved);assert.equal(c.status,'Idle');assert.equal(said.length,count);
   for(const question of ['Q2','Q3','Q4','Overview','Flashcards','Q1']){
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
 const textButton=(label:string)=>Array.from(document.querySelectorAll('button')).find(b=>(b.textContent?.trim()===label||b.getAttribute('aria-label')===label))!;
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
 const textButton=(label:string)=>Array.from(document.querySelectorAll('button')).find(b=>(b.textContent?.trim()===label||b.getAttribute('aria-label')===label))!;
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
 const textButton=(label:string)=>Array.from(document.querySelectorAll('button')).find(b=>(b.textContent?.trim()===label||b.getAttribute('aria-label')===label))!;
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

test('learning navigation scrolls once to the stable reading heading and restores URL navigation',async()=>{
 reduced=false;
 const {default:App}=await import('../src/App');
 localStorage.setItem('ecp172-learn-first-v1',JSON.stringify({ratings:{},position:{q1:0,q2:0,q3:0,q4:0},lastQuestion:'q1'}));
 const originalScrollTo=win.scrollTo;
 const pageTops:any[]=[];
 win.scrollTo=((options:any)=>pageTops.push(options)) as any;
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(<React.StrictMode><App/><ReaderPlayer controller={c}/></React.StrictMode>));
 const textButton=(label:string)=>Array.from(document.querySelectorAll('button')).find(b=>(b.textContent?.trim()===label||b.getAttribute('aria-label')===label))!;
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
