const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const secrets=['TMDB_API_KEY','TMDB_READ_ACCESS_TOKEN'].map(name=>process.env[name]?.trim()).filter(Boolean);
if(!secrets.length)throw new Error('Configure a credencial no ambiente antes da verificação.');
let checked=0;const findings=[];
function scan(folder){
 for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
  const file=path.join(folder,entry.name);
  if(entry.isDirectory())scan(file);
  else if(entry.isFile()){
   checked++;const bytes=fs.readFileSync(file);
   if(secrets.some(secret=>bytes.includes(Buffer.from(secret))))findings.push(path.relative(root,file));
  }
 }
}
const artifact=path.join(root,'dist');
if(!fs.existsSync(artifact))throw new Error('Gere o build antes da verificação.');
scan(artifact);
console.log(JSON.stringify({status:findings.length?'failed':'approved',filesChecked:checked,filesWithCredentials:findings},null,2));
if(findings.length)process.exitCode=1;
