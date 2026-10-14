import fs from 'node:fs';
import crypto from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {AsyncLocalStorage} from 'node:async_hooks';
const context=new AsyncLocalStorage<{signal:AbortSignal;progress:(status:DownloadStatus)=>void}>();
export function withDownloadContext<T>(signal:AbortSignal,progress:(status:DownloadStatus)=>void,action:()=>Promise<T>){return context.run({signal,progress},action);}
export function downloadSignal(timeout:number){const signal=context.getStore()?.signal;return signal?AbortSignal.any([signal,AbortSignal.timeout(timeout)]):AbortSignal.timeout(timeout);}
export function assertDownloadActive(){context.getStore()?.signal.throwIfAborted();}
export interface DownloadStatus { step: string; percent: number | null; downloaded: number; total: number | null; speed: number; remainingSeconds: number | null; completedFiles: number; state: 'working' | 'done' | 'error' }
let sink: (status: DownloadStatus) => void = () => {};
let last: DownloadStatus | null = null;
export function setDownloadSink(cb: typeof sink) { sink = cb; }
export function downloadStatus() { return last; }
export function reportDownload(status: DownloadStatus) { last = status; sink(status);context.getStore()?.progress(status); }
export function stepStatus(step: string, state: DownloadStatus['state'] = 'working') {
  reportDownload({step,state,percent:state === 'done' ? 100 : null,downloaded:0,total:null,speed:0,remainingSeconds:null,completedFiles:0});
}
export function progressReporter(step: string) {
  const started = Date.now(); let lastTime = 0;
  return (downloaded: number, total: number | null, completedFiles = 0, force = false) => {
    const now = Date.now(); if (!force && now-lastTime < 200) return; lastTime=now;
    const speed = downloaded / Math.max(.2, (now-started)/1000);
    reportDownload({step,state:'working',downloaded,total,speed,completedFiles,percent:total && total>0 ? Math.min(100,downloaded/total*100) : null,remainingSeconds:total && speed ? Math.max(0,(total-downloaded)/speed) : null});
  };
}
export async function verifiedDownload(url: string, dest: string, checksum: string, algorithm: 'sha256' | 'sha512', step: string, limit = 600*1024*1024) {
  if (new URL(url).protocol !== 'https:') throw new Error('Nur HTTPS-Downloads erlaubt.');
  const response=await fetch(url,{signal:AbortSignal.timeout(300000)});
  if (!response.ok || !response.body || new URL(response.url).protocol !== 'https:') throw new Error('Download fehlgeschlagen. Prüfe deine Internetverbindung.');
  const total=Number(response.headers.get('content-length')) || null;
  if (total && total>limit) throw new Error('Download überschreitet das Größenlimit.');
  const hash=crypto.createHash(algorithm);let bytes=0;const progress=progressReporter(step);
  const temp=dest+'.part';
  try {
    await pipeline(Readable.fromWeb(response.body as any),new Transform({transform(chunk:Buffer,_enc,cb){bytes+=chunk.length;if(bytes>limit)return cb(new Error('Download zu groß.'));hash.update(chunk);progress(bytes,total);cb(null,chunk);}}),fs.createWriteStream(temp,{flags:'wx'}));
    if (hash.digest('hex').toLowerCase() !== checksum.toLowerCase()) throw new Error('Prüfsumme stimmt nicht überein. Download wurde verworfen.');
    fs.renameSync(temp,dest);progress(bytes,total,1,true);
  } catch(e) { if(fs.existsSync(temp))fs.unlinkSync(temp);throw e; }
}
export async function runInstallerTask<T>(task: any, step: string): Promise<T> {
  const progress=progressReporter(step);let completedFiles=0;
  stepStatus(step);
  return task.startAndWait({
    onUpdate: () => progress(Math.max(0,task.progress),task.total>0 ? task.total : null,completedFiles),
    onSucceed: (child:any) => {if(child !== task && !child.children?.length)completedFiles++;},
  });
}
