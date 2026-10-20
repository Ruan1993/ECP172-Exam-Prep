import {useEffect,useRef,useState} from 'react';
import pack from './pastExamPack.json';
import './pastExamQuestions.css';

export const pastExamStorageKey='ecp172-past-exam-questions-v1';
type Rating='understood'|'later';
type Entry={kind:'text';text:string;heading:boolean}|{kind:'question';id:string;prompt:string;answer:string;label:string};
export const pastExamSections=pack.sections as {id:string;title:string;entries:Entry[]}[];
const ids=new Set(pastExamSections.flatMap(s=>s.entries.flatMap(e=>e.kind==='question'?[e.id]:[])));
// Source prefixes are presentation metadata; the study pack remains untouched.
export function scenarioText(text:string){
 return text.replace(/^ORIGINAL [^•]+• [^,]+, pages? \d+(?:[–-]\d+)?\s*/, '');
}
function readProgress():Record<string,Rating>{
 try{
  const saved:unknown=JSON.parse(localStorage.getItem(pastExamStorageKey)||'{}');
  if(!saved||typeof saved!=='object'||Array.isArray(saved))return {};
  return Object.fromEntries(Object.entries(saved).filter(([id,value])=>ids.has(id)&&(value==='understood'||value==='later')));
 }catch{return {}}
}
function Question({entry,rating,onRate}:{entry:Extract<Entry,{kind:'question'}>;rating?:Rating;onRate:(id:string,rating:Rating)=>void}){
 const [revealed,setRevealed]=useState(false);
 return <article className="past-exam-question" aria-labelledby={`${entry.id}-prompt`}>
  <span className="past-exam-label" data-label={entry.label}>{entry.label}</span>
  <h3 id={`${entry.id}-prompt`}>{entry.prompt}</h3>
  <button className="lf-secondary" aria-expanded={revealed} aria-controls={`${entry.id}-answer`} onClick={()=>setRevealed(v=>!v)}>{revealed?'Hide model answer':'Reveal model answer'}</button>
  {revealed&&<div id={`${entry.id}-answer`} className="past-exam-answer"><strong>{entry.answer}</strong></div>}
  <div className="past-exam-ratings" aria-label="Your understanding">
   <button aria-pressed={rating==='understood'} onClick={()=>onRate(entry.id,'understood')}>I understand it</button>
   <button aria-pressed={rating==='later'} onClick={()=>onRate(entry.id,'later')}>Revise later</button>
  </div>
 </article>;
}
export function PastExamQuestions(){
 const navigation=useRef<HTMLElement>(null);
 const [showBackToTop,setShowBackToTop]=useState(false);
 useEffect(()=>{
  const update=()=>setShowBackToTop((navigation.current?.getBoundingClientRect().bottom??0)<0);
  update();
  window.addEventListener('scroll',update,{passive:true});
  return ()=>window.removeEventListener('scroll',update);
 },[]);
 const [section,setSection]=useState('q1');
 const [ratings,setRatings]=useState(readProgress);
 const [feedback,setFeedback]=useState('');
 const current=pastExamSections.find(s=>s.id===section)!;
 const mark=(id:string,rating:Rating)=>{
  const next={...ratings,[id]:rating};setRatings(next);
  try{localStorage.setItem(pastExamStorageKey,JSON.stringify(next));setFeedback(rating==='understood'?'Marked understood.':'Saved to revise later.')}
  catch{setFeedback('Choice kept for this visit. Your browser could not save it on this device.')}
 };
 return <section className="past-exam" aria-labelledby="past-exam-title">
  <div className="lf-chapter-hero"><div><span className="lf-eyebrow">EXAMINATION REVISION</span><h1 id="past-exam-title">Past Exam Questions</h1><p>Questions, scenarios and model answers from the Final Past-Paper Study Pack.</p></div></div>
  <p>Original Past-Exam, Predicted and Practice questions are labelled separately. The source labels and suggested marks are retained in full.</p>
  <p>{Object.values(ratings).filter(r=>r==='understood').length} understood · {Object.values(ratings).filter(r=>r==='later').length} to revise · {ids.size} questions</p>
  <nav ref={navigation} tabIndex={-1} className="past-exam-nav" aria-label="Past exam question sections">{pastExamSections.map(s=><button key={s.id} aria-current={section===s.id?'page':undefined} onClick={()=>{setSection(s.id);setFeedback('')}}>{s.id.toUpperCase()}</button>)}</nav>
  <p className="past-exam-feedback" role="status">{feedback}</p>
  <h2>{current.title}</h2>
  <div key={section}>{current.entries.map((e,i)=>{
   if(e.kind==='question')return <Question key={e.id} entry={e} rating={ratings[e.id]} onRate={mark}/>;
   if(e.heading)return <h3 className="past-exam-heading" key={i}>{e.text}</h3>;
   const previous=current.entries[i-1];
   if(previous?.kind==='text'&&!previous.heading)return null;
   const paragraphs:Extract<Entry,{kind:'text'}>[]=[];
   for(let j=i;j<current.entries.length;j++){
    const next=current.entries[j];
    if(next.kind!=='text'||next.heading)break;
    paragraphs.push(next);
   }
   return <div className="past-exam-scenario" key={i}>{paragraphs.map((p,j)=><p className="past-exam-context" key={j}>{scenarioText(p.text)}</p>)}</div>;
  })}</div>
  <div className="past-exam-top-lane">{showBackToTop&&<button className="past-exam-back-to-top" onClick={()=>{
   navigation.current?.focus({preventScroll:true});
   navigation.current?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }}>↑ Back to Top</button>}</div>
 </section>;
}
