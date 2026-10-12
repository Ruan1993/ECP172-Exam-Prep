import type{Area}from'./types';
export type SavedMode='learn'|'practice'|'listen'|'recall'|'quick'|'deep';
export interface StudySession{version:1;area:Area;mode:SavedMode;card:number;updatedAt:string}
const KEY='ecp172-session-v1',areas=new Set<Area>(['Q1','Q2','Q3','Q4']),modes=new Set<SavedMode>(['learn','practice','listen','recall','quick','deep']);
export function parseSession(value:unknown):StudySession|null{if(typeof value!=='object'||value===null)return null;const x=value as Partial<StudySession>;if(x.version!==1||!areas.has(x.area as Area)||!modes.has(x.mode as SavedMode)||!Number.isInteger(x.card)||Number(x.card)<0||typeof x.updatedAt!=='string'||Number.isNaN(Date.parse(x.updatedAt)))return null;return x as StudySession}
export function loadSession(){try{return parseSession(JSON.parse(localStorage.getItem(KEY)||'null'))}catch{return null}}
export function saveSession(area:Area,mode:SavedMode,card=0){const value:StudySession={version:1,area,mode,card:Math.max(0,Math.floor(card)),updatedAt:new Date().toISOString()};localStorage.setItem(KEY,JSON.stringify(value));return value}
export function safeResumeMode(mode:SavedMode):SavedMode{return mode==='listen'?'learn':mode}
