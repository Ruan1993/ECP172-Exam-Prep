import type{Progress}from'./types';
const KEY='ecp172-progress-v1';
export const empty:Progress={reviewed:[],cards:{},quiz:{},written:{},mocks:[],drafts:{},confidence:{}};
export function load(){try{const old=JSON.parse(localStorage.getItem(KEY)||'{}');return{...empty,...old,drafts:old.drafts||{},confidence:old.confidence||{}}as Progress}catch{return{...empty}}}
export function save(p:Progress){localStorage.setItem(KEY,JSON.stringify(p))}
