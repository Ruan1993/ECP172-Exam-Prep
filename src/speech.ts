export type SpeechStatus = 'Idle'|'Speaking'|'Paused'|'Finished'|'Error';
export type Preferences = {rate:number;voiceURI:string;volume?:number;lastVolume?:number;follow?:boolean};
export type SpokenWord = {start:number;end:number};
export const preferenceKey='ecp172-read-aloud-v1';
export function readPreferences(storage?:Pick<Storage,'getItem'>):Preferences {
 try {
  const p=JSON.parse(storage?.getItem(preferenceKey)||'{}');
  return {rate:[.75,1,1.25,1.5].includes(p.rate)?p.rate:1,voiceURI:typeof p.voiceURI==='string'?p.voiceURI:storage?.getItem('ecp172-voice-uri')||'',
   ...(typeof p.volume==='number'&&p.volume>=0&&p.volume<=1?{volume:p.volume}:{}),
   ...(typeof p.lastVolume==='number'&&p.lastVolume>0&&p.lastVolume<=1?{lastVolume:p.lastVolume}:{}),
   ...(typeof p.follow==='boolean'?{follow:p.follow}:{})};
 }catch{return {rate:1,voiceURI:''}}
}
// A real word event must identify the start of a word in the utterance's UTF-16 text.
// Sentence events, invalid offsets and punctuation never manufacture a word position.
export function boundaryWord(text:string,charIndex:number,charLength:number,name:string):SpokenWord|null {
 if(name!=='word'||!Number.isInteger(charIndex)||charIndex<0||charIndex>=text.length||!Number.isInteger(charLength)||charLength<0||charIndex+charLength>text.length)return null;
 for(const word of new Intl.Segmenter('en-ZA',{granularity:'word'}).segment(text)){
  if(word.index===charIndex&&word.isWordLike)return {start:word.index,end:word.index+word.segment.length};
 }
 return null;
}
// Preserve abbreviations and decimal numbers; cap unusually long text-only segments.
export function segmentText(text:string):string[] {
 const splitter=new Intl.Segmenter('en-ZA',{granularity:'sentence'});
 const sentences=text.replace(/\r/g,'').split(/\n+/).flatMap(p=>Array.from(splitter.segment(p),s=>s.segment));
 const result:string[]=[];
 for(const sentence of sentences){const words=sentence.trim().split(/\s+/);let chunk='';for(const word of words){if(chunk.length+word.length>220&&chunk){result.push(chunk);chunk=''}chunk+=(chunk?' ':'')+word}if(chunk)result.push(chunk)}
 return result;
}
export class SpeechController {
 status:SpeechStatus='Idle'; segments:string[]=[]; index=0; message=''; preferences:Preferences; utterance:SpeechSynthesisUtterance|null=null;
 word:SpokenWord|null=null; follow:boolean;
 private single=false; private token=0; private listeners=new Set<()=>void>(); private done?:()=>void;
 private engine:SpeechSynthesis|undefined; private create:(text:string)=>SpeechSynthesisUtterance; private storage?:Pick<Storage,'getItem'|'setItem'>;
 constructor(engine:SpeechSynthesis|undefined,create:(text:string)=>SpeechSynthesisUtterance,storage?:Pick<Storage,'getItem'|'setItem'>){this.engine=engine;this.create=create;this.storage=storage;this.preferences=readPreferences(storage);this.follow=this.preferences.follow??true}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener)}};
 // Word events notify range subscribers without re-rendering the controls for every word.
 snapshot=()=>`${this.status}:${this.index}:${this.message}:${JSON.stringify(this.preferences)}:${this.follow}:${this.token}`;
 private emit(){this.listeners.forEach(fn=>fn())}
 get supported(){return !!this.engine}
 private cancel(){this.token++;this.utterance=null;this.word=null;this.engine?.cancel()}
 stop=()=>{this.cancel();this.status='Idle';this.message='';this.done=undefined;this.emit()};
 play=(text:string,done?:()=>void)=>this.playSentences(segmentText(text),0,false,done);
 playSentences=(segments:string[],index=0,single=false,done?:()=>void)=>{
  this.cancel();this.segments=segments;this.index=index;this.single=single;this.done=done;this.message='';
  if(!this.engine){this.fail('Read Aloud is unavailable in this browser.');return}
  if(!segments[index]){this.stop();return}this.say();
 };
 continueReading=()=>{this.single=false;this.cancel();this.message='';if(this.index>=this.segments.length)this.index=0;if(this.segments[this.index])this.say()};
 selectSentence=(index:number)=>this.playSentences(this.segments,index,true,this.done);
 navigate=(direction:number)=>{
  if(!this.segments.length)return;
  this.index=Math.max(0,Math.min(this.segments.length-1,this.index+direction));this.cancel();this.message='';this.say();
 };
 private fail(message:string){this.cancel();this.status='Error';this.message=message;this.done=undefined;this.emit()}
 private say(){
  if(!this.engine)return;
  const token=++this.token;this.word=null;
  try {
   // Fresh utterances avoid the native pause/resume deadlock on mobile devices.
   this.engine.resume();
   const text=this.segments[this.index],u=this.create(text);this.utterance=u;u.rate=this.preferences.rate;u.volume=this.preferences.volume??1;
   const voices=this.engine.getVoices();const voice=voices.find(v=>v.voiceURI===this.preferences.voiceURI)||voices.find(v=>v.lang==='en-ZA')||voices.find(v=>v.lang.startsWith('en'));
   if(voice)u.voice=voice;u.lang=voice?.lang||'en-ZA';
   let lastIndex=-1,reliable=true;
   u.onboundary=e=>{
    if(token!==this.token||this.status!=='Speaking'||e.name!=='word'||!reliable)return;
    const word=boundaryWord(text,e.charIndex,e.charLength??0,e.name);
    if(!word||e.charIndex<lastIndex){reliable=false;this.word=null}else{lastIndex=e.charIndex;this.word=word}
    this.emit();
   };
   u.onend=()=>{
    if(token!==this.token||this.status!=='Speaking')return;
    this.utterance=null;this.word=null;
    if(this.single){this.status='Paused';this.message='Sentence finished. Play continues from this sentence.';this.emit();return}
    if(++this.index<this.segments.length)this.say();
    else{this.status='Finished';this.emit();const done=this.done;this.done=undefined;done?.()}
   };
   u.onerror=e=>{if(token===this.token)this.fail(`Speech could not continue (${e.error}). Try Play or choose another device voice.`)};
   this.status='Speaking';this.emit();this.engine.speak(u);
  }catch{this.fail('Speech could not start. Choose another device voice and try Play.')}
 }
 pause=()=>{if(this.status!=='Speaking')return;this.cancel();this.status='Paused';this.message='Play repeats the current sentence and continues reading.';this.emit()};
 resume=()=>{if(this.status!=='Paused'&&this.status!=='Error')return;if(this.index<this.segments.length){this.message='';this.say()}};
 restart=()=>{if(this.segments.length)this.playSentences(this.segments,0,false,this.done)};
 setFollow=(follow:boolean,persist=true)=>{this.follow=follow;if(persist)this.configure({follow});else this.emit()};
 toggleMute=()=>this.configure({volume:(this.preferences.volume??1)>0?0:this.preferences.lastVolume??1});
 configure=(patch:Partial<Preferences>)=>{
  if(this.status==='Speaking'&&(patch.rate!==undefined||patch.voiceURI!==undefined))this.pause();
  if(patch.volume!==undefined){patch={...patch,volume:Math.max(0,Math.min(1,patch.volume))};if((patch.volume??0)>0)patch.lastVolume=patch.volume;else if((this.preferences.volume??1)>0)patch.lastVolume=this.preferences.volume??1}
  this.preferences={...this.preferences,...patch};if(patch.follow!==undefined)this.follow=patch.follow;
  try{this.storage?.setItem(preferenceKey,JSON.stringify(this.preferences))}catch{/* Storage may be disabled. */}
  if(this.status==='Paused'&&(patch.rate!==undefined||patch.voiceURI!==undefined))this.message='Settings updated. Play repeats the current sentence with the new settings.';
  this.emit();
 };
}
