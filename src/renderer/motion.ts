import {useState,type Dispatch,type SetStateAction} from 'react';
import {flushSync} from 'react-dom';
let transition:{skipTransition():void}|undefined;
export function motionEnabled(){return document.querySelector('.shell')?.getAttribute('data-animations')!=='false'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
export function motionUpdate(update:()=>void){const doc=document as Document&{startViewTransition?:(callback:()=>void)=>{skipTransition():void;finished:Promise<void>}};if(!motionEnabled()||!doc.startViewTransition){update();return;}transition?.skipTransition();const next=doc.startViewTransition(()=>flushSync(update));transition=next;void next.finished.catch(()=>{}).finally(()=>{if(transition===next)transition=undefined;});}
export function useMotionState<T>(initial:T):[T,Dispatch<SetStateAction<T>>]{const [value,setValue]=useState(initial);return [value,next=>{const result=typeof next==='function'?(next as (v:T)=>T)(value):next;if(!Object.is(result,value))motionUpdate(()=>setValue(result));}];}
