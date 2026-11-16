import type { Order } from "./orders";
export async function shareReceipt(order:Order){
 const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1920;const c=canvas.getContext("2d");if(!c)throw new Error("Canvas unavailable");
 const css=getComputedStyle(document.documentElement); const ink=css.getPropertyValue("--receipt-ink").trim(); const paper=css.getPropertyValue("--receipt-surface").trim();
 c.fillStyle=css.getPropertyValue("--ls-black").trim();c.fillRect(0,0,1080,1920);
 const image=new Image();image.src="/machine/machine-empty.jpg";await image.decode();c.globalAlpha=.5;c.drawImage(image,0,0,1080,550);c.globalAlpha=1;
 c.fillStyle=paper;c.fillRect(120,360,840,1350);c.fillStyle=ink;c.font="bold 38px monospace";c.fillText("LOST SIGNAL 88.8",180,440);c.font="28px monospace";c.fillText(order.order_no,180,500);
 const lineCount=order.items.reduce((n,i)=>n+Math.ceil(`${i.name}${i.size??""}`.length/36)+2,0);const scale=Math.min(1,820/(lineCount*40+300));c.save();c.translate(180,590);c.scale(scale,scale);c.translate(-180,-590);
 let y=590;for(const i of order.items){const t=`${i.name}${i.size?` · ${i.size}`:""} ×${i.qty}`; for(let n=0;n<t.length;n+=36){c.fillText(t.slice(n,n+36),180,y);y+=40;} c.fillText(`QAR ${(i.price*i.qty).toFixed(2)}`,180,y);y+=65;}
 c.fillText(`DISCOUNT −${order.discount.toFixed(2)}`,180,y+20);c.font="bold 36px monospace";c.fillText(`TOTAL QAR ${order.total.toFixed(2)}`,180,y+90);
 if(order.dedication?.to){y+=180;c.font="24px monospace";c.fillText(`THIS ONE GOES OUT TO ${order.dedication.to.toUpperCase()}`,180,y);const msg=`“${order.dedication.message??""}”`;for(let n=0;n<msg.length;n+=40){y+=35;c.fillText(msg.slice(n,n+40),180,y);}}
 c.restore();c.fillStyle=paper;c.font="26px monospace";c.fillText("LOST SIGNAL 88.8 · OPEN AFTER DARK",180,1810);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Image failed")),"image/png"));const file=new File([blob],`${order.order_no}.png`,{type:"image/png"});
 if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:order.order_no});return "Receipt shared.";}
 const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return "Share image downloaded.";
}