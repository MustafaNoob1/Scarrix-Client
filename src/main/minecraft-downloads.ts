import { Agent, interceptors } from 'undici';

// Use the maintained stream downloader with bounded connections and finite
// retries. In particular, raw Electron socket resets must not abort installation.
export const MINECRAFT_DOWNLOAD_CONNECTIONS = 8;
export function createMinecraftDownloads() {
  return {dispatcher:new Agent({
    connections:MINECRAFT_DOWNLOAD_CONNECTIONS,pipelining:1,
    connect:{timeout:30000,autoSelectFamily:true,autoSelectFamilyAttemptTimeout:250},
    headersTimeout:60000,bodyTimeout:60000
  }).compose(interceptors.retry({maxRetries:3,minTimeout:1000,maxTimeout:5000}),interceptors.redirect({maxRedirections:2}))};
}
export const minecraftDownloads=createMinecraftDownloads();
const metadataFetch:typeof fetch=(input,init)=>fetch(input,{...init,signal:init?.signal?AbortSignal.any([init.signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000)});
export const minecraftRequests={dispatcher:minecraftDownloads.dispatcher,fetch:metadataFetch};
