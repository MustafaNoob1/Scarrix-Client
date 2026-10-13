import React from 'react';
export function ScarrixMark({ className = '', decorative = false }: { className?: string; decorative?: boolean }) {
  return <svg className={'scarrix-mark ' + className} viewBox="0 0 100 100" role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : 'Scarrix'} aria-hidden={decorative || undefined}>
    <path className="mark-frame" d="M50 4 90 27v46L50 96 10 73V27Z"/>
    <path className="mark-upper" d="M31 24H77L65 37H39L30 47H54L43 60H14L24 39Z"/>
    <path className="mark-lower" d="M57 40H85L76 61 65 76H22L35 63H59L69 53H46Z"/>
    <path className="mark-cut" d="m69 15-9 14h18l-7 8 16-9Z"/>
  </svg>;
}
