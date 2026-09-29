import type{Progress}from'./types';
const KEY='ecp172-progress-v1';export const empty:Progress={reviewed:[],cards:{},quiz:{},written:{},mocks:[]};
export function load(){try{return{...empty,...JSON.parse(localStorage.getItem(KEY)||'{}')}as Progress}catch{return empty}}
export function save(p:Progress){localStorage.setItem(KEY,JSON.stringify(p))}
