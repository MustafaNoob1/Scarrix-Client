import { getVersionList } from '@xmcl/installer';
let cached: string[] = [];
let expires = 0;
let pending: Promise<string[]> | undefined;
export async function officialVersions(): Promise<string[]> {
  if (Date.now() < expires) return cached;
  if (!pending) pending = (async () => {
    const list = (await getVersionList()).versions.filter(v => v.type === 'release').map(v => v.id);
    if (!list.length) throw new Error('Offizielle Versionsliste ist leer.');
    cached = list; expires = Date.now() + 300000; return list;
  })().finally(() => { pending = undefined; });
  return pending;
}
