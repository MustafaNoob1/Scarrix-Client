import fs from 'node:fs';
import path from 'node:path';

export function selectFabricLoader<T extends {loader:{version:string;stable?:boolean}}>(loaders:T[],pinned?:string):T|undefined {
  return pinned?loaders.find(item=>item.loader.version===pinned):(loaders.find(item=>item.loader.stable)??loaders[0]);
}

// New unobfuscated Minecraft versions advertise intermediary 0.0.0. The official
// launch profile contains the real inheritance and required JVM arguments.
export async function installFabricProfile(version:string,loader:string,root:string):Promise<string> {
  if(!/^\d[\w.+-]{0,60}$/.test(version)||!/^\d[\w.+-]{0,60}$/.test(loader))throw Error('Ungültige Minecraft-/Fabric-Version.');
  const url=`https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(version)}/${encodeURIComponent(loader)}/profile/json`;
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});
  if(!response.ok||!response.body)throw Error('Offizielles Fabric-Startprofil nicht erreichbar (HTTP '+response.status+').');
  const chunks:Buffer[]=[];let size=0;
  for await(const chunk of response.body as any){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>1024*1024)throw Error('Fabric-Startprofil ist zu groß.');chunks.push(bytes);}
  const profile=JSON.parse(Buffer.concat(chunks).toString('utf8')),id=`fabric-loader-${loader}-${version}`;
  if(profile.id!==id||profile.inheritsFrom!==version||!/^net\.fabricmc\.loader\.(?:impl\.)?launch\.knot\.KnotClient$/.test(profile.mainClass)||!Array.isArray(profile.libraries)||!profile.libraries.length||profile.libraries.length>100)throw Error('Ungültiges offizielles Fabric-Startprofil.');
  for(const library of profile.libraries){
    if(typeof library.name!=='string'||!/^[\w.-]+:[\w.-]+:[\w.+-]+(?::[\w.-]+)?$/.test(library.name))throw Error('Ungültige Fabric-Bibliothek.');
    const source=new URL(library.url);
    if(source.protocol!=='https:'||source.hostname!=='maven.fabricmc.net'||source.username||source.password||source.port||source.pathname!=='/'||source.search||source.hash)throw Error('Unbekannte Fabric-Downloadquelle.');
  }
  const folder=path.join(root,'versions',id);fs.mkdirSync(folder,{recursive:true});
  const file=path.join(folder,id+'.json');fs.writeFileSync(file+'.tmp',JSON.stringify(profile));fs.renameSync(file+'.tmp',file);
  return id;
}
