import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {speech} from './ReadAloud';
import {SpokenRevision} from './spokenRevision';
import type {Flashcard} from './flashcardBank';

export function useFlashcardAudio({card,reveal,hide,advance,thinkingTime}:{card:Flashcard;reveal:()=>void;hide:()=>void;advance:()=>boolean;thinkingTime:5|10}){
 const c=speech(),latest=useRef({card,reveal,hide,advance});latest.current={card,reveal,hide,advance};
 const [session]=useState(()=>new SpokenRevision({
  question:done=>{latest.current.hide();c.play(latest.current.card.prompt,done)},
  reveal:()=>latest.current.reveal(),answer:done=>c.play(latest.current.card.answer,done),
  advance:()=>latest.current.advance(),pause:()=>c.pause(),resume:()=>c.continueReading(),stop:()=>c.clearSession(),
 }));
 useSyncExternalStore(session.subscribe,session.snapshot,session.snapshot);
 useEffect(()=>c.subscribe(()=>session.speechChanged(c.status,c.message)),[c,session]);
 useEffect(()=>{session.questionReady()},[card.id,session]);
 // Reveal is committed before starting answer narration. There is deliberately
 // no DOM sentence reader or highlighting binding on this surface.
 useEffect(()=>{if(session.phase==='reveal')session.answerReady()});
 useEffect(()=>session.setThinkingTime(thinkingTime),[session,thinkingTime]);
 useEffect(()=>{
  const hidden=()=>{if(document.hidden)session.pause()};document.addEventListener('visibilitychange',hidden);
  return()=>document.removeEventListener('visibilitychange',hidden);
 },[session]);
 useEffect(()=>()=>session.stop(),[session]);
 return {session,play:()=>c.status==='Error'?session.retry():session.play()};
}
