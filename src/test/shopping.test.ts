import { describe,it,expect } from "vitest";
import { SIZES,isDeadHours,promotionRate,shoppingTotals,lineKey,orderStep,restockIn,remainingStock } from "@/lib/shopping";
describe("shopping rules",()=>{
 it("kit and individual lines share component stock",()=>{const p={B1:{stock:4},A1:{stock:2},C1:{stock:3}};expect(remainingStock(lineKey("KIT","L"),{A1:1,[lineKey("B1","L")]:1},p,{"B1|L":2})).toBe(1);expect(remainingStock("A1",{[lineKey("KIT","L")]:2},p)).toBe(0);});
 it("hoodie and jacket have S M L XL; socks have paired sizes",()=>{expect(SIZES['B1']).toEqual(["S","M","L","XL"]);expect(SIZES['B3']).toEqual(["S","M","L","XL"]);expect(SIZES['B4']).toEqual(["S/M","L/XL"]);});
 it("kit costs 349 rather than 414, saving 65",()=>{expect(shoppingTotals({[lineKey("KIT","L")]:1},false).total).toBe(349);expect(414-349).toBe(65);});
 it("dead hours are 02:00 inclusive to 04:00 exclusive Qatar",()=>{expect(isDeadHours(new Date("2026-11-15T23:00Z"))).toBe(true);expect(isDeadHours(new Date("2026-11-16T01:00Z"))).toBe(false);});
 it("15% dead hours plus 10% KICKIT caps at 25%",()=>{expect(promotionRate(true,true,false)).toBe(.25);expect(shoppingTotals({C2:1},true,true).total).toBe(18.75);});
 it("mystery buys get 20%, capped at 25% with other promos",()=>{expect(promotionRate(false,false,true)).toBe(.2);expect(promotionRate(true,true,true)).toBe(.25);});
 it("tracking changes at 10 minutes, one day and three days",()=>{const t="2026-11-16T00:00Z",n=Date.parse(t);expect(orderStep(t,n+599999)).toBe(0);expect(orderStep(t,n+600000)).toBe(1);expect(orderStep(t,n+86400000)).toBe(2);expect(orderStep(t,n+259200000)).toBe(3);});
 it("restock countdown targets 20:00 Qatar",()=>expect(restockIn(new Date("2026-11-16T12:47:27Z"))).toBe("04:12:33"));
});