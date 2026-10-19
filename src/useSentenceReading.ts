import {useEffect,useRef} from 'react';
import {readingSentences,sentenceAtPoint,interactiveSentenceTarget,sentenceWordRange,followScrollDelta,type ReadingSentence} from './readingSentences';
import type {SpeechController} from './speech';

const handledClicks=new WeakSet<Event>();
let highlightOwner:object|null=null;
type HighlightAPI={Highlight?:new(...ranges:Range[])=>unknown;CSS?:{highlights?:Map<string,unknown>}};
const highlightAPI=()=>globalThis as unknown as HighlightAPI;
function clearHighlight(owner:object){if(highlightOwner===owner){highlightAPI().CSS?.highlights?.delete('reading-sentence');highlightOwner=null}}
export function scrollToSentence(sentence:ReadingSentence){
 const header=document.querySelector('.lf-header')?.getBoundingClientRect();
 const player=document.querySelector('.reader-player')?.getBoundingClientRect();
 const top=Math.max(0,header?.bottom??80),bottom=Math.min(window.innerHeight,player?.top??window.innerHeight-130);
 const delta=followScrollDelta(sentence.range.getBoundingClientRect(),top,bottom);
 if(delta)window.scrollBy({top:delta,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}

export function useSentenceReading(c:SpeechController,scope:(()=>Element|null)|undefined,onFinished?:()=>void){
 const latest=useRef({scope,onFinished});latest.current={scope,onFinished};
 const activeParagraph=useRef<Element|null>(null);
 const clearParagraph=()=>{activeParagraph.current?.classList.remove('reading-active');activeParagraph.current=null};
 const sentences=useRef<ReadingSentence[]>([]),session=useRef<string[]|null>(null),owner=useRef({});
 const binding=useRef<{root:Element;dispose:()=>void}|null>(null);
 const refresh=()=>{const root=latest.current.scope?.();sentences.current=root?readingSentences(root):[]};
 const begin=(index:number,single:boolean,text?:string)=>{
  refresh();session.current=sentences.current.map(s=>s.text);
  if(text!==undefined){sentences.current=[];session.current=null;c.play(text,latest.current.onFinished);session.current=c.segments;return}
  c.playSentences(session.current,index,single,()=>latest.current.onFinished?.());
  const sentence=sentences.current[index];if(sentence&&!c.follow&&c.status==='Speaking')scrollToSentence(sentence);
 };
 // Rebind only when the actual content root changes (e.g. a legacy learning card).
 useEffect(()=>{
  const root=latest.current.scope?.();if(root===binding.current?.root)return;
  binding.current?.dispose();binding.current=null;refresh();if(!root)return;
  const click=(event:Event)=>{
   const e=event as MouseEvent;
   if(handledClicks.has(e)||e.button!==0||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||!(e.target instanceof Element)||interactiveSentenceTarget(e.target)||window.getSelection()?.toString())return;
   refresh();const index=sentenceAtPoint(sentences.current,e.clientX,e.clientY);
   if(index>=0){handledClicks.add(e);begin(index,true)}
  };
  root.addEventListener('click',click);
  binding.current={root,dispose:()=>root.removeEventListener('click',click)};
 });
 useEffect(()=>{
  let previousIndex=-1,previousSession:string[]|null=null,previousFollow=c.follow;
  const paint=()=>{
   if(c.segments!==session.current||['Idle','Finished','Error'].includes(c.status)){clearHighlight(owner.current);clearParagraph();return}
   if(!sentences.current.length){clearHighlight(owner.current);clearParagraph();return}
   const sentence=sentences.current[c.index];
   if(!sentence||!sentence.range.startContainer.isConnected||!sentence.range.getClientRects().length){clearHighlight(owner.current);c.stop();return}
   const paragraph=c.status==='Speaking'?sentence.range.startContainer.parentElement?.closest('[data-concept]')??null:null;
   if(paragraph!==activeParagraph.current){clearParagraph();activeParagraph.current=paragraph;paragraph?.classList.add('reading-active')}
   const api=highlightAPI(),range=c.word?sentenceWordRange(sentence,c.word.start,c.word.end):sentence.range;
   if(api.Highlight&&api.CSS?.highlights){api.CSS.highlights.set('reading-sentence',new api.Highlight(range));highlightOwner=owner.current}
   const changed=previousIndex!==c.index||previousSession!==c.segments||(!previousFollow&&c.follow);
   previousIndex=c.index;previousSession=c.segments;previousFollow=c.follow;
   if(changed&&c.follow&&c.status==='Speaking')scrollToSentence(sentence);
  };
  const suspend=()=>{if(c.segments===session.current&&c.status==='Speaking')c.setFollow(false,false)};
  const key=(e:KeyboardEvent)=>{if(['PageDown','PageUp','ArrowDown','ArrowUp','Home','End',' '].includes(e.key)&&e.target instanceof Element&&!interactiveSentenceTarget(e.target))suspend()};
  const unsubscribe=c.subscribe(paint);
  window.addEventListener('wheel',suspend,{passive:true});window.addEventListener('touchmove',suspend,{passive:true});window.addEventListener('keydown',key);
  // Closing a disclosure or removing active content invalidates its speech session.
  const observer=new MutationObserver(()=>{
   if(c.segments===session.current&&!['Idle','Finished'].includes(c.status)){
    const range=sentences.current[c.index]?.range;
    if(range&&(!range.startContainer.isConnected||!range.getClientRects().length||range.startContainer.parentElement?.closest('details:not([open])')))c.stop();
   }
  });
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','hidden']});
  return()=>{unsubscribe();observer.disconnect();window.removeEventListener('wheel',suspend);window.removeEventListener('touchmove',suspend);window.removeEventListener('keydown',key);binding.current?.dispose();binding.current=null;clearHighlight(owner.current);clearParagraph();if(c.segments===session.current)c.stop()};
 },[c]);
 return {start:(text?:string)=>begin(0,false,text),stopIfOwned:()=>{if(c.segments===session.current)c.stop()}};
}
