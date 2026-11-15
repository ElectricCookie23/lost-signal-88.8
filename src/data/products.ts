export type RowLetter = "A" | "B" | "C" | "D";

export interface Product {
  code: string;
  name: string;
  price: number; // QAR
  tag: string; // "" | "DJ pick" | "Bootleg"
  stock: number;
  description: string;
  row: RowLetter;
}

const P = (
  code: string,
  name: string,
  price: number,
  tag: string,
  stock: number,
  description: string,
): Product => ({ code, name, price, tag, stock, description, row: code[0] as RowLetter });

export const PRODUCTS: Product[] = [
  P("A1", "Dead Air Vol. 1", 45, "DJ pick", 12, "Ninety minutes recorded live between 2 and 4am, when the station thought nobody was listening. Includes the part where DJ Static falls asleep on the mic."),
  P("A2", "Blank Tapes 5-Pack", 35, "", 30, "Five empty cassettes for your own bootlegs. What you record on them stays between you and the signal police."),
  P("A3", "Nightwalker Cassette Player", 189, "", 2, "A pocket tape player with an orange backlit window and a belt clip. Auto-reverse, because flipping a tape at 3am is too much effort."),
  P("A4", "Rewind Pen", 15, "", 40, "The pencil trick, upgraded. A pen with a hex end that fits any cassette spool. Writes and rewinds."),
  P("B1", "88.8 Station Hoodie", 220, "DJ pick", 8, "Heavyweight black hoodie with the frequency on the chest, a tuning dial down the sleeve and the broadcast schedule on the back."),
  P("B2", "Off Air Cap", 95, "", 14, "Orange cap embroidered with OFF AIR. For the daytime, when you're technically not here."),
  P("B3", "Night Crew Jacket", 340, "Bootleg", 3, "Black work jacket with a reflective NIGHT CREW strip across the back. Built for rooftops in winter."),
  P("B4", "Signal Socks 2-Pack", 40, "", 25, "One pair in static grey, one in signal teal. They don't match. That's the point."),
  P("C1", "Pocket Receiver", 149, "DJ pick", 6, "A matchbox-sized radio pre-tuned to 88.8. It picks up other stations too, but we don't recommend them."),
  P("C2", "Antenna Keychain", 25, "", 50, "A chrome antenna that extends to 30cm. Does it improve reception? No. Will people ask about it? Every time."),
  P("C3", "Booth Headphones", 260, "", 4, "Closed-back headphones with a coiled cable long enough to reach the window when the DJ needs air."),
  P("C4", "ON AIR Lamp", 175, "", 1, "The same red light that hangs over our booth door. Plug it in and nobody walks into your room without knocking."),
  P("D1", "Interference Sticker Sheet", 20, "", 60, "Stickers of the frequency, the radio, the machine and a cassette. Stick them where they shouldn't be."),
  P("D2", "Rooftop Session 004 Poster", 60, "Bootleg", 5, "Riso print from the one night we broadcast live with a full band. The building manager still doesn't know."),
  P("D3", "Static Zine Issue 7", 30, "", 20, "Photocopied pages of listener letters, the best 3am call-ins, and how to build an antenna out of a coat hanger."),
  P("D4", "Frequency Map", 85, "", 10, "A map of the city showing where 88.8 comes in clear, where it fades, and the one parking lot where it's perfect."),
];

export const PRODUCT_BY_CODE: Record<string, Product> = Object.fromEntries(
  PRODUCTS.map((p) => [p.code, p]),
);

export const ROW_NAMES: Record<RowLetter, string> = {
  A: "TAPES",
  B: "WEAR",
  C: "GEAR",
  D: "PAPER",
};
