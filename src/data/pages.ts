/** Night Log: photo file, caption title, caption line (reference LOG). */
export const NIGHT_LOG: [string, string, string][] = [
  ["2000", "20:00 / Lights on.", "Top floor, broken corner, nobody's supposed to be up there."],
  ["2200", "22:00 / The transmitter.", "Held together with foil and a warning."],
  ["2358", "23:58 / The corridor.", "Two minutes to the top of the hour."],
  ["0015", "00:15 / Stairwell B.", "Keys in the door, antenna up."],
  ["0040", "00:40 / Somewhere below.", "Tea going cold. 88.8 coming in clear."],
  ["0247", "02:47 / Rooftop.", "The jacket, the antenna, and a city that won't sleep either."],
  ["0315", "03:15 / The request line.", "Twelve calls, one song, nobody hangs up. D4 · A1 · D4."],
  ["0410", "04:10 / Stairwell.", "The machine humming, hood up."],
  ["0552", "05:52 / Rooftop again.", "Rain stopped. Last song before sign-off."],
  ["0600", "06:00 / Closed till 8.", "See you tonight."],
];

export const REQUEST_TOPICS = ["Song request", "Order question", "Restock alert", "Shout-out on air", "Something else"] as const;

export type PageName = "station" | "night-log" | "request-line" | "shipping" | "privacy" | "join" | "night-shift-kit" | "rooftop-session";
export const PAGE_SLUGS: PageName[] = ["station", "night-log", "request-line", "shipping", "privacy", "join", "night-shift-kit", "rooftop-session"];
export const PAGE_TITLES: Record<PageName, string> = {
  station: "Station",
  "night-shift-kit":"Night Shift Kit",
  "rooftop-session":"Rooftop Session 004",
  "night-log": "Night Log",
  "request-line": "Request Line",
  shipping: "Shipping & Returns",
  privacy: "Privacy",
  join: "Join the Frequency",
};
export const PAGE_DESCS: Record<PageName, string> = {
  station: "Nobody's supposed to know where we are. The story of the pirate station behind the vending machine.",
  "night-shift-kit":"Hoodie, cassette and pocket receiver for QAR 349.",
  "rooftop-session":"One night, one band, one antenna. Rooftop Session 004.",
  "night-log": "20:00 to 06:00 — one night at Lost Signal 88.8, in ten photos.",
  "request-line": "Open 8PM to 6AM. Lines are always busy. Leave a message for the booth.",
  shipping: "Free shipping within Qatar in 3–5 days. Returns within 14 days if unused.",
  privacy: "We only store your email and your orders. Never card details.",
  join: "One email when something new drops in the machine. No spam.",
};
export const HEROES: Record<string, string> = {
  station: "/heroes/hero-station.jpg",
  "night-log": "/heroes/hero-night-log.jpg",
  "request-line": "/heroes/hero-request-line.jpg",
  cart: "/heroes/hero-cart.jpg",
  saved: "/heroes/hero-favorites.jpg",
  row0: "/heroes/hero-tapes.jpg",
  row1: "/heroes/hero-wear.jpg",
  row2: "/heroes/hero-gear.jpg",
  row3: "/nightlog/0315.jpg",
};
