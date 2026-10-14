import path from 'node:path';
import type {Instance} from './types';
export function validateProfileOptions(item:Instance) {
 if(item.sharedGroup!==undefined&&typeof item.sharedGroup!=='boolean')throw new Error('Gemeinsamer Ordner muss ein- oder ausgeschaltet sein.');
 for(const [name,value,max] of [['Gruppe',item.group,40],['Schnellstart-Welt',item.quickPlayWorld,80]] as const)if(value!==undefined&&(typeof value!=='string'||value.length>max||/[\x00-\x1f\x7f]/.test(value)))throw new Error(name+' ist ungültig.');
 if(item.sharedGroup&&!item.group?.trim())throw new Error('Ein gemeinsamer Ordner benötigt eine Gruppe.');
 if(item.quickPlayWorld&&(path.basename(item.quickPlayWorld)!==item.quickPlayWorld||/[\\/:]/.test(item.quickPlayWorld)||item.quickPlayWorld==='..'))throw new Error('Ungültige Schnellstart-Welt.');
 if(item.javaPath!==undefined&&(typeof item.javaPath!=='string'||item.javaPath.length>500||/[\x00-\x1f]/.test(item.javaPath)||(!path.isAbsolute(item.javaPath)&&item.javaPath!=='java')))throw new Error('Bitte einen vollständigen Java-Pfad auswählen.');
 if(item.jvmArgs!==undefined&&(!Array.isArray(item.jvmArgs)||item.jvmArgs.length>20||item.jvmArgs.some(a=>typeof a!=='string'||!/^-(?:XX:[+-](?:UseG1GC|UseZGC|UseParallelGC|UseStringDeduplication|DisableExplicitGC)|XX:(?:MaxGCPauseMillis|G1NewSizePercent|G1ReservePercent|InitiatingHeapOccupancyPercent|G1HeapRegionSize)=[0-9]{1,6}[MG]?|Dfile.encoding=UTF-8)$/.test(a))))throw new Error('Java-Argument nicht unterstützt. Erlaubt sind die angezeigten GC-Optionen und UTF-8.');
 if(item.window!==undefined&&(!item.window||!Number.isInteger(item.window.width)||!Number.isInteger(item.window.height)||item.window.width<320||item.window.width>7680||item.window.height<240||item.window.height>4320||typeof item.window.fullscreen!=='boolean'))throw new Error('Ungültige Fenstergröße (320×240 bis 7680×4320).');
 if(item.icon!==undefined&&(typeof item.icon!=='string'||item.icon.length>180000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(item.icon)))throw new Error('Ungültiges Profilbild.');
}
export function profileLaunchOptions(item:Instance){validateProfileOptions(item);return {resolution:item.window?{width:item.window.width,height:item.window.height,...(item.window.fullscreen?{fullscreen:true as const}:{})}:undefined,extraJVMArgs:item.jvmArgs?.length?item.jvmArgs:undefined,extraMCArgs:item.quickPlayWorld?['--quickPlaySingleplayer',item.quickPlayWorld]:undefined};}
