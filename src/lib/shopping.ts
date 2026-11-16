import { PRODUCT_BY_CODE } from "@/data/products";
export const SIZES: Record<string,string[]> = { B1:["S","M","L","XL"], B3:["S","M","L","XL"], B4:["S/M","L/XL"] };
export const VARIANTS: Record<string,number> = {};
export const lineKey = (code:string,size="",mystery="") => [code,size,mystery].join("|");
export const readLine = (key:string) => { const [code="",size="",mystery=""] = key.split("|"); return {code,size,mystery}; };
export const lineProduct = (key:string) => readLine(key).code === "KIT" ? {code:"KIT",name:"Night Shift Kit",price:349} : PRODUCT_BY_CODE[readLine(key).code];
export const isDeadHours = (d=new Date()) => { const h=Number(new Intl.DateTimeFormat("en-GB",{hour:"numeric",hour12:false,timeZone:"Asia/Qatar"}).format(d))%24; return h>=2&&h<4; };
export const promotionRate = (dead:boolean,kicked:boolean,mystery:boolean) => Math.min(.25,(dead?.15:0)+(kicked?.10:0)+(mystery?.20:0));
export function shoppingTotals(cart:Record<string,number>,kicked:boolean,dead=false) {
 let subtotal=0,discount=0;
 for(const [key,qty] of Object.entries(cart)){ const amount=(lineProduct(key)?.price??0)*qty; subtotal+=amount; discount+=Math.round(amount*promotionRate(dead,kicked,!!readLine(key).mystery)*100)/100; }
 return {subtotal,discount:Math.round(discount*100)/100,total:Math.round((subtotal-discount)*100)/100};
}
export function orderStep(created:string,now=Date.now()){ const age=now-new Date(created).getTime(); return age>=3*86400_000?3:age>=86400_000?2:age>=600_000?1:0; }
export const TRACKING=["Packed in the booth","Out with the night crew","Delivered"];
export function restockIn(d=new Date()){ const q=new Date(d.getTime()+3*3600_000); const target=Date.UTC(q.getUTCFullYear(),q.getUTCMonth(),q.getUTCDate(),20)-3*3600_000; const sec=Math.floor(((target>d.getTime()?target:target+86400_000)-d.getTime())/1000); return [Math.floor(sec/3600),Math.floor(sec/60)%60,sec%60].map(n=>String(n).padStart(2,"0")).join(":"); }