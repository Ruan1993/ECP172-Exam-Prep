import {createContext,useContext,useEffect,useImperativeHandle,useRef,type Ref} from 'react';
import {Play} from 'lucide-react';
import {useSentenceReading} from './useSentenceReading';
import {SpeechController} from './speech';
import './speech.css';
let controller:SpeechController|undefined;
export function speech(){return controller??=new SpeechController(typeof window!=='undefined'&&'speechSynthesis' in window?window.speechSynthesis:undefined,text=>new SpeechSynthesisUtterance(text),typeof localStorage==='undefined'?undefined:localStorage)}
// Read only visible educational prose, never controls, closed disclosures, or decorative UI.
export function visibleReadingText(root:Element):string {
 const parts:string[]=[];
 const walk=(node:Node)=>{if(node instanceof HTMLElement){if(node.matches('button,select,textarea,input,nav,aside,[hidden],[aria-hidden="true"],.read-aloud,.reader-player,.eyebrow,.card-level,.card-visual')||getComputedStyle(node).display==='none'||getComputedStyle(node).visibility==='hidden')return;if(node instanceof HTMLDetailsElement&&!node.open){const summary=node.querySelector('summary');if(summary)walk(summary);return}}
 if(node.nodeType===Node.TEXT_NODE){if(node.textContent?.trim())parts.push(node.textContent.trim());return}node.childNodes.forEach(walk);if(node instanceof HTMLElement&&/^(P|DIV|H[1-6]|LI|SECTION|ARTICLE)$/.test(node.tagName))parts.push('\n')};walk(root);return parts.join(' ').replace(/ *\n */g,'\n');
}
export function ReadAloud({text,label='this content',scope,onFinished,playRef}:{text?:string;label?:string;scope?:()=>Element|null;onFinished?:()=>void;playRef?:Ref<{play:()=>void}>}){
 const c=speech(),reader=useSentenceReading(c,scope,onFinished);
 useEffect(()=>()=>reader.stopIfOwned(),[c,text]);
 useImperativeHandle(playRef,()=>({play:()=>reader.start(text)}),[reader.start,text]);
 return <section className="read-aloud" aria-label={`Read aloud ${label}`}>
  <button className="reader-start" disabled={!c.supported} onClick={()=>reader.start(text)} title={`Read aloud ${label}`}><Play size={17} aria-hidden="true"/> Read aloud</button>
  <span>{c.supported?'Tap a sentence to hear it once. Playback controls stay at the bottom.':'Read Aloud is unavailable in this browser.'}</span>
 </section>;
}

const ReadingContext=createContext(false);
export function ReadingActivity({children}:{children:React.ReactNode}){
 const nested=useContext(ReadingContext),ref=useRef<HTMLDivElement>(null);
 useEffect(()=>()=>{if(!nested)speech().stop()},[nested]);
 if(nested)return <>{children}</>;
 return <ReadingContext.Provider value={true}><div ref={ref} onClickCapture={e=>{const target=e.target as HTMLElement;if(target.closest('.read-aloud,.reader-player'))return;const button=target.closest('button');if(button&&/previous|next|continue|restart|Q[1-4]|start.*exam|submit|finish/i.test(button.textContent||''))speech().stop()}}><ReadAloud label="current activity" scope={()=>ref.current}/>{children}</div></ReadingContext.Provider>
}
