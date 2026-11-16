import { useEffect,useState } from "react";
import { fetchOrders } from "@/lib/orders";
import { ROW_NAMES,type RowLetter } from "@/data/products";
export function useListenerCard(signedIn:boolean,since?:string){const [card,setCard]=useState<string|null>(null);useEffect(()=>{if(!signedIn){setCard(null);return;}void fetchOrders(true).then(orders=>{
 const rows:Record<string,number>={};let drops=0;orders.forEach(o=>o.items.forEach(i=>{if(i.bonus)return;const row=i.code==="KIT"?"B":i.code[0]??"A";rows[row]=(rows[row]??0)+i.qty;drops+=i.qty;}));
 const fav=Object.entries(rows).sort((a,b)=>b[1]-a[1])[0]?.[0];const first=orders.at(-1)?.created_at??since??new Date().toISOString();
 const date=new Date(since??first);const month=date.toLocaleDateString("en-GB",{month:"short",year:"numeric",timeZone:"Asia/Qatar"}).toUpperCase();
 const time=new Date(first).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Qatar"});
 setCard(`NIGHT OWL SINCE ${month} · ${drops} DROPS · FAVOURITE ROW: ${fav?ROW_NAMES[fav as RowLetter]:"—"} · FIRST TUNE-IN ${time}`);
 });},[signedIn,since]);return card;}