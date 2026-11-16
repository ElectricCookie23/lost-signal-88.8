/** Night Log: photo file, caption title, caption line (reference LOG). */
export const NIGHT_LOG: [string, string, string][] = [
  ["2000", "20:00 / Lights on.", "Top floor of a tower nobody finished. The developer ran out of money, the guards stopped coming, and nobody checks the roof. Transmitter warm by 20:04. We're on."],
  ["2200", "22:00 / The transmitter.", "Foil, tape and a warning in the Engineer's handwriting. It runs hot tonight. First request comes in at 22:06. Line 2 rings once and stops."],
  ["2358", "23:58 / The corridor.", "Line 2 again. Nobody speaks. There's a radio playing on their end, and it's us, a few seconds late. Whoever it is, they're close."],
  ["0015", "00:15 / Stairwell B.", "The Runner's back with batteries and tea. Says the lights on the fourth floor were on. There is no power on the fourth floor."],
  ["0040", "00:40 / Under the overpass.", "A listener texts from a parked car: signal's clearer than usual tonight. Then line 2 asks for a song by name. We don't have it. Nobody has it."],
  ["0247", "02:47 / Rooftop.", "The Host goes up to check the antenna. It's fine. From up here you can count every window in the building. One on the fourth floor is lit."],
  ["0315", "03:15 / The request line.", "Line 2 finally talks. Calm voice, no name. Reads out three slots, slowly. D4. A1. D4. Then: try it on the machine. Click."],
  ["0410", "04:10 / The machine.", "Someone tried it. The keypad lit up, the coil turned, and something dropped into the tray that nobody paid for."],
  ["0552", "05:52 / Rooftop again.", "Rain's stopped. Last song before sign-off. Line 2 rings one more time. We let it ring."],
  ["0600", "06:00 / Closed till 8.", "Note on the glass, keys back in the stairwell. Someone left a scrap of paper in the coin return: same time tomorrow. It isn't our handwriting."],
];

/** Tonight on 88.8: start time (HHMM, Qatar), show name, one line. */
export const SHOWS: [string, string, string][] = [
  ["2000", "Lights On", "The transmitter warms up. Slow songs, no talking, nobody's sure who's listening yet."],
  ["2200", "Foil & Warnings", "The Engineer's hour. Loud, badly mixed, occasionally on fire."],
  ["0000", "Dead Air", "Lofi for people who should be asleep. The longest-running show on 88.8."],
  ["0200", "Basement Frequency", "Heavier. Darker. The building creaks and we turn it up."],
  ["0300", "Request Line", "The phones are open. Line 1 is for requests. Don't pick up line 2."],
  ["0400", "Abandoned Broadcast", "Static, drones and whatever comes in from the other end of the dial."],
  ["0500", "Sign Off", "Last songs as the sky goes grey. Doors locked by 6."],
];

export const REQUEST_TOPICS = ["Song request", "Order question", "Restock alert", "Shout-out on air", "Something else"] as const;

export type PageName = "station" | "night-log" | "request-line" | "shipping" | "privacy" | "join" | "night-shift-kit" | "rooftop-session" | "fourth-floor";
export const PAGE_SLUGS: PageName[] = ["station", "night-log", "request-line", "shipping", "privacy", "join", "night-shift-kit", "rooftop-session", "fourth-floor"];
export const PAGE_TITLES: Record<PageName, string> = {
  station: "Station",
  "night-shift-kit":"Night Shift Kit",
  "rooftop-session":"Rooftop Session 004",
  "fourth-floor": "4F",
  "night-log": "Night Log",
  "request-line": "Request Line",
  shipping: "Shipping & Returns",
  privacy: "Privacy",
  join: "Join the Frequency",
};
export const PAGE_DESCS: Record<PageName, string> = {
  station: "A pirate station with no licence, no faces and one vending machine. Tonight's schedule and the house rules.",
  "night-shift-kit":"Hoodie, cassette and pocket receiver for QAR 349.",
  "rooftop-session":"One night, one band, one antenna. Rooftop Session 004.",
  "fourth-floor": "You're not supposed to be on this floor.",
  "night-log": "One night at Lost Signal 88.8, logged as it happens. And the caller on line 2 who knew the code.",
  "request-line": "Open 8PM to 6AM. Lines are always busy. Leave a message for the booth.",
  shipping: "Free shipping within Qatar in 3–5 days. Returns within 14 days if unused.",
  privacy: "We only store your email and your orders. Never card details.",
  join: "One email when something new drops in the machine. No spam.",
};
export const HEROES: Record<string, string> = {
  station: "/heroes/hero-station.jpg",
  "night-log": "/heroes/hero-night-log.jpg",
  "fourth-floor": "/nightlog/2358.jpg",
  "request-line": "/heroes/hero-request-line.jpg",
  cart: "/heroes/hero-cart.jpg",
  saved: "/heroes/hero-favorites.jpg",
  row0: "/heroes/hero-tapes.jpg",
  row1: "/heroes/hero-wear.jpg",
  row2: "/heroes/hero-gear.jpg",
  row3: "/nightlog/0315.jpg",
};
