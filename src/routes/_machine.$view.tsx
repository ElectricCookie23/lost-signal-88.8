import { createFileRoute, notFound } from "@tanstack/react-router";
import { PRODUCT_BY_CODE, ROW_SLUGS } from "@/data/products";
import { PAGE_DESCS, PAGE_SLUGS, PAGE_TITLES, type PageName } from "@/data/pages";
import { SignalLost404 } from "@/components/nav/NotFound";

const ROW_TITLES: Record<string, string> = { tapes: "Tapes", wear: "Wear", gear: "Gear", paper: "Paper" };

export const Route = createFileRoute("/_machine/$view")({
  loader: ({ params }) => {
    const v = params.view.toLowerCase();
    const product = PRODUCT_BY_CODE[v.toUpperCase()];
    if (product) return { title: `${product.code} ${product.name} · Lost Signal 88.8`, desc: product.description };
    if ((PAGE_SLUGS as string[]).includes(v))
      return { title: `${PAGE_TITLES[v as PageName]} · Lost Signal 88.8`, desc: PAGE_DESCS[v as PageName] };
    if ((ROW_SLUGS as readonly string[]).includes(v))
      return {
        title: `${ROW_TITLES[v]} · Lost Signal 88.8`,
        desc: `Row ${"ABCD"[ROW_SLUGS.indexOf(v as (typeof ROW_SLUGS)[number])]} of the Lost Signal 88.8 vending machine.`,
      };
    throw notFound();
  },
  head: ({ loaderData }) => {
    const title = loaderData?.title ?? "Signal lost · Lost Signal 88.8";
    const desc = loaderData?.desc ?? "This slot is empty.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:image", content: "https://lost-signal-blackout.lovable.app/og-image.jpg" },
        { name: "twitter:image", content: "https://lost-signal-blackout.lovable.app/og-image.jpg" },
      ],
    };
  },
  notFoundComponent: SignalLost404,
  component: () => null,
});
