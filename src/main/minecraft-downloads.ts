import { Agent } from 'undici';
import { DownloadAgent, resolveAgent } from '@xmcl/file-transfer';

// The SDK starts every asset task at once. Bound the real transport, including
// ranged requests and retries, rather than relying on its unused concurrency flags.
export const MINECRAFT_DOWNLOAD_CONNECTIONS = 8;
class LimitedDownloads extends DownloadAgent {
  private active = 0;
  private waiting: Array<()=>void> = [];
  override async dispatch(...args: Parameters<DownloadAgent['dispatch']>) {
    if(this.active >= MINECRAFT_DOWNLOAD_CONNECTIONS) await new Promise<void>(resolve=>this.waiting.push(resolve));
    else this.active++;
    try { await super.dispatch(...args); }
    finally { const next=this.waiting.shift();if(next)next();else this.active--; }
  }
}
export function createMinecraftDownloads() {
  const base=resolveAgent({ dispatcher: new Agent({
    connections: MINECRAFT_DOWNLOAD_CONNECTIONS, pipelining: 1,
    connect: { timeout: 30000, autoSelectFamily: true, autoSelectFamilyAttemptTimeout: 250 },
    headersTimeout: 60000, bodyTimeout: 60000
  }) });
  return {agent:new LimitedDownloads(base.retryHandler,base.rangePolicy,base.dispatcher,base.checkpointHandler)};
}
export const minecraftDownloads = createMinecraftDownloads();

export const minecraftRequests = {dispatcher: minecraftDownloads.agent.dispatcher};
