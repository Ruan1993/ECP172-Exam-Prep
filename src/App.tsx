import {focusReadingHeading,readRoute,routeHash,type ContentRoute} from './contentNavigation';
import {Flashcards} from './Flashcards';
import {PastExamQuestions} from './PastExamQuestions';
import type {ReadingState} from './readingProgress';
import {conceptForText} from './learningConcepts';
import './learningExperience.css';
import {ExamQuestionPanel} from './ExamQuestionPanel';
import {readingQuestionTopics} from './pastPaperQuestions';
import {ReadAloud,speech} from './ReadAloud';
import {useReaderCardNavigation} from './readerCardNavigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Bookmark, Check, ChevronDown, ChevronRight, CircleHelp, Compass, Download, GraduationCap, Heart, Lightbulb, Menu, Moon, RotateCcw, Sparkles, Sun, X } from 'lucide-react';
import rawGuide from './guide.json';
import {migrateReadingProgress} from './readingProgress';
import { PWAControls } from './PWAControls';
import './makeover.css';
import './interactivePolish.css';

type Question = 'q1'|'q2'|'q3'|'q4';
type Page = 'home'|Question| 'flashcards'|'past-exams';
type Rating = 'understood'|'later';
type StudyCard = {id:string; title:string;kind:'intro'|'concept'|'scenario'|'proposal';body:string[];tag:string;tip?:string;scene?:string};
type State = ReadingState;
const guide = rawGuide as Record<Question,StudyCard[]>;
const questions:{id:Question;unit:string;title:string;tagline:string;emoji:string;description:string}[] = [
 {id:'q1',unit:'UNIT 1',title:'Policies in education',tagline:'The rules that protect learners',emoji:'⚖️',description:'Rights, school law and how to apply them to a real admission scenario.'},
 {id:'q2',unit:'UNIT 2',title:'Research proposals',tagline:'Two complete stories, two research designs',emoji:'🔎',description:'The full language-barriers and cyberbullying examples, from problem to ethics.'},
 {id:'q3',unit:'UNITS 3 + 5',title:'Language & learning',tagline:'When understanding gets lost in translation',emoji:'💬',description:'The essential concepts followed by two fully written classroom scenarios.'},
 {id:'q4',unit:'UNIT 4',title:'The multicultural classroom',tagline:'Different backgrounds. Equal belonging.',emoji:'🌍',description:'Diversity, equity and four approaches, followed by model explanations.'},
];
// The examination is on 21 October 2026, in South African Standard Time (UTC+02:00).
// Use an explicit offset so the countdown works correctly outside South Africa too.
const examAt = Date.parse('2026-10-21T00:00:00+02:00');
function getTimeRemaining(now:number){
 const seconds=Math.max(0,Math.floor((examAt-now)/1000));
 return {days:Math.floor(seconds/86400),hours:Math.floor(seconds%86400/3600),minutes:Math.floor(seconds%3600/60),seconds:seconds%60,finished:seconds===0};
}
function ExamCountdown(){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[]);
 const left=getTimeRemaining(now);
 return <section className="lf-countdown" aria-label="Countdown to ECP172 examination" aria-live="off">
   <div className="lf-countdown-intro"><span className="lf-countdown-icon" aria-hidden="true">⏳</span><div><span className="lf-eyebrow">THE BIG DAY · WEDNESDAY 21 OCTOBER 2026</span><h2>{left.finished?'Exam day is here!':'Your exam countdown'}</h2><p>{left.finished?'You have prepared. Trust what you know.':'One card at a time. You have got this!'}</p></div></div>
   {!left.finished&&<div className="lf-countdown-units" role="timer" aria-label={`${left.days} days, ${left.hours} hours, ${left.minutes} minutes and ${left.seconds} seconds until exam day`}>
     {([['Days',left.days],['Hours',left.hours],['Minutes',left.minutes],['Seconds',left.seconds]] as const).map(([label,value])=><div className="lf-countdown-unit" key={label}><strong>{String(value).padStart(2,'0')}</strong><span>{label}</span></div>)}
   </div>}
 </section>;
}
const storageKey='ecp172-learn-first-v1';
const blank:State={ratings:{},position:{q1:0,q2:0,q3:0,q4:0},lastQuestion:'q1'};
const clamp=(value:number,max:number)=>Math.min(Math.max(value,0),max);
function initial():State{try{return migrateReadingProgress(JSON.parse(localStorage.getItem(storageKey)||'null'))}catch{return blank}}
const isHeading=(s:string)=>/^\d+\.\s/.test(s)||s.startsWith('Exam-style model answer:')||s.startsWith('What to learn, not merely memorise')||s.startsWith('Illustrative examination prompt:')||s.startsWith('Q4 model answer')||s.startsWith('Goals and everyday classroom implications');
function Paragraph({value}:{value:string}){const concept=conceptForText(value);if(concept){const idx=value.indexOf(' — ');return <p className="learning-concept" data-concept={concept.id} data-tone={concept.tone}>{idx>0?<><strong>{value.slice(0,idx)}</strong> — {value.slice(idx+3)}</>:value}</p>}const idx=value.indexOf(' — ');if(idx>0&&idx<75)return <p><strong>{value.slice(0,idx)}</strong><span className="dash"> — </span>{value.slice(idx+3)}</p>;if(value.startsWith('Scenario:'))return <p className="prompt-paragraph"><strong>THE SITUATION</strong>{value.slice(9)}</p>;if(value.startsWith('Question:'))return <p className="exam-question"><strong>THE QUESTION</strong>{value.slice(9)}</p>;if(value.startsWith('Model answer:'))return <p><strong>Model answer. </strong>{value.slice(13)}</p>;if(isHeading(value))return <h3 className="inside-heading">{value.replace(/\s*\(illustrative \d+ marks\)/g,'')}</h3>;return <p>{value}</p>}
function App(){
 const readerHandle=useRef<{play:()=>void}>(null),readingHeading=useRef<HTMLHeadingElement>(null),pendingHeading=useRef(false);
 const [navigationTick,setNavigationTick]=useState(0);
 const [learningFeedback,setLearningFeedback]=useState<{rating:Rating;serial:number}|null>(null);
 useEffect(()=>{if(!learningFeedback)return;const timer=window.setTimeout(()=>setLearningFeedback(null),1800);return()=>window.clearTimeout(timer)},[learningFeedback]);
 const navigateHistory=(route:ContentRoute)=>{const hash=routeHash(route);if(window.location.hash!==hash)window.history.pushState(null,'',hash)};
 const [page,setPage]=useState<Page>('home');const [state,setState]=useState<State>(initial);
 const [dark,setDark]=useState(localStorage.getItem('theme')==='dark');
 const [menu,setMenu]=useState(false);const [outline,setOutline]=useState(false);const [showReset,setShowReset]=useState(false);
 const [sourceOpen,setSourceOpen]=useState(false);

 useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify(state))}catch{/* private browsing */}},[state]);
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';try{localStorage.setItem('theme',dark?'dark':'light')}catch{/* private browsing */}},[dark]);
 const go=(dest:Page)=>{speech().stop();setPage(dest);setMenu(false);setOutline(false);navigateHistory({page:dest});window.scrollTo({top:0,behavior:'instant'})};
 const select=(id:Question,index:number)=>{const target=clamp(index,guide[id].length-1);speech().stop();pendingHeading.current=true;setState(s=>({...s,lastQuestion:id,position:{...s.position,[id]:target}}));setPage(id);setMenu(false);setOutline(false);setNavigationTick(n=>n+1);navigateHistory({page:id,index:target})};
 const active=page==='q1'||page==='q2'||page==='q3'||page==='q4'?page:null;
 const index=active?state.position[active]:0;
 const current=active?guide[active][index]:null;
 const setIndex=(value:number)=>{if(active)select(active,value)};
 useLayoutEffect(()=>{if(pendingHeading.current&&readingHeading.current){pendingHeading.current=false;focusReadingHeading(readingHeading.current)}},[page,index,navigationTick]);
 useEffect(()=>{
  const previous=window.history.scrollRestoration;window.history.scrollRestoration='manual';
  const restore=()=>{const route=readRoute(window.location.hash);if(!route)return;speech().stop();setMenu(false);setOutline(false);setPage(route.page);pendingHeading.current=route.index!==undefined;
   if(route.index!==undefined){const q=route.page as Question;setState(s=>({...s,lastQuestion:q,position:{...s.position,[q]:route.index!}}))}
   else window.scrollTo({top:0,behavior:'instant'});setNavigationTick(n=>n+1);
  };
  if(readRoute(window.location.hash))restore();else window.history.replaceState(null,'','#overview');
  window.addEventListener('popstate',restore);
  return()=>{window.history.scrollRestoration=previous;window.removeEventListener('popstate',restore)};
 },[]);
 const mark=(rating:Rating)=>{if(!current)return;setLearningFeedback(previous=>({rating,serial:(previous?.serial??0)+1}));setState(s=>({...s,ratings:{...s.ratings,[current.id]:rating}}));};
 const allCards=useMemo(()=>questions.flatMap(q=>guide[q.id].map(c=>({...c,question:q.id}))),[]);
 const understood=allCards.filter(c=>state.ratings[c.id]==='understood').length;
 const revise=allCards.filter(c=>state.ratings[c.id]==='later');
 const rating=current?state.ratings[current.id]:undefined;
 const nextUnrated=()=>{for(const q of questions){const ix=guide[q.id].findIndex(c=>!state.ratings[c.id]);if(ix>=0){select(q.id,ix);return}}select(state.lastQuestion,state.position[state.lastQuestion])};
 useReaderCardNavigation(active&&current?{
  position:index+1,total:guide[active].length,section:active.toUpperCase(),play:()=>readerHandle.current?.play(),
  previous:index>0?()=>setIndex(index-1):active!=='q1'?()=>{const previous=questions[questions.findIndex(q=>q.id===active)-1].id;select(previous,guide[previous].length-1)}:undefined,
  next:index<guide[active].length-1?()=>setIndex(index+1):active!=='q4'?()=>select(questions[questions.findIndex(q=>q.id===active)+1].id,0):()=>go('home'),
  nextLabel:active==='q4'&&index===guide.q4.length-1?'Finish guide and return to overview':undefined,
 }:null);
 const exportProgress=()=>{const payload={version:1,kind:'ECP172 Learn First',exportedAt:new Date().toISOString(),...state};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ecp172-learn-first-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 return <>
 <header className="lf-header"><button className="lf-brand" onClick={()=>go('home')} aria-label="Back to study home"><span className="brand-icon"><GraduationCap/></span><span>ECP172 <strong>Learn First</strong></span></button>
  <nav className={menu?'open':''} aria-label="Study navigation"><button className={page==='home'?'active':''} onClick={()=>go('home')}>Overview</button>{questions.map(q=><button key={q.id} className={page===q.id?'active':''} onClick={()=>select(q.id,state.position[q.id])}>{q.id.toUpperCase()}</button>)}<button className={page==='flashcards'?'active':''} onClick={()=>go('flashcards')}><Bookmark size={15}/> Flashcards</button><button className={page==='past-exams'?'active':''} onClick={()=>go('past-exams')}>Past Exam Questions</button></nav>
  <div className="tools"><PWAControls/><button onClick={()=>setDark(d=>!d)} aria-label={dark?'Use light theme':'Use dark theme'}>{dark?<Sun/>:<Moon/>}</button><button className="hamb" onClick={()=>setMenu(m=>!m)} aria-label={menu?'Close menu':'Open menu'}>{menu?<X/>:<Menu/>}</button></div>
 </header>
 <main className="lf-main">
 {page==='home'&&<>
   <ExamCountdown/>
   <section className="lf-hero"><div className="lf-hero-copy"><span className="lf-eyebrow"><Sparkles size={16}/> YOUR CALMER WAY TO STUDY</span><h1>Less testing.<br/><i>More understanding.</i></h1><p className="hero-lead">Four questions. One clear journey. Proper explanations first, full exam-style answers afterwards. No XP, no pressure, no repeating the same lesson five different ways.</p><div className="hero-actions"><button className="lf-primary" onClick={nextUnrated}>Pick up where I left off <ArrowRight/></button><button className="lf-secondary" onClick={()=>select('q1',0)}>Start at Q1</button><button className="lf-secondary" onClick={()=>go('flashcards')}>Flashcards <RotateCcw size={18}/></button><button className="lf-secondary" onClick={()=>go('past-exams')}>Past Exam Questions <BookOpen size={18}/></button></div></div><div className="hero-art" aria-hidden="true"><span className="orbit orbit-one">✦</span><span className="orbit orbit-two">✳</span><span className="book-shape"><span>⚖️</span><span>🔎</span><span>💬</span><span>🌍</span></span><div className="art-caption">One thing<br/>at a time.</div></div></section>
   <div className="lf-note"><Heart size={19}/><div><strong>A little reminder</strong><p>You are not here to collect marks or finish random activities. You are here to understand the material well enough to explain it in your own words.</p></div></div>
   <div className="lf-heading-row"><div><span className="lf-eyebrow">YOUR EXAM ROUTE</span><h2>Follow the four questions, in order.</h2></div><p>Choose any question, or continue where you stopped. Each one runs from theory to the full worked example.</p></div>
   <div className="lf-course-grid">{questions.map((q,i)=>{const done=guide[q.id].filter(c=>state.ratings[c.id]==='understood').length;const needs=guide[q.id].filter(c=>state.ratings[c.id]==='later').length;return <button className="lf-course" key={q.id} onClick={()=>select(q.id,state.position[q.id])}><div className="lf-course-top"><span className="lf-course-emoji">{q.emoji}</span><span className="lf-course-number">0{i+1} / 04</span></div><div className="lf-course-unit">{q.unit}</div><h3>{q.title}</h3><p>{q.description}</p><div className="course-progress"><div style={{width:(done/guide[q.id].length)*100+'%'}}/></div><div className="course-meta"><span><Check size={14}/> {done} understood</span><span>{needs>0?`${needs} to revisit`:'Open chapter'} <ArrowRight size={16}/></span></div></button>})}</div>
   <div className="lf-note lf-note-quiet"><Lightbulb size={21}/><div><strong>Learn first. Then practise recalling it.</strong><p>The learning cards and complete model answers stay here, including both research studies. Choose Flashcards to practise recall with short answers at your own pace.</p></div></div>
   <section className="lf-progress-summary"><div><span className="lf-eyebrow">A GENTLE CHECK-IN</span><h2>Your reading journey</h2><p>Your learning choices are saved on this device. “Revise Again” bookmarks the learning card and opens Flashcards. Flashcards use a fresh random order without tracking performance.</p></div><div className="lf-stats"><span><strong>{understood}</strong><small>cards understood</small></span><span><strong>{revise.length}</strong><small>bookmarked to revisit</small></span><span><strong>{allCards.length}</strong><small>cards in the guide</small></span></div></section>
 </>}
 {active&&current&&<>
  <div className="lf-crumb"><button onClick={()=>go('home')}><ArrowLeft size={15}/> All questions</button><span><ChevronRight size={14}/>{active.toUpperCase()} <ChevronRight size={14}/>{current.kind==='scenario'?'Worked answer':current.kind==='proposal'?'Research example':'Theory'}</span></div>
  <section className="lf-chapter-hero"><div><span className="lf-eyebrow">{questions.find(q=>q.id===active)?.unit} · QUESTION {active.slice(1)} OF 4</span><h1>{questions.find(q=>q.id===active)?.title}</h1><p>{questions.find(q=>q.id===active)?.tagline}</p></div><span className="chapter-emoji" aria-hidden="true">{questions.find(q=>q.id===active)?.emoji}</span></section>
  <div className="lf-reading-layout"><aside className="lf-sidebar"><div className="outline-header"><span>YOUR READING PATH</span><span>{index+1} / {guide[active].length}</span></div><div className="tiny-progress"><span style={{width:`${((index+1)/guide[active].length)*100}%`}}/></div><div className="outline-list">{guide[active].map((c,i)=><button key={c.id} className={i===index?'selected':''} onClick={()=>setIndex(i)}><span className={'outline-dot '+(state.ratings[c.id]||'')}>{state.ratings[c.id]==='understood'?<Check size={11}/>:i+1}</span><span>{c.title}</span>{state.ratings[c.id]==='later'&&<Bookmark size={14}/>}</button>)}</div><div className="outline-caption">Theory comes first. Worked answers come after.</div></aside>
   <div className="lf-reader"><button className="outline-toggle" onClick={()=>setOutline(v=>!v)} aria-expanded={outline}><Compass size={18}/> View this question's roadmap <ChevronDown size={17}/></button>{outline&&<div className="mobile-outline">{guide[active].map((c,i)=><button key={c.id} className={index===i?'active':''} onClick={()=>setIndex(i)}>{i+1}. {c.title}{state.ratings[c.id]==='understood'?' ✓':''}</button>)}</div>}
    <div className="reader-top"><span className="reader-category">{current.kind==='scenario'?'📖 COMPLETE WORKED ANSWER':current.kind==='proposal'?'🔍 REAL RESEARCH EXAMPLE':current.kind==='intro'?'✨ START HERE':'💡 THE THEORY'}</span><span className="reader-number">CARD {index+1} OF {guide[active].length}</span></div>
    <ReadAloud playRef={readerHandle} key={current.id} label={current.title} scope={()=>document.querySelector('.lf-page-card')}/><article key={`card-${current.id}`} className="lf-page-card" data-rating={rating} data-scenario={active==='q2'?(current.id.startsWith('q2-a-')?'a':current.id.startsWith('q2-b-')?'b':undefined):undefined}><span className="lf-card-tag">{current.tag}</span><h2 ref={readingHeading} tabIndex={-1}>{current.title}</h2>{current.scene&&<div className="lf-story-banner"><span aria-hidden="true">📍</span><p>{current.scene}</p></div>}
    <div className="reading-prose">{current.body.map((text,i)=><Paragraph key={`${current.id}-${i}`} value={text}/>)}</div>
    {current.tip&&<div className="lf-teacher-tip"><Lightbulb size={19}/><div><span>THE THING TO REMEMBER</span><p>{current.tip}</p></div></div>}
    {readingQuestionTopics[current.id]&&<ExamQuestionPanel key={current.id} topic={readingQuestionTopics[current.id]}/>}
    </article>
    <div className="lf-rating"><div><h3>How does this feel?</h3><p>Just a personal bookmark — not a test.</p></div><div className="rating-buttons"><button aria-pressed={rating==='understood'} className={'understand '+(rating==='understood'?'chosen':'')} onClick={()=>mark('understood')}><Check size={18}/> I understand it</button><button aria-pressed={rating==='later'} className={'bookmark '+(rating==='later'?'chosen':'')} onClick={()=>{mark('later');go('flashcards')}}><Bookmark size={17}/> Revise Again</button></div></div>
    <div className="lf-reader-actions"><button disabled={index===0} onClick={()=>setIndex(index-1)}><ArrowLeft size={18}/> Previous</button><div className="read-jump">{index+1} / {guide[active].length}</div>{index<guide[active].length-1?<button className="lf-primary" onClick={()=>setIndex(index+1)}>Next card <ArrowRight size={18}/></button>:active!=='q4'?<button className="lf-primary" onClick={()=>select(('q'+(Number(active.slice(1))+1)) as Question,0)}>Continue to next question <ArrowRight size={18}/></button>:<button className="lf-primary" onClick={()=>go('home')}>Back to overview <ArrowRight size={18}/></button>}</div>
    <div className="lf-content-note"><CircleHelp size={15}/> Worked examples are illustrative, not official memoranda. The lecturer's later briefing prioritised structured answers over standalone essays.</div>
   </div>
  </div>
 </>}
 {page==='past-exams'&&<PastExamQuestions/>}
 {page==='flashcards'&&<Flashcards onLearning={(section,id)=>select(section,guide[section].findIndex(card=>card.id===id))}/>}
 <section className="lf-extras"><button onClick={()=>setSourceOpen(v=>!v)} aria-expanded={sourceOpen}><BookOpen size={16}/> About this guide <ChevronDown size={16}/></button>{sourceOpen&&<div className="source-info"><ReadAloud label="about this guide" scope={()=>document.querySelector('.source-info')}/><p>This reading journey follows the 13-page ECP172 study guide prepared for 21 October 2026. Q2 uses concise exam-ready proposals adapted from the guide; the other model answers are retained. Brief teaching prompts and navigation labels are supplementary explanations.</p><p><strong>Source note:</strong> The guide labels proposal A “Literacy and numeracy difficulties”, but the complete proposal itself investigates <strong>language barriers in Grade 8 Social Sciences</strong>. We present its actual contents, without silently claiming it is a numeracy study.</p><p>Your previous website progress remains stored under its original key. This redesigned reading journey saves its own card-by-card choices.</p><button onClick={exportProgress}><Download size={15}/> Download new reading progress</button><button onClick={()=>setShowReset(true)}><RotateCcw size={15}/> Reset new reading choices</button></div>}</section>
 </main>
 {showReset&&<div className="lf-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setShowReset(false)}}><div className="lf-dialog" role="dialog" aria-modal="true" aria-label="Reset reading progress"><h2>Start the new journey again?</h2><p>This only clears the new “I understand it” and “Revise later” choices. Your old mock-exam and quiz progress will remain untouched in browser storage.</p><div><button onClick={()=>setShowReset(false)}>Cancel</button><button className="lf-primary" onClick={()=>{setState(s=>({...blank,...(s.revision?{revision:s.revision}:{})}));setShowReset(false);go('home')}}>Reset reading choices</button></div></div></div>}
 {learningFeedback&&<div key={learningFeedback.serial} className={`learning-feedback ${learningFeedback.rating}`} role="status">{learningFeedback.rating==='understood'?<Check size={20}/>:<Bookmark size={20}/>}<span>{learningFeedback.rating==='understood'?'Marked understood':'Saved for revision'}</span></div>}
 <footer className="lf-footer"><span>Learn it. Understand it. Remember it. 🌿</span><span>Designed by <a href="https://www.rcdigitalcreations.co.za" target="_blank" rel="noopener noreferrer">RC Digital Creations</a></span></footer>
 </>;
}
export default App;
