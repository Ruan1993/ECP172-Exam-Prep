export type RevisionPhase='idle'|'question'|'thinking'|'reveal'|'answer'|'between'|'moving'|'finished';
type Port={question:(done:()=>void)=>void;reveal:()=>void;answer:(done:()=>void)=>void;advance:()=>boolean;pause:()=>void;resume:()=>void;stop:()=>void};
type Clock={now:()=>number;set:(callback:()=>void,ms:number)=>unknown;clear:(id:unknown)=>void};
const clock:Clock={now:()=>Date.now(),set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id as ReturnType<typeof setTimeout>)};

// Only speech completion events advance the session. Tokens invalidate late
// utterances and timers after Repeat, Next, Stop, navigation or unmount.
export class SpokenRevision {
 phase:RevisionPhase='idle';paused=false;message='';countdown=0;
 private thinkingMs=5000;
 private listeners=new Set<()=>void>();private token=0;private timer:unknown;private deadline=0;private remaining=0;private ownSpeech=false;
 constructor(private port:Port,private time:Clock=clock){}
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn)}};
 snapshot=()=>`${this.phase}:${this.paused}:${this.message}:${this.countdown}`;
 get active(){return this.phase!=='idle'&&this.phase!=='finished'}
 get playing(){return this.active&&!this.paused}
 private emit(){this.listeners.forEach(fn=>fn())}
 private own(fn:()=>void){this.ownSpeech=true;try{fn()}finally{this.ownSpeech=false}}
 private clear(){if(this.timer!==undefined)this.time.clear(this.timer);this.timer=undefined}
 private invalidate(){this.token++;this.clear();this.own(()=>this.port.stop())}
 private read(answer=false){
  this.clear();const token=++this.token;this.phase=answer?'answer':'question';this.paused=false;this.message='';this.emit();
  this.own(()=>this.port[answer?'answer':'question'](()=>{
   if(token!==this.token||this.paused||!this.active)return;
   this.phase=answer?'between':'thinking';this.remaining=answer?1500:this.thinkingMs;this.countdown=answer?0:this.remaining/1000;this.emit();this.schedule();
  }));
 }
 private schedule(){
  this.clear();this.deadline=this.time.now()+this.remaining;const token=this.token;
  this.timer=this.time.set(()=>{
   this.timer=undefined;if(token!==this.token||this.paused)return;
   this.remaining=Math.max(0,this.deadline-this.time.now());
   this.countdown=this.phase==='thinking'?Math.ceil(this.remaining/1000):0;
   if(this.remaining>0){this.emit();this.schedule();return}
   if(this.phase==='thinking'){this.phase='reveal';this.emit();this.port.reveal()}
   else if(this.phase==='between')this.next();
  },this.phase==='thinking'?Math.min(1000,this.remaining):this.remaining);
 }
 setThinkingTime=(seconds:5|10)=>{
  this.thinkingMs=seconds*1000;
  if(this.phase==='thinking'){this.clear();this.remaining=this.thinkingMs;this.countdown=seconds;if(!this.paused)this.schedule();this.emit()}
 };
 start=()=>{this.invalidate();this.read()};
 questionReady=()=>{if(this.phase==='moving')this.read()};
 answerReady=()=>{if(this.phase==='reveal'&&!this.paused)this.read(true)};
 pause=()=>{
  if(!this.playing)return;
  if(this.timer!==undefined){this.remaining=Math.max(0,this.deadline-this.time.now());this.clear()}
  this.paused=true;this.own(()=>this.port.pause());this.emit();
 };
 play=()=>{
  if(!this.active){this.start();return}if(!this.paused)return;
  this.paused=false;this.message='';this.emit();
  if(this.phase==='thinking'||this.phase==='between')this.schedule();
  else if(this.phase==='reveal')this.answerReady();
  else if(this.phase==='question'||this.phase==='answer')this.own(()=>this.port.resume());
 };
 repeat=()=>{this.invalidate();this.read()};
 next=()=>{
  this.invalidate();this.paused=false;this.message='';this.phase='moving';this.emit();
  if(!this.port.advance()){this.phase='finished';this.emit()}
 };
 stop=()=>{this.invalidate();this.phase='idle';this.paused=false;this.message='';this.emit()};
 speechChanged=(status:string,message='')=>{
  if((this.ownSpeech&&status!=='Error')||!this.active)return;
  if(status==='Idle'){this.stop();return}
  if(status==='Error'){
   this.pause();this.message=message||'Speech could not continue. Tap Play to retry.';this.emit();return;
  }
  if(this.phase==='question'||this.phase==='answer'){
   if(status==='Paused')this.pause();
   // Also respect Play in the shared player after a settings-induced pause.
   if(status==='Speaking'&&this.paused){this.paused=false;this.emit()}
  }
 };
 retry=()=>{if(this.phase==='answer')this.read(true);else this.read()};
}
