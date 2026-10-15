import type { Profile } from './types';
interface RawProfile {
  id:string;name:string;
  skins?:Array<{id?:string;url:string;variant?:string;state?:string}>;
  capes?:Array<{id:string;alias?:string;url:string;state?:string}>;
}
// Mojang also returns legacy HTTP texture URLs. The renderer only permits HTTPS.
export function minecraftTextureUrl(value:string):string {
  try {const url=new URL(value);if(url.hostname==='textures.minecraft.net'&&!url.username&&!url.password&&!url.port&&/^\/texture\/[a-f0-9]+$/i.test(url.pathname)&&(url.protocol==='http:'||url.protocol==='https:')){url.protocol='https:';return url.href;}}catch{}
  return value;
}
export function publicMinecraftProfile(raw:RawProfile):Profile {
  const skins=raw.skins??[];
  const active=skins.filter(s=>s.state?.toUpperCase()==='ACTIVE');
  const selected=active.length?active:skins.filter(s=>!s.state);
  return {id:raw.id,name:raw.name,skins:selected.map(s=>({id:s.id,url:minecraftTextureUrl(s.url),variant:s.variant})),capes:(raw.capes??[]).map(c=>({id:c.id,alias:c.alias,url:minecraftTextureUrl(c.url),state:c.state}))};
}
