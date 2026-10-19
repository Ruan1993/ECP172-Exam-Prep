import type {SpokenWord} from './speech';

const expansions:Record<string,string>={LoLT:'Language of Learning and Teaching',LiEP:'Language in Education Policy',LAC:'Language Across the Curriculum',SIAS:'Screening, Identification, Assessment and Support',SBST:'school-based support team',DBST:'district-based support team',SASA:'South African Schools Act',SACE:'South African Council for Educators',BELA:'Basic Education Laws Amendment',PGCE:'Postgraduate Certificate in Education'};

// Spoken UTF-16 offsets map back to visible source spans, including expansions.
export function normaliseSpeech(source:string){
 let text='';const offsets:(SpokenWord|null)[]=[];
 const append=(value:string,start:number,end:number,exact=false)=>{text+=value;for(let i=0;i<value.length;i++)offsets.push(exact?{start:start+i,end:start+i+1}:start===end?null:{start,end})};
 const belief=/belief\s*→\s*attitude\s*→\s*behaviour/i;
 if(belief.test(source))return {text:source.replace(belief,'Belief leads to attitude, which can influence behaviour'),mapWord:(_word:SpokenWord):SpokenWord|null=>null};
 const pattern=/\b(?:LoLT|LiEP|LAC|SIAS|SBST|DBST|SASA|SACE|BELA|PGCE)\b|\bQuestion\b(?=\s*→)|→|⇒|&|=|\+|%|\s[—–]\s|\b(?:e\.g\.|i\.e\.)/g;
 let cursor=0;
 for(const match of source.matchAll(pattern)){
  const start=match.index!,token=match[0];append(source.slice(cursor,start),cursor,start,true);
  const alreadyExplained=expansions[token]&&source.slice(start+token.length).replace(/^[\s—–:()-]+/,'').toLowerCase().startsWith(expansions[token].toLowerCase());
  const replacement=(alreadyExplained?token.toUpperCase().split('').join(' '):expansions[token])??({'Question':'research question','→':', followed by ','⇒':', therefore ','&':' and ','=':' means ','+':' plus ','%':' per cent','e.g.':'for example','i.e.':'that is'}[token]??'. ');
  append(replacement,start,/^[→⇒]$/.test(token)?start:start+token.length);cursor=start+token.length;
 }
 append(source.slice(cursor),cursor,source.length,true);
 return {text,mapWord:(word:SpokenWord):SpokenWord|null=>{const mapped=offsets.slice(word.start,word.end);if(!mapped.length||mapped.some(x=>!x))return null;return {start:mapped[0]!.start,end:mapped.at(-1)!.end}}};
}
