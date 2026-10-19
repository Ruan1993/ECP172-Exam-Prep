import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {flushSync} from 'react-dom';
import {ArrowRight,Headphones,Layers,Pause,Play,RotateCcw,Square} from 'lucide-react';
import {speech} from './ReadAloud';
import {useReaderCardNavigation} from './readerCardNavigation';
import {createFlashcardSession,type FlashcardFilter} from './flashcardSession';
import {useFlashcardAudio} from './useFlashcardAudio';
import type {Question} from './readingProgress';
import './flashcards.css';

const filters:[FlashcardFilter,string][]=[['all','All content combined (Q1 + Q2 + Q3 + Q4)'],['q1','Q1 only'],['q2','Q2 only'],['q3','Q3 only'],['q4','Q4 only']];
type Props={onLearning:(section:Question,id:string)=>void};
export function Flashcards({onLearning}:Props){
 const [filter,setFilter]=useState<FlashcardFilter>('all');
 const [deck,setDeck]=useState(()=>createFlashcardSession('all'));
 const [index,setIndex]=useState(0),[revealed,setRevealed]=useState(false),[complete,setComplete]=useState(false);
 const [mode,setMode]=useState<'manual'|'listen'>('manual'),[thinkingTime,setThinkingTime]=useState<5|10>(5);
 const card=deck[index];
 const frontFlip=useRef<HTMLButtonElement>(null),backFlip=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(mode==='manual')(revealed?backFlip:frontFlip).current?.focus({preventScroll:true})},[mode,revealed]);
 const advance=()=>{
  if(index===deck.length-1){setComplete(true);return false}
  setRevealed(false);setIndex(index+1);return true;
 };
 const audio=useFlashcardAudio({card,reveal:()=>setRevealed(true),hide:()=>setRevealed(false),advance,thinkingTime});
 // Flashcards have their own small control group. The shared learning reader
 // remains unchanged on Learn pages and is hidden here to avoid duplicate controls.
 useReaderCardNavigation(audio.session.active?{hidden:true,position:index+1,total:deck.length,section:'Flashcards',play:audio.play}:null);
 const newSession=(selection=filter)=>{
  audio.session.stop();setFilter(selection);setDeck(createFlashcardSession(selection));setIndex(0);setRevealed(false);setComplete(false);
 };
 const changeMode=(next:'manual'|'listen')=>{audio.session.stop();setMode(next);setRevealed(false)};
 const play=()=>{
  if(complete){flushSync(()=>newSession());audio.session.start()}
  else audio.play();
 };
 const status=audio.session.message||(complete?'Session complete. Start a new session for a fresh shuffle.':audio.session.paused?'Paused. Tap Play to continue.':audio.session.phase==='thinking'?`Thinking · ${audio.session.countdown} ${audio.session.countdown===1?'second':'seconds'}`:audio.session.phase==='between'?'Next card in a moment…':audio.session.phase==='answer'||audio.session.phase==='reveal'?'Reading the answer…':audio.session.phase==='question'?'Reading the question…':'Press Play to begin.');
 return <section className="flashcards" data-question={card.section} aria-labelledby="flashcards-title">
  <div className="fc-intro"><span className="lf-eyebrow"><Layers size={18}/> RECALL · CONNECT · REMEMBER</span><h1 id="flashcards-title">Flashcards</h1><p>Short answers, useful connections. Flip at your own pace or listen and think before each answer.</p></div>
  <div className="fc-filters" role="group" aria-label="Flashcard content">{filters.map(([value,label])=><button key={value} data-section={value} aria-pressed={filter===value} onClick={()=>newSession(value)}>{label}</button>)}</div>
  <div className="fc-session-tools"><div className="fc-modes" role="group" aria-label="Flashcard mode"><button aria-pressed={mode==='manual'} onClick={()=>changeMode('manual')}><Layers size={18}/> Manual</button><button aria-pressed={mode==='listen'} onClick={()=>changeMode('listen')}><Headphones size={18}/> Listen</button></div><button onClick={()=>newSession()}><RotateCcw size={17}/> New session</button></div>
  {mode==='listen'&&<section className="fc-listen" aria-label="Listen controls">
   <label>Thinking time <select aria-label="Thinking time" value={thinkingTime} onChange={event=>setThinkingTime(Number(event.target.value) as 5|10)}><option value={5}>5 seconds</option><option value={10}>10 seconds</option></select></label>
   <div className="fc-controls"><button className="lf-primary" disabled={!speech().supported} onClick={audio.session.playing?audio.session.pause:play}>{audio.session.playing?<Pause size={19}/>:<Play size={19}/>} {audio.session.playing?'Pause':'Play'}</button><button disabled={!speech().supported} onClick={()=>{setComplete(false);audio.session.repeat()}}><RotateCcw size={18}/> Repeat</button><button disabled={complete} onClick={audio.session.next}>Next <ArrowRight size={18}/></button><button disabled={!audio.session.active} onClick={audio.session.stop}><Square size={18}/> Stop</button></div>
   <div className="fc-listen-status">{audio.session.phase==='thinking'&&<div key={`${card.id}-${thinkingTime}`} className="fc-countdown" aria-hidden="true" data-paused={audio.session.paused} style={{'--thinking-duration':`${thinkingTime}s`} as CSSProperties}><svg viewBox="0 0 100 100" focusable="false"><circle className="fc-ring-track" cx="50" cy="50" r="42"/><circle className="fc-ring-progress" cx="50" cy="50" r="42" pathLength="100" strokeDasharray="100" strokeDashoffset={100*(1-audio.session.countdown/thinkingTime)}/></svg><span>{audio.session.countdown}<small>seconds</small></span></div>}
   <p role="status" aria-live="polite">{speech().supported?status:'Speech is unavailable in this browser. Use Manual mode to flip the cards.'}</p></div>
   <small>Changing thinking time restarts that countdown. The session pauses when the app is backgrounded.</small>
  </section>}
  <p className="fc-position">Card {index+1} of {deck.length}</p>
  <article key={card.id} className="fc-card" data-revealed={revealed} aria-labelledby={revealed?'fc-question-back':'fc-question'}><div className="fc-card-inner"><div className="fc-face fc-front" aria-hidden={revealed} inert={revealed}>
   <span className="lf-eyebrow">QUESTION · {card.section.toUpperCase()}</span><h2 id="fc-question">{card.prompt}</h2>
   {mode==='manual'&&<button ref={frontFlip} className="lf-primary fc-flip" aria-expanded={revealed} aria-controls="fc-answer" onClick={()=>setRevealed(value=>!value)}>Flip card <RotateCcw size={18}/></button>}
   </div>{revealed&&<section id="fc-answer" className="fc-face fc-back fc-answer" aria-label="Flashcard answer"><span className="lf-eyebrow">ANSWER · {card.section.toUpperCase()}</span><h2 id="fc-question-back">{card.prompt}</h2><p>{card.answer}</p>{mode==='manual'&&<button ref={backFlip} className="fc-flip" onClick={()=>setRevealed(false)}>Hide answer <RotateCcw size={18}/></button>}
    {card.details&&<details className="fc-detail"><summary>Full revision explanation</summary>{card.details.map((point,i)=><p key={i}>{point}</p>)}</details>}
    <details className="fc-sources"><summary>Review the learning material</summary>{card.sourceIds.map(id=><button key={id} onClick={()=>{audio.session.stop();onLearning(card.section,id)}}>Review {id.replace(/^q\d-/,'').replaceAll('-',' ')} <ArrowRight size={15}/></button>)}</details>
   </section>}
  </div></article>
  {mode==='manual'&&<div className="fc-manual-next"><button onClick={()=>{setComplete(false);setRevealed(false)}}><RotateCcw size={18}/> Repeat card</button><button className="lf-primary" disabled={complete} onClick={advance}>{index===deck.length-1?'Finish session':'Next card'} <ArrowRight size={18}/></button></div>}
  {complete&&<section className="fc-complete" role="status"><div className="fc-celebration" aria-hidden="true">{Array.from({length:8},(_,i)=><span key={i} style={{'--spark-x':`${(i-3.5)*30}px`,'--spark-turn':`${i%2?120:-120}deg`,'--spark-delay':`${i%3*50}ms`} as CSSProperties}/>)}</div><h2>Session complete.</h2><p>You have seen every card in this set. Take a break or shuffle again whenever you like.</p><button className="lf-primary" onClick={()=>newSession()}>Start a new session</button></section>}
 </section>;
}
