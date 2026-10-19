import {useEffect,useId,useRef,useState,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import {LocateFixed,Pause,Play,RotateCcw,Settings2,SkipBack,SkipForward,Volume2,VolumeX,X} from 'lucide-react';
import {speech} from './ReadAloud';
import type {SpeechController} from './speech';

type Panel='volume'|'settings'|null;
export function ReaderPlayer({controller=speech()}:{controller?:SpeechController}){
 const c=controller;useSyncExternalStore(c.subscribe,c.snapshot,c.snapshot);
 const [panel,setPanel]=useState<Panel>(null),[voices,setVoices]=useState<SpeechSynthesisVoice[]>([]);
 const bar=useRef<HTMLDivElement>(null),popover=useRef<HTMLDivElement>(null),volumeTrigger=useRef<HTMLButtonElement>(null),settingsTrigger=useRef<HTMLButtonElement>(null),returnFocus=useRef<HTMLElement|null>(null);
 const id=useId(),visible=c.status!=='Idle',playing=c.status==='Speaking',volume=Math.round((c.preferences.volume??1)*100);
 useEffect(()=>{
  const engine=window.speechSynthesis,load=()=>setVoices(engine?.getVoices()||[]);load();engine?.addEventListener('voiceschanged',load);
  return()=>engine?.removeEventListener('voiceschanged',load);
 },[]);
 useEffect(()=>{
  if(!visible){setPanel(null);return}
  if(document.activeElement instanceof HTMLElement&&!bar.current?.contains(document.activeElement))returnFocus.current=document.activeElement;
  const reserve=()=>document.documentElement.style.setProperty('--reader-space',`${bar.current?.getBoundingClientRect().height??130}px`);
  document.body.classList.add('reader-active');reserve();
  const observer=new ResizeObserver(reserve);if(bar.current)observer.observe(bar.current);
  return()=>{observer.disconnect();document.body.classList.remove('reader-active');document.documentElement.style.removeProperty('--reader-space')};
 },[visible]);
 useEffect(()=>{
  if(!panel)return;
  const trigger=panel==='volume'?volumeTrigger.current:settingsTrigger.current;
  popover.current?.querySelector<HTMLElement>('input,select,button')?.focus();
  const outside=(event:Event)=>{if(event.target instanceof Node&&!popover.current?.contains(event.target)&&!trigger?.contains(event.target))setPanel(null)};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();setPanel(null);trigger?.focus()}};
  document.addEventListener('pointerdown',outside);document.addEventListener('focusin',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('focusin',outside);document.removeEventListener('keydown',escape)};
 },[panel]);
 if(!visible)return null;
 const iconButton=(label:string,action:()=>void,icon:React.ReactNode,disabled=false)=><button type="button" className="reader-icon" aria-label={label} title={label} onClick={action} disabled={disabled}>{icon}</button>;
 return createPortal(<div ref={bar} className="reader-player" role="region" aria-label="Study reader">
  <div className="reader-main-controls">
   {iconButton('Previous sentence',()=>c.navigate(-1),<SkipBack aria-hidden="true"/>,c.index===0)}
   <button type="button" className="reader-icon reader-play" aria-label={playing?'Pause reading':'Play continuously from current sentence'} title={playing?'Pause reading':'Play continuously from current sentence'} onClick={playing?c.pause:c.continueReading}>{playing?<Pause aria-hidden="true"/>:<Play aria-hidden="true"/>}</button>
   {iconButton('Next sentence',()=>c.navigate(1),<SkipForward aria-hidden="true"/>,c.index>=c.segments.length-1)}
   <div className="reader-status" role="status" aria-atomic="true"><strong>{playing?'Reading':c.status==='Paused'?'Paused':c.status}</strong><span>{Math.min(c.index+1,c.segments.length)} / {c.segments.length}</span></div>
  </div>
  <div className="reader-tools">
   <button type="button" className="reader-icon" aria-label="Follow reading" aria-pressed={c.follow} title={c.follow?'Follow reading is on':'Follow reading is off. Enable to return to the spoken text.'} onClick={()=>c.setFollow(!c.follow)}><LocateFixed aria-hidden="true"/></button>
   <button type="button" ref={volumeTrigger} className="reader-icon" aria-label="Speech volume" title={`Speech volume: ${volume}%`} aria-expanded={panel==='volume'} aria-controls={`${id}-volume`} onClick={()=>setPanel(panel==='volume'?null:'volume')}>{volume===0?<VolumeX aria-hidden="true"/>:<Volume2 aria-hidden="true"/>}</button>
   <button type="button" ref={settingsTrigger} className="reader-icon reader-settings-trigger" aria-label="Reading settings" title={`Reading settings, speed ${c.preferences.rate}×`} aria-expanded={panel==='settings'} aria-controls={`${id}-settings`} onClick={()=>setPanel(panel==='settings'?null:'settings')}><Settings2 aria-hidden="true"/><small>{c.preferences.rate}×</small></button>
   {iconButton('Stop reading and close player',()=>{c.stop();if(returnFocus.current?.isConnected)returnFocus.current.focus()},<X aria-hidden="true"/>)}
  </div>
  {panel&&<div ref={popover} className={`reader-popover reader-${panel}`} id={`${id}-${panel}`} role="dialog" aria-label={panel==='volume'?'Speech volume':'Reading settings'}>
   {panel==='volume'?<>
    <label htmlFor={`${id}-slider`}>Speech volume <output>{volume}%</output></label>
    <input id={`${id}-slider`} type="range" aria-label="Speech volume percentage" aria-valuetext={`${volume}%`} min="0" max="100" step="5" value={volume} onChange={e=>c.configure({volume:Number(e.target.value)/100})}/>
    <button type="button" className="reader-popover-action" onClick={c.toggleMute} aria-label={volume===0?'Unmute speech':'Mute speech'}>{volume===0?<Volume2 size={18} aria-hidden="true"/>:<VolumeX size={18} aria-hidden="true"/>}{volume===0?'Unmute':'Mute'}</button>
    <small>Applies to the next sentence; device volume stays unchanged.</small>
   </>:<>
    <label>Speed<select value={c.preferences.rate} onChange={e=>c.configure({rate:Number(e.target.value)})}>{[.75,1,1.25,1.5].map(v=><option key={v} value={v}>{v}×</option>)}</select></label>
    <label>Device voice<select value={c.preferences.voiceURI} onChange={e=>c.configure({voiceURI:e.target.value})}><option value="">Automatic English voice</option>{voices.map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name} · {v.lang}{v.localService?' · offline':''}</option>)}</select></label>
    <details><summary>Keyboard sentence navigation</summary><label>Read a sentence once<select aria-label="Read a sentence once" value={Math.min(c.index,c.segments.length-1)} onChange={e=>c.selectSentence(Number(e.target.value))}>{c.segments.map((sentence,i)=><option key={i} value={i}>{i+1}. {sentence}</option>)}</select></label></details>
    <button type="button" className="reader-popover-action" onClick={c.restart}><RotateCcw size={18} aria-hidden="true"/> Restart reading</button>
    <small>{c.message||'Play repeats the current sentence. Device voices and word boundaries vary by browser.'}</small>
   </>}
  </div>}
 </div>,document.body);
}
