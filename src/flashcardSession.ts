import {flashcardBank} from './flashcardBank';
import type {Question} from './readingProgress';
export type FlashcardFilter='all'|Question;
function shuffle<T>(items:T[],random:()=>number){
 const result=[...items];
 for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}
 return result;
}
// One finite, uniformly shuffled deck per session. Saved progress is never read.
export function createFlashcardSession(filter:FlashcardFilter,random:()=>number=Math.random){
 const cards=flashcardBank.filter(card=>filter==='all'||card.section===filter);
 return shuffle(cards,random);
}
