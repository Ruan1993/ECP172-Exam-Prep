import {useEffect,useRef,useState} from 'react';
import {readingSentences,sentenceAtPoint,interactiveSentenceTarget,type ReadingSentence} from './readingSentences';
import type {SpeechController} from './speech';

const handledClicks=new WeakSet<Event>();
export function useSentenceReading(c:SpeechController,scope:(()=>Element|null)|undefined,claim:()=>void,isOwner:()=>boolean,onFinished?:()=>void){
 const sentences=useRef<ReadingSentence[]>([]);const [choices,setChoices]=useState<string[]>([]);const [selected,setSelected]=useState(0);const [follow,setFollow]=useState(true);
 const begin=(index:number,single:boolean)=>{claim();setSelected(index);c.playSentences(sentences.current.map(s=>s.text),index,single,single?undefined:onFinished)};
 const refresh=()=>{const root=scope?.();sentences.current=root?readingSentences(root):[];setChoices(sentences.current.map(s=>s.text))};
 useEffect(()=>{
  const root=scope?.();if(!root)return;
  refresh();
  const click=(event:Event)=>{const e=event as MouseEvent;if(handledClicks.has(event)||e.button!==0||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||!(e.target instanceof Element)||interactiveSentenceTarget(e.target)||window.getSelection()?.toString())return;
   refresh();const index=sentenceAtPoint(sentences.current,e.clientX,e.clientY);if(index>=0){handledClicks.add(event);begin(index,true)};
  };
  const suspend=()=>setFollow(false);
  const key=(e:KeyboardEvent)=>{if(['PageDown','PageUp','ArrowDown','ArrowUp','Home','End',' '].includes(e.key)&&e.target instanceof Element&&!interactiveSentenceTarget(e.target))suspend()};
  root.addEventListener('click',click);window.addEventListener('wheel',suspend,{passive:true});window.addEventListener('touchmove',suspend,{passive:true});window.addEventListener('keydown',key);
  const observer=new MutationObserver(refresh);observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['open','hidden']});
  return()=>{root.removeEventListener('click',click);window.removeEventListener('wheel',suspend);window.removeEventListener('touchmove',suspend);window.removeEventListener('keydown',key);observer.disconnect()};
 },[c]);
 useEffect(()=>{
  if(!isOwner())return;
  // CSS Custom Highlights do not insert wrappers or duplicate accessible content.
  const api=globalThis as typeof globalThis & {Highlight?:new(...ranges:Range[])=>unknown;CSS:typeof CSS & {highlights?:Map<string,unknown>}};
  if(c.status==='Idle'||c.status==='Finished'||c.status==='Error'){api.CSS?.highlights?.delete('reading-sentence');return}
  const sentence=sentences.current[c.index];if(!sentence)return;
  setSelected(c.index);
  if(api.Highlight)api.CSS?.highlights?.set('reading-sentence',new api.Highlight(sentence.range));
  if(follow&&c.status==='Speaking'){
   const rect=sentence.range.getBoundingClientRect();if(rect.top<100||rect.bottom>window.innerHeight-140)window.scrollBy({top:rect.top-window.innerHeight*.4,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  return()=>{api.CSS?.highlights?.delete('reading-sentence')};
 },[c.status,c.index,c.utterance,follow]);
 return {choices,selected,setSelected,follow,setFollow,begin,refresh,start:()=>{refresh();begin(0,false)}};
}
