import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lost Signal 88.8" },
      { name: "description", content: "Lost Signal 88.8" },
      { property: "og:title", content: "Lost Signal 88.8" },
      { property: "og:description", content: "Lost Signal 88.8" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <div className="min-h-screen bg-background" />;
}
