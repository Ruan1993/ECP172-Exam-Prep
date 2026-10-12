import type{Progress}from'./types';
const KEY='ecp172-progress-v1';
export const BACKUP_KIND='ecp172-study-progress';
export const empty:Progress={reviewed:[],cards:{},quiz:{},written:{},mocks:[],drafts:{},confidence:{}};
export function load(){try{const old=JSON.parse(localStorage.getItem(KEY)||'{}');return{...empty,...old,drafts:old.drafts||{},confidence:old.confidence||{}}as Progress}catch{return{...empty}}}
export function save(p:Progress){localStorage.setItem(KEY,JSON.stringify(p))}

export interface ProgressBackup{kind:typeof BACKUP_KIND;version:1;createdAt:string;progress:Progress}
const isRecord=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const hasValues=(value:unknown,valid:(item:unknown)=>boolean)=>isRecord(value)&&Object.values(value).every(valid);
const isConfidence=(value:unknown)=>value==='again'||value==='hard'||value==='got';
export function createBackup(progress:Progress):ProgressBackup{return{kind:BACKUP_KIND,version:1,createdAt:new Date().toISOString(),progress}}
export function parseBackup(value:unknown):ProgressBackup{
 if(!isRecord(value)||value.kind!==BACKUP_KIND||value.version!==1||typeof value.createdAt!=='string'||Number.isNaN(Date.parse(value.createdAt))||!isRecord(value.progress))throw new Error('This is not a valid ECP172 progress backup.');
 const p=value.progress;
 if(!Array.isArray(p.reviewed)||!p.reviewed.every(x=>typeof x==='string')||!hasValues(p.cards,isConfidence)||!hasValues(p.quiz,x=>typeof x==='boolean')||!hasValues(p.written,isConfidence)||!Array.isArray(p.mocks)||!p.mocks.every(x=>isRecord(x)&&typeof x.date==='string'&&typeof x.score==='number'&&Number.isFinite(x.score))||(p.drafts!==undefined&&!hasValues(p.drafts,x=>typeof x==='string'))||(p.confidence!==undefined&&!hasValues(p.confidence,x=>typeof x==='number'&&Number.isFinite(x))))throw new Error('The backup is damaged or has an unsupported progress format.');
 if(p.lastActivity!==undefined&&(!isRecord(p.lastActivity)||typeof p.lastActivity.page!=='string'||typeof p.lastActivity.label!=='string'||typeof p.lastActivity.at!=='string'))throw new Error('The backup contains an invalid study position.');
 return{kind:BACKUP_KIND,version:1,createdAt:value.createdAt,progress:{...empty,...p,drafts:(p.drafts||{}) as Record<string,string>,confidence:(p.confidence||{}) as Record<string,number>} as Progress};
}
