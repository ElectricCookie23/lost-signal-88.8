<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

<!-- AGENT-MEMORY:BEGIN -->
- The machine lives in the pathless layout `src/routes/_machine.tsx`; child routes (`_machine.index`, `_machine.$view`) render null and only set the URL/head, so the machine never remounts on navigation.
- Hologram state: product/row views come from the URL; cart/saved are local panel state cleared on URL change.
- Live stock is written into the shared `PRODUCT_BY_CODE` records by `useMachineStore` (initial fetch + realtime) and a `stockTick` re-render; static product copy stays in `src/data/products.ts`.
- Ghost sales and nightly refill are SQL-only pg_cron jobs (`ghost_tick` every minute gated by `station_state.next_ghost_at`; `refill_all` at 17:00 UTC). Admin stock edits go through `admin_set_stock`/`admin_restock_all` RPCs that check `has_role`.
- Admin role is granted on signup by matching `public.admin_emails`.
- Orders are created only by the `place_order` RPC (prices/stock checked server-side, one transaction); guests read their orders via `guest_orders(ids)` from localStorage ids and `claim_orders` attaches them on sign-in.
- Audio lives in `src/lib/audio.ts` (one AudioContext + master gain, buffers decoded on first click, mute in localStorage); the intro/exit/night-day sequence is phase state inside `_machine.tsx`, and hologram panels only open once phase is "on".
- Secret code (D4·A1·D4) sets a localStorage flag passed to the 5-arg `place_order(..., p_secret)`, which appends a zero-price D1 bonus line without touching stock; `/orders/$no` opens the Orders panel highlighting that receipt.
- Info pages (station, night-log, request-line, shipping, privacy, join) are hologram panels `{kind:"page"}` parsed from the single `/$view` segment; copy lives in `src/data/pages.ts`. On phones the hologram is a 70% bottom sheet (same component, CSS only).
- Public Request Line and subscriber inserts use column-level grants for form fields only and validated RLS predicates; identifiers and submission timestamps must remain database-generated to prevent arbitrary records.
<!-- AGENT-MEMORY:END -->
