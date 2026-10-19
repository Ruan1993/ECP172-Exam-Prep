import {focusReadingHeading} from './contentNavigation';
import {useEffect,useRef,useState,type Dispatch,type SetStateAction} from 'react';
import {ArrowLeft,ArrowRight,Check,Lightbulb,RotateCcw,BookOpen} from 'lucide-react';
import {ReadAloud,speech} from './ReadAloud';
import {useReaderCardNavigation} from './readerCardNavigation';
import {conceptForText} from './learningConcepts';
import {orderedRevision,rateRevision} from './revisionProgress';
import {revisionBank} from './revisionBank';
import type {Question,Rating,ReadingState} from './readingProgress';
import './revision.css';

type Props={state:ReadingState;setState:Dispatch<SetStateAction<ReadingState>>;onLearning:(section:Question,id:string)=>void};
const sections:Question[]=['q1','q2','q3','q4'];
export function Revision({state,setState,onLearning}:Props){
 const [session,setSession]=useState(()=>({section:state.lastQuestion,questions:orderedRevision(state.lastQuestion,state),index:0}));
 const [revealed,setRevealed]=useState(false),[hint,setHint]=useState(false),[feedback,setFeedback]=useState<Rating|null>(null),[complete,setComplete]=useState(false);
 const question=session.questions[session.index],rating=state.revision?.ratings[question.id];
 const hasConceptNumbers=question.points.some(point=>conceptForText(point));
 const answerHeading=useRef<HTMLHeadingElement>(null);
 const root=useRef<HTMLElement>(null),heading=useRef<HTMLHeadingElement>(null),play=useRef<{play:()=>void}>(null),focusNext=useRef(false);
 const reset=()=>{speech().stop();setRevealed(false);setHint(false);setFeedback(null);setComplete(false);focusNext.current=true};
 const choose=(section:Question)=>{reset();setSession({section,questions:orderedRevision(section,state),index:0})};
 const move=(index:number)=>{reset();setSession(s=>({...s,index}))};
 useEffect(()=>{if(focusNext.current){if(heading.current)focusReadingHeading(heading.current);focusNext.current=false}},[session]);
 useEffect(()=>{if(revealed)answerHeading.current?.focus({preventScroll:true})},[revealed]);
 useEffect(()=>()=>speech().stop(),[]);
 useReaderCardNavigation({itemLabel:'Question',section:`${session.section.toUpperCase()} revision`,position:session.index+1,total:session.questions.length,play:()=>play.current?.play(),previous:session.index>0?()=>move(session.index-1):undefined,next:session.index<session.questions.length-1?()=>move(session.index+1):()=>{speech().stop();setComplete(true)},nextLabel:session.index===session.questions.length-1?'Finish revision section':undefined});
 const rate=(value:Rating)=>{setState(s=>rateRevision(s,question.id,value));setFeedback(value)};
 const bookmarked=question.sourceIds.filter(id=>state.ratings[id]==='later');
 return <section className="revision-space" aria-label="Active recall revision">
  <div className="revision-intro"><span className="lf-eyebrow">THINK FIRST · THEN CHECK</span><h1>Make it stick.</h1><p>Say your answer, think it through or sketch a few points. Reveal the model when you are ready.</p></div>
  <div className="revision-sections" role="group" aria-label="Revision sections">{sections.map(section=>{const items=revisionBank.filter(q=>q.section===section),got=items.filter(q=>state.revision?.ratings[q.id]==='understood').length,again=items.filter(q=>state.revision?.ratings[q.id]==='later').length;return <button key={section} aria-pressed={session.section===section} onClick={()=>choose(section)}><strong>{section.toUpperCase()}</strong><span>{got} of {items.length} got it{again?` · ${again} to revisit`:''}</span></button>})}</div>
  <p className="revision-progress-note">Learning-card bookmarks are kept separately and bring related questions forward. Your question ratings take priority once you have tried them. Reopen a section to start with what needs practice.</p>
  <div className="revision-position"><span>{session.section.toUpperCase()} · Question {session.index+1} of {session.questions.length}</span><span>{rating==='understood'?'Previously: Got it':rating==='later'?'Queued: Revise Again':'Ready to try'}</span></div>
  <div className="revision-meter" aria-label="Revision position" role="progressbar" aria-valuemin={1} aria-valuemax={session.questions.length} aria-valuenow={session.index+1}><span style={{width:`${(session.index+1)/session.questions.length*100}%`}}/></div>
  <ReadAloud key={`revision-reader-${question.id}`} playRef={play} label="revision question and any revealed answer" scope={()=>root.current}/>
  <article ref={root} key={`revision-question-${question.id}`} className="revision-card" aria-labelledby="revision-question">
   <span className="lf-eyebrow">{session.section.toUpperCase()} · ACTIVE RECALL</span>
   <h2 id="revision-question" ref={heading} tabIndex={-1}>{question.prompt}</h2>
   {bookmarked.length>0&&!rating&&<div className="revision-source-note">Prioritised from your learning-card bookmarks.</div>}
   <div className="revision-tools"><button aria-expanded={hint} aria-controls="revision-hint" onClick={()=>{speech().stop();setHint(v=>!v)}}><Lightbulb size={18}/>{hint?'Hide hint':'Show hint'}</button><button className="lf-primary answer-toggle" aria-expanded={revealed} aria-controls="revision-answer-panel" onClick={()=>{speech().clearSession();setRevealed(v=>!v)}}>{revealed?'Hide Answer':'Reveal Answer'} <ArrowRight size={18}/></button></div>
   {hint&&<div id="revision-hint" className="revision-hint"><h3>A starting point</h3><p>{question.hint}</p></div>}
   <div id="revision-answer-panel" hidden={!revealed}>{revealed&&<section id="revision-answer" className="revision-answer reading-prose" aria-label="Model answer"><h3 ref={answerHeading} tabIndex={-1}>Model answer</h3>
    <ol className="revision-points">{question.points.map((point,i)=>{const concept=conceptForText(point);return <li key={i} style={{'--point-order':i} as React.CSSProperties}>{concept?<p className="learning-concept" data-concept={concept.id} data-tone={concept.tone}>{point}</p>:<p>{!hasConceptNumbers&&`${i+1}. `}{point}</p>}</li>})}</ol>
    {question.remember&&<div className="revision-remember"><h4>Remember this</h4><p>{question.remember}</p></div>}
   </section>}</div>
  </article>
  {revealed&&<section className="revision-rating" aria-label="Rate your recall"><p>How did your answer compare?</p><div><button aria-pressed={rating==='understood'} className={`revision-got ${feedback==='understood'?'confirmed':''}`} onClick={()=>rate('understood')}><Check size={21}/> Got it!</button><button aria-pressed={rating==='later'} className={`revision-again ${feedback==='later'?'confirmed':''}`} onClick={()=>rate('later')}><RotateCcw size={20}/> Revise Again</button></div><p className="revision-feedback" role="status">{feedback==='understood'?'Saved. You can still revisit this question.':feedback==='later'?'Saved for another attempt. It will come first when you reopen this section.':'Your choice only changes this revision question.'}</p></section>}
  <div className="revision-navigation"><button disabled={session.index===0} onClick={()=>move(session.index-1)}><ArrowLeft size={18}/> Previous question</button>{session.index<session.questions.length-1?<button className="lf-primary" onClick={()=>move(session.index+1)}>Next question <ArrowRight size={18}/></button>:<button className="lf-primary" onClick={()=>{speech().stop();setComplete(true)}}>Finish section <Check size={18}/></button>}</div>
  {complete&&<section className="revision-complete" role="status"><h2>Section reviewed.</h2><p>Your ratings are saved. Revisit the section any time, including questions you already know.</p><button onClick={()=>choose(session.section)}><RotateCcw size={18}/> Revise this section again</button></section>}
  <details className="revision-sources"><summary><BookOpen size={17}/> Related learning cards</summary><p>Learning choices stay unchanged when you rate a revision question.</p>{question.sourceIds.map(id=><button key={id} onClick={()=>onLearning(question.section,id)}>Review {id.replace(/^q\d-/,'').replaceAll('-',' ')} <ArrowRight size={15}/></button>)}</details>
 </section>;
}
