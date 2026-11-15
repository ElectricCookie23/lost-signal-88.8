import { createFileRoute } from "@tanstack/react-router";

const DESC =
  "A pirate radio station that only broadcasts at night, selling its merch from a beat-up vending machine. Limited stock. Open after dark.";

export const Route = createFileRoute("/_machine/")({
  head: () => ({
    meta: [
      { title: "Lost Signal 88.8 · Pirate radio merch from the vending machine" },
      { name: "description", content: DESC },
      { property: "og:title", content: "Lost Signal 88.8 · Pirate radio merch from the vending machine" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://lost-signal-blackout.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://lost-signal-blackout.lovable.app/og-image.jpg" },
    ],
  }),
  component: () => null,
});
