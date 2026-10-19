import test from 'node:test';
import assert from 'node:assert/strict';
import {readBackupFile} from '../src/backupFile';

test('provider file stays selected until read completes; metadata is checked after reading',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'FileReader');
 let reader:any,metadataReads=0;
 const file={get size(){metadataReads++;return 20},text(){throw Error('Blob.text must not be used')}};
 const input={files:[file],value:'selected-provider-file'} as unknown as HTMLInputElement;
 class Reader{
  result='{"version":1}';onload?:()=>void;
  constructor(){reader=this}
  readAsText(selected:unknown){assert.equal(selected,file);assert.equal(input.value,'selected-provider-file');assert.equal(metadataReads,0)}
 }
 Object.defineProperty(globalThis,'FileReader',{configurable:true,value:Reader});
 try{
  const pending=readBackupFile(input,1024);assert.equal(input.value,'selected-provider-file');
  reader.onload();assert.equal(await pending,'{"version":1}');assert.equal(input.value,'');assert.equal(metadataReads,1);
  input.value='selected-provider-file';metadataReads=0;const tooLarge=readBackupFile(input,10);reader.onload();await assert.rejects(tooLarge,/too large/);assert.equal(input.value,'');
 }finally{if(original)Object.defineProperty(globalThis,'FileReader',original);else Reflect.deleteProperty(globalThis,'FileReader')}
});

test('missing selection, provider failures, aborts and synchronous read failures are safe and retryable',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'FileReader');
 const input={files:[],value:''} as unknown as HTMLInputElement;
 assert.equal(await readBackupFile(input),null);
 try{
  for(const failure of ['NotFoundError','NotReadableError','SecurityError','abort','throw']){
   Object.defineProperty(globalThis,'FileReader',{configurable:true,value:class {
    error={name:failure};onerror?:()=>void;onabort?:()=>void;
    readAsText(){if(failure==='throw')throw Error('Provider failure');queueMicrotask(()=>failure==='abort'?this.onabort?.():this.onerror?.())}
   }});
   Object.assign(input,{files:[{}],value:'selected'});
   await assert.rejects(readBackupFile(input),error=>{
    assert.ok(error instanceof Error);assert.match(error.message,/select|choose/i);assert.match(error.message,/saved progress has not changed/);
    if(!['abort','throw'].includes(failure))assert.ok(error.message.includes(failure));return true;
   });
   assert.equal(input.value,'');
  }
 }finally{if(original)Object.defineProperty(globalThis,'FileReader',original);else Reflect.deleteProperty(globalThis,'FileReader')}
});
