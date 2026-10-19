import {revisionBank} from './revisionBank';
import type {Question,Rating,ReadingState} from './readingProgress';

export function revisionPriority(id:string,state:ReadingState){
 const question=revisionBank.find(q=>q.id===id)!;
 const rating=state.revision?.ratings[id];
 if(rating==='later')return 0;
 if(rating==='understood')return 3;
 return question.sourceIds.some(id=>state.ratings[id]==='later')?1:2;
}
// Order is captured on entering a section. Rating a question cannot move the
// current card underneath the learner or cause the next question to be skipped.
export const orderedRevision=(section:Question,state:ReadingState)=>revisionBank.filter(q=>q.section===section).sort((a,b)=>revisionPriority(a.id,state)-revisionPriority(b.id,state));
export const rateRevision=(state:ReadingState,id:string,rating:Rating):ReadingState=>({...state,revision:{ratings:{...state.revision?.ratings,[id]:rating}}});
