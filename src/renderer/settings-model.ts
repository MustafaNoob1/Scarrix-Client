import type {Language} from '../main/languages';
import {translate} from './translations';
export const settingGroups=[
 {id:'general',label:'Allgemein',icon:'⚙',items:[{id:'language',label:'Sprache',keywords:'language deutsch english polski français italiano türkçe português'},{id:'accent',label:'Akzentfarbe',keywords:'farbe color theme rot blau lila gold darstellung appearance aparencia apparence wyglad aspetto gorunum'},{id:'behavior',label:'Verhalten',keywords:'discord konto microsoft anmeldung remember rotation animation'},{id:'interface',label:'Downloads & Oberfläche',keywords:'news neuigkeiten skin größe profil start shortcut tastenkürzel'}]},
 {id:'background',label:'Hintergrund',icon:'◈',items:[{id:'background',label:'Animierter Hintergrund',keywords:'background aurora nebula stars matrix horizon bewegung motion'}]},
 {id:'advanced',label:'Erweitert',icon:'▧',items:[{id:'java',label:'Java',keywords:'runtime laufzeit installation java ram speicher memory'},{id:'updates',label:'Launcher-Updates',keywords:'updates download patch version restart neustart'}]},
 {id:'debug',label:'Debug',icon:'⚠',items:[{id:'diagnostics',label:'Fehlerdiagnose',keywords:'logs crash absturz bericht diagnose'},{id:'about',label:'Über Scarrix Client',keywords:'about version info support lizenz'}]}
] as const;
export type SettingId=typeof settingGroups[number]['items'][number]['id'];
const fold=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function searchSettings(query:string,language:Language){const tokens=fold(query).trim().split(/\s+/).filter(Boolean);return settingGroups.flatMap(g=>g.items.map(i=>({...i,group:g.label}))).filter(i=>tokens.every(token=>fold([i.label,translate(language,i.label),i.group,translate(language,i.group),i.keywords].join(' ')).includes(token)));}
