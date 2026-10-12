export const EXAM_YEAR=2026,EXAM_MONTH=9,EXAM_DAY=21;
export const examStartLocal=()=>new Date(EXAM_YEAR,EXAM_MONTH,EXAM_DAY,0,0,0,0);
export interface TimeParts{days:number;hours:number;minutes:number;seconds:number;complete:boolean;totalMs:number}
export function splitTime(targetMs:number,nowMs:number):TimeParts{const totalMs=Math.max(0,targetMs-nowMs),whole=Math.floor(totalMs/1000);return{days:Math.floor(whole/86400),hours:Math.floor(whole%86400/3600),minutes:Math.floor(whole%3600/60),seconds:whole%60,complete:targetMs<=nowMs,totalMs}}
export type TimerStatus='idle'|'running'|'paused'|'complete';
export interface TimerState{durationMs:number;remainingMs:number;endAt:number|null;status:TimerStatus}
export const timerRemaining=(timer:TimerState,now:number)=>timer.status==='running'&&timer.endAt!==null?Math.max(0,timer.endAt-now):Math.max(0,timer.remainingMs);
export const startTimer=(durationMs:number,now:number):TimerState=>({durationMs,remainingMs:durationMs,endAt:now+durationMs,status:'running'});
export const pauseTimer=(timer:TimerState,now:number):TimerState=>{const remainingMs=timerRemaining(timer,now);return{...timer,remainingMs,endAt:null,status:remainingMs===0?'complete':'paused'}};
export const resumeTimer=(timer:TimerState,now:number):TimerState=>timer.remainingMs<=0?{...timer,status:'complete',endAt:null}:{...timer,endAt:now+timer.remainingMs,status:'running'};
export const resetTimer=(durationMs:number):TimerState=>({durationMs,remainingMs:durationMs,endAt:null,status:'idle'});
export const formatClock=(milliseconds:number)=>{const seconds=Math.ceil(Math.max(0,milliseconds)/1000),minutes=Math.floor(seconds/60);return`${String(minutes).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`};
