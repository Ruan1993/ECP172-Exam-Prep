export type Area='Q1'|'Q2'|'Q3'|'Q4';
export type Confidence='again'|'hard'|'got';
export interface Progress{reviewed:string[];cards:Record<string,Confidence>;quiz:Record<string,boolean>;written:Record<string,Confidence>;mocks:{date:string;score:number}[]}
export interface Flashcard{id:string;area:Area;topic:string;front:string;back:string}
export interface Objective{id:string;area:Area;prompt:string;options:string[];answer:number;why:string;clue?:string}
