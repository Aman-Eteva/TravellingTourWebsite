import {access,mkdir,chmod} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
const platform=process.platform==='win32'?'windows':process.platform==='darwin'?'darwin':'linux';
const arch=process.arch==='arm64'?'aarch64':'x86_64';
const asset=`pg0-${platform}-${arch}${platform==='linux'?'-gnu':''}${platform==='windows'?'.exe':''}`;
const binary=resolve(`.local/runtimes/pg0${platform==='windows'?'.exe':''}`);
await mkdir(resolve('.local/runtimes'),{recursive:true});
try{await access(binary);}catch{
 console.log('Downloading portable PostgreSQL with pgvector…');
 const response=await fetch(`https://github.com/vectorize-io/pg0/releases/download/v0.15.2/${asset}`);
 if(!response.ok||!response.body)throw new Error(`PostgreSQL download failed: ${response.status}`);
 await pipeline(Readable.fromWeb(response.body as import('node:stream/web').ReadableStream),createWriteStream(binary));
 if(platform!=='windows')await chmod(binary,0o755);
}
const child=spawn(binary,['start','--name','roamly','--port','5434','--data-dir',resolve('.local/native-postgres'),'-c','listen_addresses=127.0.0.1'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
child.stdout.on('data',(chunk:Buffer)=>process.stdout.write(chunk.toString().replace(/Password:.*\n/g,'Password: [local development credential]\n')));
child.stderr.pipe(process.stderr);

// Keep process alive so orchestrators like concurrently don't exit early
const keepAlive = setInterval(() => {}, 60000);

function cleanup() {
  clearInterval(keepAlive);
  const stop = spawn(binary, ['stop', '--name', 'roamly'], { windowsHide: true });
  stop.on('close', () => process.exit(0));
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
