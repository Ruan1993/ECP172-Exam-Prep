export type ReadingSentence = {text:string; range:Range};
const excluded='button,a,input,select,textarea,summary,[role="button"],[role="link"],[contenteditable],nav,aside,[hidden],[aria-hidden="true"],.read-aloud';
// Ranges leave React's DOM, text selection and screen-reader semantics intact.
export function readingSentences(root:Element):ReadingSentence[]{
 const result:ReadingSentence[]=[];
 const blocks=Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,dt,dd,blockquote'));
 for(const block of blocks){
  if(block.closest(excluded)||block.querySelector(excluded)||blocks.some(other=>other!==block&&block.contains(other)))continue;
  if(!block.getClientRects().length||getComputedStyle(block).visibility==='hidden')continue;
  const nodes:Text[]=[];const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){const node=walker.currentNode as Text;if(!node.parentElement?.closest(excluded))nodes.push(node)}
  const text=nodes.map(n=>n.data).join('');
  for(const part of new Intl.Segmenter('en-ZA',{granularity:'sentence'}).segment(text)){
   const start=part.index+part.segment.search(/\S/),end=part.index+part.segment.trimEnd().length;
   if(start<part.index||end<=start)continue;
   const range=document.createRange();let offset=0;
   for(const node of nodes){const next=offset+node.length;if(start>=offset&&start<next)range.setStart(node,start-offset);if(end>offset&&end<=next)range.setEnd(node,end-offset);offset=next}
   result.push({text:text.slice(start,end),range});
  }
 }
 return result;
}
export function sentenceAtPoint(sentences:ReadingSentence[],x:number,y:number){
 return sentences.findIndex(s=>Array.from(s.range.getClientRects()).some(r=>x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom));
}
export const interactiveSentenceTarget=(target:Element)=>!!target.closest(excluded);
