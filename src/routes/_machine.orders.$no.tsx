import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_machine/orders/$no")({
  head: ({ params }) => ({
    meta: [
      { title: `Receipt ${params.no} · Lost Signal 88.8` },
      { name: "description", content: `Order ${params.no} from the Lost Signal 88.8 vending machine.` },
      { property: "og:title", content: `Receipt ${params.no} · Lost Signal 88.8` },
      { property: "og:description", content: "A receipt printed by the Lost Signal 88.8 vending machine." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => null,
});
