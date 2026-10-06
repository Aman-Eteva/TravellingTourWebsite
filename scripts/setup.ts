import {existsSync} from 'node:fs';
import {writeFile,readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
if(!existsSync('.env')){
 const example=await readFile('.env.example','utf8');
 await writeFile('.env',example.replace('postgresql://travel:travel_local@localhost:5432/travel','postgresql://postgres:postgres@127.0.0.1:5434/postgres').replace('replace-with-a-random-string-at-least-32-characters',randomBytes(32).toString('hex')).replace('replace-with-a-different-random-string-at-least-32-characters',randomBytes(32).toString('hex')).replace('SEED_ADMIN_PASSWORD=','SEED_ADMIN_PASSWORD='+randomBytes(16).toString('base64url')).replace('SEED_CUSTOMER_PASSWORD=','SEED_CUSTOMER_PASSWORD='+randomBytes(16).toString('base64url')),{mode:0o600,flag:'wx'});
 console.log('Created local environment with generated secrets and seed passwords.');
}
for(const script of ['db:local','db:generate','db:migrate','db:seed'])await new Promise<void>((resolve,reject)=>{const child=spawn(process.platform==='win32'?'npm.cmd':'npm',['run',script],{stdio:'inherit',windowsHide:true,shell:process.platform==='win32'});child.on('exit',code=>code===0?resolve():reject(new Error(`${script} failed`)));});
console.log('Local platform ready. Run npm run dev. Seed account credentials are in your local .env.');
