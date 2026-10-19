import guide from './guide.json';

export type Question='q1'|'q2'|'q3'|'q4';
export type Rating='understood'|'later';
export type ReadingState={ratings:Record<string,Rating>;position:Record<Question,number>;lastQuestion:Question;revision?:{ratings:Record<string,Rating>}};
export type ReadingBackup=ReadingState&{version:number;kind:string};
export function isReadingBackup(value:unknown):value is ReadingBackup{
 const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
 const ratings=(v:unknown)=>record(v)&&Object.values(v).every(r=>r==='understood'||r==='later');
 if(!record(value)||value.version!==1||value.kind!=='ECP172 Learn First'||!ratings(value.ratings)||!record(value.position))return false;
 return value.revision===undefined||(record(value.revision)&&ratings(value.revision.ratings));
}
const sources:Record<string,string[]>={
 'q2-essentials':['q2-intro','q2-types'],
 'q2-a-intro':['q2-a1','q2-a3'],
 'q2-a-proposal':['q2-a1','q2-a2','q2-a3','q2-a4','q2-a5'],
 'q2-b-intro':['q2-b1','q2-b2'],
 'q2-b-proposal':['q2-b1','q2-b2','q2-b3','q2-b4','q2-b5'],
 'q2-final':['q2-types','q2-adapt','q2-b5'],
};
// Retain the source ratings for older backups. A merged card is understood only
// when all its source material was understood; any revision flag takes priority.
export function migrateReadingProgress(value:unknown):ReadingState{
 const v=(value&&typeof value==='object'?value:{}) as Partial<ReadingState>;
 const ratings:Record<string,Rating>={};
 for(const [id,rating] of Object.entries(v.ratings||{}))if(rating==='understood'||rating==='later')ratings[id]=rating;
 for(const [id,ids] of Object.entries(sources))if(!ratings[id]){
  if(ids.some(source=>ratings[source]==='later'))ratings[id]='later';
  else if(ids.every(source=>ratings[source]==='understood'))ratings[id]='understood';
 }
 const position={} as ReadingState['position'];
 for(const q of Object.keys(guide) as Question[]){const n=Number(v.position?.[q]);position[q]=Number.isFinite(n)?Math.max(0,Math.min(Math.floor(n),guide[q].length-1)):0;}
 const revisionRatings:Record<string,Rating>={};
 for(const [id,rating] of Object.entries(v.revision?.ratings||{}))if(rating==='understood'||rating==='later')revisionRatings[id]=rating;
 return {...(v.revision?{revision:{ratings:revisionRatings}}:{}),ratings,position,lastQuestion:v.lastQuestion&&Object.hasOwn(guide,v.lastQuestion)?v.lastQuestion:'q1'};
}

// Importing a backup made before active recall must not erase current recall ratings.
export function restoreReadingBackup(backup:unknown,current:unknown):ReadingState{
 const restored=migrateReadingProgress(backup),existing=migrateReadingProgress(current);
 return {...restored,...(!restored.revision&&existing.revision?{revision:existing.revision}:{})};
}
