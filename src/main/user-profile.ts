import type { Profile } from './types';
interface RawProfile {
  id:string;name:string;
  skins?:Array<{id?:string;url:string;variant?:string;state?:string}>;
  capes?:Array<{id:string;alias?:string;url:string;state?:string}>;
}
export function publicMinecraftProfile(raw:RawProfile):Profile {
  const skins=raw.skins??[];
  const active=skins.filter(s=>s.state?.toUpperCase()==='ACTIVE');
  const selected=active.length?active:skins.filter(s=>!s.state);
  return {id:raw.id,name:raw.name,skins:selected.map(s=>({id:s.id,url:s.url,variant:s.variant})),capes:(raw.capes??[]).map(c=>({id:c.id,alias:c.alias,url:c.url,state:c.state}))};
}
