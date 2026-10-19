import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import {contentScrollContainer,focusReadingHeading,readRoute,routeHash} from '../src/contentNavigation';
const win=new Window();
Object.assign(globalThis,{window:win,document:win.document,getComputedStyle:win.getComputedStyle.bind(win)});
test('stable card URLs identify valid cards and ignore invalid routes',()=>{
 assert.equal(routeHash({page:'q1',index:2}),'#q1/q1-school');
 assert.deepEqual(readRoute('#q1/q1-school'),{page:'q1',index:2});
 assert.deepEqual(readRoute('#revision'),{page:'later'});assert.deepEqual(readRoute('#overview'),{page:'home'});
 assert.equal(readRoute('#q1/not-a-card'),null);
});
test('heading scroll measures sticky header, focuses without scrolling twice and respects reduced motion',()=>{
 document.body.innerHTML='<header class="lf-header"></header><main><h2 tabindex="-1">Card heading</h2></main>';
 const heading=document.querySelector('h2')!,header=document.querySelector('header')!,scrolls:any[]=[],focuses:any[]=[];
 header.getBoundingClientRect=()=>({bottom:82} as any);heading.getBoundingClientRect=()=>({top:640} as any);
 heading.focus=(options:any)=>{focuses.push(options)};win.scrollBy=(options:any)=>{scrolls.push(options)};
 for(const reduced of [false,true]){
  win.matchMedia=(()=>({matches:reduced})) as any;focusReadingHeading(heading as any);
  assert.deepEqual(scrolls.at(-1),{top:534,behavior:reduced?'instant':'smooth'});
 }
 assert.deepEqual(focuses,[{preventScroll:true},{preventScroll:true}]);assert.equal(scrolls.length,2);
});
test('nested reading scrollport is used instead of window or sibling sidebar',()=>{
 document.body.innerHTML='<header class="lf-header"></header><aside style="overflow-y:auto"></aside><main style="overflow-y:auto"><h2 tabindex="-1">Heading</h2></main>';
 const heading=document.querySelector('h2')!,port=document.querySelector('main')!,scrolls:any[]=[];
 Object.defineProperties(port,{scrollHeight:{value:900},clientHeight:{value:300},clientTop:{value:2}});
 document.querySelector('header')!.getBoundingClientRect=()=>({bottom:68} as any);
 port.getBoundingClientRect=()=>({top:150} as any);heading.getBoundingClientRect=()=>({top:480} as any);
 port.scrollBy=(options:any)=>{scrolls.push(options)};win.scrollBy=()=>{throw Error('Wrong scrollport')};
 assert.equal(contentScrollContainer(heading as any),port);focusReadingHeading(heading as any);
 assert.deepEqual(scrolls,[{top:304,behavior:'instant'}]);
});
test('polish effects have explicit reduced-motion overrides and stable heading entrances',()=>{
 const css=readFileSync(new URL('../src/interactivePolish.css',import.meta.url),'utf8');
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/animation:none!important/);
 assert.match(css,/@keyframes reading-panel-enter\{from\{opacity:/);
 assert.match(css,/@keyframes learning-success/);assert.match(css,/@keyframes learning-revisit/);
});
