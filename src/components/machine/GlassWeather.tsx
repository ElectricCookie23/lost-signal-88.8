import { useEffect,useRef,useState } from "react";
export function GlassWeather({weather}:{weather:"rain"|"heat"|"clear"}) {
 const [smears,setSmears]=useState<{id:number;x:number;y:number}[]>([]);const last=useRef(0);
 const glass=useRef<HTMLDivElement>(null);
 useEffect(()=>{const timers:ReturnType<typeof setTimeout>[]=[];const move=(e:PointerEvent)=>{if(!e.buttons&&e.pointerType==="mouse")return;if(Date.now()-last.current<80)return;const r=glass.current?.getBoundingClientRect();if(!r||e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;if((e.target as Element)?.closest("button"))return;last.current=Date.now();const dot={id:Date.now(),x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100};setSmears(old=>[...old.slice(-30),dot]);timers.push(setTimeout(()=>setSmears(old=>old.filter(x=>x.id!==dot.id)),4000));};window.addEventListener("pointermove",move);return()=>{window.removeEventListener("pointermove",move);timers.forEach(clearTimeout);};},[]);
 return <>
 {weather==="rain"&&<><div className="glass-rain" aria-hidden/><div className="rain-puddle" aria-hidden/></>}
 {weather==="heat"&&<div className="heat-shimmer" aria-hidden/>}
 <div ref={glass} className="glass-fog" aria-hidden>
 {smears.map(s=><i key={s.id} style={{left:`${s.x}%`,top:`${s.y}%`}}/>)}</div>
 </>;
}