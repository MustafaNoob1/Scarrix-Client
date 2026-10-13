import { getConfig } from './config';
export async function serverStatus(): Promise<{ online: boolean; players: number | null; maxPlayers: number | null; version: string | null }> {
  const s = getConfig().server;
  const address = encodeURIComponent(`${s.address}:${s.port}`);
  const res = await fetch(`https://api.mcstatus.io/v2/status/java/${address}?query=false`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Statusabfrage fehlgeschlagen: HTTP ${res.status}`);
  const data: any = await res.json();
  return {
    online: !!data.online,
    players: typeof data.players?.online === 'number' ? data.players.online : null,
    maxPlayers: typeof data.players?.max === 'number' ? data.players.max : null,
    version: typeof data.version?.name_clean === 'string' ? data.version.name_clean : null
  };
}
