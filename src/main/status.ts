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

// Direct backend pings are best-effort: an inaccessible/private port is not proof of downtime.
export async function modeStatuses(): Promise<Array<{id:string; online:boolean|null; players:number|null; maxPlayers:number|null}>> {
  const modes = getConfig().modes;
  return Promise.all(modes.map(async mode => {
    const unknown = { id: mode.id, online: null, players: null, maxPlayers: null };
    try {
      const url = `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(`${mode.address}:${mode.port}`)}?query=false`;
      const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (!res.ok) return unknown;
      const data: any = await res.json();
      if (data.online !== true) return unknown;
      return {
        id: mode.id, online: true,
        players: typeof data.players?.online === 'number' ? data.players.online : null,
        maxPlayers: typeof data.players?.max === 'number' ? data.players.max : null
      };
    } catch { return unknown; }
  }));
}
