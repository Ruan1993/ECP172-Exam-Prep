import {createContext,useContext,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {SpeechController} from './speech';
import './speech.css';
let controller:SpeechController|undefined;
let activeReader:symbol|undefined;
export function speech(){return controller??=new SpeechController(typeof window!=='undefined'&&'speechSynthesis' in window?window.speechSynthesis:undefined,text=>new SpeechSynthesisUtterance(text),typeof localStorage==='undefined'?undefined:localStorage)}
// Read only visible educational prose, never controls, closed disclosures, or decorative UI.
export function visibleReadingText(root:Element):string {
 const parts:string[]=[];
 const walk=(node:Node)=>{if(node instanceof HTMLElement){if(node.matches('button,select,textarea,input,nav,aside,[hidden],[aria-hidden="true"],.read-aloud,.eyebrow,.card-level,.card-visual')||getComputedStyle(node).display==='none'||getComputedStyle(node).visibility==='hidden')return;if(node instanceof HTMLDetailsElement&&!node.open){const summary=node.querySelector('summary');if(summary)walk(summary);return}}
 if(node.nodeType===Node.TEXT_NODE){if(node.textContent?.trim())parts.push(node.textContent.trim());return}node.childNodes.forEach(walk);if(node instanceof HTMLElement&&/^(P|DIV|H[1-6]|LI|SECTION|ARTICLE)$/.test(node.tagName))parts.push('\n')};walk(root);return parts.join(' ').replace(/ *\n */g,'\n');
}
export function ReadAloud({text,label='this content',scope,onFinished}:{text?:string;label?:string;scope?:()=>Element|null;onFinished?:()=>void}){
 const c=speech();useSyncExternalStore(c.subscribe,c.snapshot,c.snapshot);const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]);const owned=useRef(Symbol());
 useEffect(()=>{const load=()=>setVoices(window.speechSynthesis?.getVoices()||[]);load();window.speechSynthesis?.addEventListener('voiceschanged',load);return()=>{window.speechSynthesis?.removeEventListener('voiceschanged',load);if(activeReader===owned.current)c.stop()}},[c]);
 useEffect(()=>()=>{if(activeReader===owned.current)c.stop()},[c,text]);
 const start=()=>{activeReader=owned.current;const root=scope?.();c.play(text??(root?visibleReadingText(root):''),onFinished)};
 return <section className="read-aloud" aria-label={`Read aloud ${label}`}><div className="read-buttons"><button onClick={start} disabled={!c.supported||c.status==='Speaking'}>Read aloud</button><button onClick={c.pause} disabled={c.status!=='Speaking'}>Pause</button><button onClick={c.resume} disabled={c.status!=='Paused'&&c.status!=='Error'}>Resume</button><button onClick={c.stop} disabled={c.status==='Idle'}>Stop</button><button onClick={start} disabled={!c.supported}>Restart reading</button></div><p role="status">{c.supported?c.status:'Read Aloud is unavailable in this browser.'}{c.segments.length>0&&c.status!=='Idle'&&` · Segment ${Math.min(c.index+1,c.segments.length)} of ${c.segments.length}`}{c.message&&` — ${c.message}`}</p><details><summary>Listening settings</summary><div className="read-settings"><label>Speed<select value={c.preferences.rate} onChange={e=>c.configure({rate:Number(e.target.value)})}>{[.75,1,1.25,1.5].map(v=><option key={v} value={v}>{v}×</option>)}</select></label><label>Device voice<select value={c.preferences.voiceURI} onChange={e=>c.configure({voiceURI:e.target.value})}><option value="">Automatic English voice</option>{voices.map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name} · {v.lang}{v.localService?' · offline':''}</option>)}</select></label></div><p>Pause keeps your sentence. Resume may repeat that sentence. Changing settings pauses playback until you resume. Device voices may need internet; screen locking or backgrounding can interrupt speech.</p></details></section>
}

const ReadingContext=createContext(false);
export function ReadingActivity({children}:{children:React.ReactNode}){
 const nested=useContext(ReadingContext),ref=useRef<HTMLDivElement>(null);
 useEffect(()=>()=>{if(!nested)speech().stop()},[nested]);
 if(nested)return <>{children}</>;
 return <ReadingContext.Provider value={true}><div ref={ref} onClickCapture={e=>{const target=e.target as HTMLElement;if(target.closest('.read-aloud'))return;const button=target.closest('button');if(button&&/previous|next|continue|restart|Q[1-4]|start.*exam|submit|finish/i.test(button.textContent||''))speech().stop()}}><ReadAloud label="current activity" scope={()=>ref.current}/>{children}</div></ReadingContext.Provider>
}
