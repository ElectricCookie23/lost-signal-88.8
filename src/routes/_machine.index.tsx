import { createFileRoute } from "@tanstack/react-router";

const DESC =
  "A pirate radio station's merch store where the whole website is a vending machine. Tapes, wear, gear and paper — broadcasting 8pm to 6am.";

export const Route = createFileRoute("/_machine/")({
  head: () => ({
    meta: [
      { title: "Lost Signal 88.8 — The Machine" },
      { name: "description", content: DESC },
      { property: "og:title", content: "Lost Signal 88.8 — The Machine" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => null,
});
