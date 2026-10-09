const {spawnSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
// Next and Vinext share the generated types directory. Refresh before checking.
for(const [entry,args] of [['next/dist/bin/next',['typegen']],['typescript/bin/tsc',['--noEmit']]]){
 const result=spawnSync(process.execPath,[require.resolve(entry),...args],{cwd:root,stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}
