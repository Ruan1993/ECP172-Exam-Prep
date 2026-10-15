import { useRef, useState } from 'react';
import { Download, HardDriveDownload, Upload, X } from 'lucide-react';
const KEY='ecp172-learn-first-v1';
type Backup={version:number;kind:string;ratings:Record<string,'understood'|'later'>;position:Record<string,number>;lastQuestion:string};
function validate(data:unknown):data is Backup{
 if(!data||typeof data!=='object')return false;
 const obj=data as Record<string,unknown>;
 if(obj.version!==1||obj.kind!=='ECP172 Learn First'||!obj.ratings||typeof obj.ratings!=='object'||!obj.position||typeof obj.position!=='object')return false;
 return Object.values(obj.ratings).every(v=>v==='understood'||v==='later');
}
export function ReadingProgressTransfer(){
 const [open,setOpen]=useState(false);const [error,setError]=useState('');const [pending,setPending]=useState<Backup|null>(null);const input=useRef<HTMLInputElement|null>(null);
 const download=async()=>{
  setError('');const progress=JSON.parse(localStorage.getItem(KEY)||'null');
  if(!progress){setError('No reading progress has been saved yet.');return}
  const backup={version:1,kind:'ECP172 Learn First',exportedAt:new Date().toISOString(),...progress};
  const file=new File([JSON.stringify(backup,null,2)],'ecp172-learn-first-progress.json',{type:'application/json'});
  if(navigator.share&&navigator.canShare?.({files:[file]})){
   try{await navigator.share({files:[file],title:'ECP172 reading progress'});return}catch(e){if(e instanceof DOMException&&e.name==='AbortError')return}
  }
  const link=URL.createObjectURL(file);const a=document.createElement('a');a.href=link;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(link),1000)
 };
 const read=async(e:React.ChangeEvent<HTMLInputElement>)=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  try{if(file.size>1024*1024)throw Error('That file is too large for a progress backup.');const data=JSON.parse(await file.text());if(!validate(data))throw Error('This is not a valid ECP172 Learn First backup.');setPending(data);setError('')}
  catch(e){setError(e instanceof Error?e.message:'Unable to read backup.')}
 };
 const restore=()=>{if(!pending)return;const {ratings,position,lastQuestion}=pending;localStorage.setItem(KEY,JSON.stringify({ratings,position,lastQuestion}));window.location.reload()};
 return <><button className="lf-backup-trigger" onClick={()=>setOpen(true)} aria-label="Back up or restore reading progress" title="Back up reading progress"><HardDriveDownload/><span>Backup</span></button>
 {open&&<div className="lf-overlay" onMouseDown={e=>{if(e.target===e.currentTarget){setOpen(false);setPending(null)}}} role="presentation"><section className="lf-dialog lf-backup-dialog" role="dialog" aria-modal="true" aria-label="Reading progress backup"><button className="lf-dialog-close" onClick={()=>{setOpen(false);setPending(null)}} aria-label="Close"><X size={19}/></button><h2>Take your progress with you</h2><p>Your reading choices stay on this device unless you save a file and restore it elsewhere. No account or Google Drive connection is required.</p><div className="lf-backup-actions"><button className="lf-primary" onClick={download}><Download size={17}/> Save a backup</button><button onClick={()=>input.current?.click()}><Upload size={17}/> Restore a backup</button></div><input ref={input} type="file" accept=".json,application/json" onChange={read} style={{display:'none'}}/>
 {error&&<p role="alert" className="lf-transfer-error">{error}</p>}
 {pending&&<div className="lf-restore-confirm"><p><strong>Replace current reading choices?</strong> Any current “understood” and “revise later” choices will be replaced by this backup. Your old quiz/exam progress is unaffected.</p><div><button className="lf-primary" onClick={restore}>Yes, restore the backup</button><button onClick={()=>setPending(null)}>Cancel</button></div></div>}
 </section></div>}
 </>
}
