export type ReadingSentence = {text:string;range:Range;nodes?:Text[];offset?:number};
const excluded='button,a,input,select,textarea,summary,[role="button"],[role="link"],[contenteditable],nav,aside,[hidden],[aria-hidden="true"],.read-aloud,.reader-player';

// Offsets use the same unmodified UTF-16 text passed to speech synthesis.
export function textRange(nodes:Text[],start:number,end:number):Range {
 const range=document.createRange();let offset=0;
 for(const node of nodes){
  const next=offset+node.length;
  if(start>=offset&&start<next)range.setStart(node,start-offset);
  if(end>offset&&end<=next)range.setEnd(node,end-offset);
  offset=next;
 }
 return range;
}
export function sentenceWordRange(sentence:ReadingSentence,start:number,end:number):Range {
 if(!sentence.nodes)return sentence.range;
 return textRange(sentence.nodes,(sentence.offset??0)+start,(sentence.offset??0)+end);
}
// Ranges leave React's DOM, selectable text and screen-reader semantics intact.
export function readingSentences(root:Element):ReadingSentence[]{
 const result:ReadingSentence[]=[];
 const blocks=Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,dt,dd,blockquote'));
 for(const block of blocks){
  if(block.closest(excluded)||block.querySelector(excluded)||blocks.some(other=>other!==block&&block.contains(other)))continue;
  if(block.closest('details:not([open])')||!block.getClientRects().length||getComputedStyle(block).visibility==='hidden')continue;
  const nodes:Text[]=[];const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){const node=walker.currentNode as Text;if(!node.parentElement?.closest(excluded))nodes.push(node)}
  const text=nodes.map(n=>n.data).join('');
  for(const part of new Intl.Segmenter('en-ZA',{granularity:'sentence'}).segment(text)){
   const start=part.index+part.segment.search(/\S/),end=part.index+part.segment.trimEnd().length;
   if(start<part.index||end<=start)continue;
   result.push({text:text.slice(start,end),range:textRange(nodes,start,end),nodes,offset:start});
  }
 }
 return result;
}
export function sentenceAtPoint(sentences:ReadingSentence[],x:number,y:number){
 return sentences.findIndex(s=>Array.from(s.range.getClientRects()).some(r=>x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom));
}
export const interactiveSentenceTarget=(target:Element)=>!!target.closest(excluded);

// Pure geometry makes scrolling testable without pretending that speech has a clock.
export function followScrollDelta(rect:{top:number;bottom:number;height:number},top:number,bottom:number):number {
 const margin=24,available=bottom-top;
 if(rect.top>=top+margin&&rect.bottom<=bottom-margin)return 0;
 return rect.top-(top+Math.max(margin,(available-Math.min(rect.height,available-margin*2))/2));
}
