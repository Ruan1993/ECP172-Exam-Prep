import guide from './guide.json';
export type Page='home'|'q1'|'q2'|'q3'|'q4'|'flashcards';
export type ContentRoute={page:Page;index?:number};
export function routeHash(route:ContentRoute){
 if(route.page==='home')return '#overview';
 if(route.page==='flashcards')return '#flashcards';
 return `#${route.page}/${guide[route.page][route.index??0].id}`;
}
export function readRoute(hash:string):ContentRoute|null{
 if(hash==='#overview')return {page:'home'};
 if(hash==='#flashcards'||hash==='#revision')return {page:'flashcards'};
 for(const page of ['q1','q2','q3','q4'] as const){
  const index=guide[page].findIndex(card=>hash===`#${page}/${card.id}`);
  if(index>=0)return {page,index};
 }
 return null;
}
export function contentScrollContainer(heading:HTMLElement):HTMLElement|null{
 for(let parent=heading.parentElement;parent&&parent!==document.body&&parent!==document.documentElement;parent=parent.parentElement){
  if(/auto|scroll|overlay/.test(getComputedStyle(parent).overflowY)&&parent.scrollHeight>parent.clientHeight)return parent;
 }
 return null;
}
// Measure the reading heading and its actual scrollport. Sidebar overflow must
// never be mistaken for the sibling reading content's scroll container.
export function focusReadingHeading(heading:HTMLElement){
 const container=contentScrollContainer(heading),rect=heading.getBoundingClientRect();
 const port=container?.getBoundingClientRect(),header=document.querySelector('.lf-header')?.getBoundingClientRect();
 const top=Math.max(0,port?(port.top+container!.clientTop):0,header?.bottom??0);
 heading.focus({preventScroll:true});
 const delta=rect.top-top-24;
 const behavior=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
 if(Math.abs(delta)>1){if(container)container.scrollBy({top:delta,behavior});else window.scrollBy({top:delta,behavior})}
}
