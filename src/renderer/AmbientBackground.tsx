import React from 'react';
export const backgrounds = [
  { id: 'aurora', name: 'Scarrix Aurora', detail: 'Fließende Lichtbänder', icon: '〰' },
  { id: 'stars', name: 'Sternenfeld', detail: 'Schwebende Lichtpunkte', icon: '✦' },
  { id: 'grid', name: 'Digitales Raster', detail: 'Dezente Bewegung', icon: '▦' },
  { id: 'glow', name: 'Soft Glow', detail: 'Ruhiges Licht', icon: '◌' },
  { id: 'plain', name: 'Schlicht', detail: 'Ohne Effekte', icon: '■' }
] as const;
export function AmbientBackground({ mode, animated }: { mode: string; animated: boolean }) {
  return <div className={'ambient-background ambient-' + mode} data-running={animated} aria-hidden="true">
    <div className="ambient-wash"/><div className="ambient-ribbon ribbon-a"/><div className="ambient-ribbon ribbon-b"/><div className="ambient-ribbon ribbon-c"/>
    <div className="ambient-grid-lines"/>
    {mode === 'stars' && <div className="ambient-stars">{Array.from({length:40},(_,i)=><i key={i} style={{left:((i*37+11)%100)+'%',top:((i*23+7)%100)+'%',animationDelay:(-i*.7)+'s',animationDuration:(7+i%7)+'s',opacity:.2+(i%5)*.12}}/>)}</div>}
    <div className="ambient-vignette"/>
  </div>;
}
