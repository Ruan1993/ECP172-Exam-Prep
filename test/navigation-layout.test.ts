import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const styles=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const redesign=readFileSync(new URL('../src/redesign.css',import.meta.url),'utf8');

test('mobile activity navigation is restored to normal document flow',()=>{
 assert.match(styles,/main nav\{position:static;inset:auto;display:flex;background:transparent;padding:0;box-shadow:none\}/);
});

test('Discover previous and next controls remain side by side on mobile',()=>{
 assert.match(redesign,/\.lessonbuttons\{flex-direction:row\}/);
 assert.match(redesign,/\.guided-actions\{grid-template-columns:1fr 1fr!important\}/);
});
