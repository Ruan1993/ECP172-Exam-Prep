import {useEffect,useRef,useSyncExternalStore} from 'react';

export type ReaderCards={position:number;total:number;section:string;itemLabel?:'Card'|'Question';previous?:()=>void;next?:()=>void;nextLabel?:string;busy?:boolean;hidden?:boolean;play:()=>void};
let current:ReaderCards|null=null;
let owner:object|null=null;
const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(listener=>listener());
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}};
const snapshot=()=>current;
export const useReaderCards=()=>useSyncExternalStore(subscribe,snapshot,snapshot);

// The existing learning surface owns navigation and progress. The player only
// exposes its current callbacks; no card position or preference is duplicated.
export function useReaderCardNavigation(cards:ReaderCards|null){
 const identity=useRef({});
 useEffect(()=>{
  if(cards){owner=identity.current;current=cards;emit()}
  else if(owner===identity.current){owner=null;current=null;emit()}
 });
 useEffect(()=>()=>{if(owner===identity.current){owner=null;current=null;emit()}},[]);
}
