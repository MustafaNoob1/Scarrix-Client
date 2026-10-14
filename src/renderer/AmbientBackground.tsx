import React from 'react';
import './backgrounds.css';
export const backgrounds = [
  { id: 'aurora', name: 'Scarrix Aurora', detail: 'Plasma, Lichtspuren und Funken', icon: '〰' },
  { id: 'stars', name: 'Sternenfeld', detail: 'Sternenflug mit Meteoren', icon: '✦' },
  { id: 'nebula', name: 'Scarrix Nebula', detail: 'Rotierende Nebel und ein Lichtkern', icon: '◉' },
  { id: 'embers', name: 'Crimson Forge', detail: 'Glühende Funken über dunkler Lava', icon: '✦' },
  { id: 'matrix', name: 'Scarrix Codefall', detail: 'Leuchtender digitaler Zeichenregen', icon: '▦' },
  { id: 'horizon', name: 'Neon Horizon', detail: 'Neon-Sonne über einem bewegten Raster', icon: '◈' },
  { id: 'grid', name: 'Digitales Raster', detail: 'Neon-Raster mit Scanwelle', icon: '▦' },
  { id: 'glow', name: 'Soft Glow', detail: 'Ruhiges Licht', icon: '◌' },
  { id: 'plain', name: 'Schlicht', detail: 'Ohne Effekte', icon: '■' }
] as const;
export function AmbientBackground({ mode, animated, motion }: { mode: string; animated: boolean; motion: 'on'|'off'|'system' }) {
  return <div className={'ambient-background ambient-' + mode} data-running={animated} data-motion={motion} aria-hidden="true">
    <div className="ambient-wash"/><div className="ambient-ribbon ribbon-a"/><div className="ambient-ribbon ribbon-b"/><div className="ambient-ribbon ribbon-c"/>
    <div className="ambient-grid-lines"/>
    {mode!=='plain'&&<><div className="ambient-orbit orbit-one"/><div className="ambient-orbit orbit-two"/><div className="ambient-scan"/></>}
    {(mode==='aurora'||mode==='stars'||mode==='embers')&&<div className="ambient-sparks">{Array.from({length:28},(_,i)=><i key={i} style={{left:((i*43+5)%100)+'%',top:((i*31+13)%100)+'%',animationDelay:(-i*.43)+'s',animationDuration:(3+i%5*.55)+'s','--spark-size':(1+i%3)+'px'} as React.CSSProperties}/>)}</div>}
    {mode==='nebula'&&<div className="nebula-system"><div className="nebula-cloud"/><div className="nebula-core"/><div className="nebula-ring"/></div>}
    {mode==='matrix'&&<div className="codefall">{Array.from({length:22},(_,i)=><i key={i} style={{left:((i*47)%100)+'%',animationDelay:(-i*1.9)+'s',animationDuration:(8+i%6)+'s',opacity:.1+(i%4)*.04}}>{Array.from({length:16},(_,n)=>'SCARRIX01アイウエオ'[((n*7+i*3)%14)]).join('\n')}</i>)}</div>}
    {mode==='horizon'&&<><div className="horizon-sun"/><div className="horizon-plane"><div/></div></>}
    {mode==='stars'&&<div className="ambient-meteors">{Array.from({length:5},(_,i)=><i key={i} style={{left:(15+i*19)+'%',top:(i*13)+'%',animationDelay:(-i*1.7)+'s',animationDuration:(4+i*.7)+'s'}}/>)}</div>}
    {mode === 'stars' && <div className="ambient-stars">{Array.from({length:40},(_,i)=><i key={i} style={{left:((i*37+11)%100)+'%',top:((i*23+7)%100)+'%',animationDelay:(-i*.7)+'s',animationDuration:(3+i%4)+'s',opacity:.2+(i%5)*.12}}/>)}</div>}
    <div className="ambient-vignette"/>
  </div>;
}
