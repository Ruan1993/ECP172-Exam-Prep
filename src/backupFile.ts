// Keep the selected provider-backed file attached until reading has finished.
// Start reading before querying metadata: Android cloud providers may resolve it lazily.
export async function readBackupFile(input:HTMLInputElement,maxSize?:number):Promise<string|null>{
 const file=input.files?.[0];if(!file)return null;
 try{
  const text=await new Promise<string>((resolve,reject)=>{
   const reader=new FileReader();
   reader.onload=()=>resolve(reader.result as string);
   reader.onerror=()=>reject(new Error(`Could not access the selected backup${reader.error?.name?` (${reader.error.name})`:''}. Please check your connection, then choose the file from Google Drive again. Your saved progress has not changed.`));
   reader.onabort=()=>reject(new Error('Reading the backup was interrupted. Please select it again. Your saved progress has not changed.'));
   try{reader.readAsText(file)}catch{reject(new Error('Could not open the selected backup. Please choose it from Google Drive again. Your saved progress has not changed.'))}
  });
  if(maxSize!==undefined&&file.size>maxSize)throw Error('That file is too large for a progress backup.');
  return text;
 }finally{input.value=''}
}
