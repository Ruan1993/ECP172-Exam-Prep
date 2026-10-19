export type SpeechStatus = 'Idle'|'Speaking'|'Paused'|'Finished'|'Error';
export type Preferences = {rate:number;voiceURI:string;volume?:number};
export const preferenceKey='ecp172-read-aloud-v1';
export function readPreferences(storage?:Pick<Storage,'getItem'>):Preferences {
 try {const p=JSON.parse(storage?.getItem(preferenceKey)||'{}');return {rate:[.75,1,1.25,1.5].includes(p.rate)?p.rate:1,...(typeof p.volume==='number'&&p.volume>=0&&p.volume<=1?{volume:p.volume}:{}),voiceURI:typeof p.voiceURI==='string'?p.voiceURI:storage?.getItem('ecp172-voice-uri')||''}} catch{return {rate:1,voiceURI:''}}
}
// Preserve abbreviations and decimal numbers; cap unusually long sentences at word boundaries.
export function segmentText(text:string):string[] {
 const splitter=new Intl.Segmenter('en-ZA',{granularity:'sentence'});
 const sentences=text.replace(/\r/g,'').split(/\n+/).flatMap(p=>Array.from(splitter.segment(p),s=>s.segment));
 const result:string[]=[];
 for(const sentence of sentences){const words=sentence.trim().split(/\s+/);let chunk='';for(const word of words){if(chunk.length+word.length>220&&chunk){result.push(chunk);chunk=''}chunk+=(chunk?' ':'')+word}if(chunk)result.push(chunk)}
 return result;
}
export class SpeechController {
 status:SpeechStatus='Idle'; segments:string[]=[]; index=0; message=''; preferences:Preferences; utterance:SpeechSynthesisUtterance|null=null;
 private single=false; private token=0; private listeners=new Set<()=>void>(); private done?:()=>void;
 private engine:SpeechSynthesis|undefined; private create:(text:string)=>SpeechSynthesisUtterance; private storage?:Pick<Storage,'getItem'|'setItem'>;
 constructor(engine:SpeechSynthesis|undefined, create:(text:string)=>SpeechSynthesisUtterance, storage?:Pick<Storage,'getItem'|'setItem'>){this.engine=engine;this.create=create;this.storage=storage;this.preferences=readPreferences(storage)}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener)}};
 snapshot=()=>`${this.status}:${this.index}:${this.message}:${this.preferences.rate}:${this.preferences.voiceURI}:${this.preferences.volume??1}:${this.token}`;
 private emit(){this.listeners.forEach(fn=>fn())}
 get supported(){return !!this.engine}
 private cancel(){this.token++;this.utterance=null;this.engine?.cancel()}
 stop=()=>{this.cancel();this.status='Idle';this.message='';this.done=undefined;this.emit()};
 play=(text:string,done?:()=>void)=>{this.cancel();this.single=false;this.segments=segmentText(text);this.index=0;this.done=done;this.message='';if(!this.engine){this.fail('Read Aloud is unavailable in this browser.');return}if(!this.segments.length){this.status='Idle';this.emit();return}this.say()};
 private fail(message:string){this.cancel();this.status='Error';this.message=message;this.done=undefined;this.emit()}
 playSentences=(segments:string[],index=0,single=false,done?:()=>void)=>{this.cancel();this.segments=segments;this.index=index;this.single=single;this.done=done;this.message='';if(!this.engine){this.fail('Read Aloud is unavailable in this browser.');return}if(!segments[index]){this.stop();return}this.say()};
 continueReading=()=>{this.single=false;this.cancel();if(this.segments[this.index])this.say()};
 private say(){
  if(!this.engine)return;
  const token=++this.token;
  try {
   // Never depend on native pause/resume for position. A fresh short utterance avoids stuck native resume.
   this.engine.resume();
   const u=this.create(this.segments[this.index]);this.utterance=u;u.rate=this.preferences.rate;u.volume=this.preferences.volume??1;
   const voices=this.engine.getVoices();const voice=voices.find(v=>v.voiceURI===this.preferences.voiceURI)||voices.find(v=>v.lang==='en-ZA')||voices.find(v=>v.lang.startsWith('en'));
   if(voice)u.voice=voice;u.lang=voice?.lang||'en-ZA';
   u.onend=()=>{if(token!==this.token||this.status!=='Speaking')return;this.utterance=null;if(this.single){this.status='Paused';this.message='Sentence finished. Continue reading starts from this sentence.';this.emit();return}if(++this.index<this.segments.length)this.say();else{this.status='Finished';this.emit();const done=this.done;this.done=undefined;done?.()}};
   u.onerror=e=>{if(token===this.token)this.fail(`Speech could not continue (${e.error}). Try Resume or Restart, or choose another device voice.`)};
   this.status='Speaking';this.emit();this.engine.speak(u);
  }catch{this.fail('Speech could not start. Choose another device voice and try Restart.')}
 }
 pause=()=>{if(this.status!=='Speaking')return;this.cancel();this.status='Paused';this.message='Resume repeats the current sentence or short segment.';this.emit()};
 resume=()=>{if(this.status!=='Paused'&&this.status!=='Error')return;if(this.index<this.segments.length){this.message='';this.say()}};
 restart=()=>{if(this.segments.length){const text=this.segments.join('\n');this.play(text,this.done)}};
 configure=(patch:Partial<Preferences>)=>{const playing=this.status==='Speaking';if(playing&&(patch.rate!==undefined||patch.voiceURI!==undefined))this.pause();this.preferences={...this.preferences,...patch};try{this.storage?.setItem(preferenceKey,JSON.stringify(this.preferences))}catch{/* Storage may be disabled. */}if(this.status==='Paused')this.message='Settings updated. Resume repeats the current sentence with the new settings.';this.emit()};
}
