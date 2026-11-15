import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/booth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "The Booth · Lost Signal 88.8" },
      { name: "description", content: "Station owner controls for the Lost Signal 88.8 machine stock." },
      { property: "og:title", content: "The Booth · Lost Signal 88.8" },
      { property: "og:description", content: "Station owner controls for the machine stock." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Booth,
});

interface Row {
  code: string;
  name: string;
  stock: number;
  base_stock: number;
}

function Booth() {
  const { user, ready, isAdmin } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const [checked, setChecked] = useState(false);
  const [reqs, setReqs] = useState<{ id: string; name: string; email: string; topic: string; message: string; created_at: string }[]>([]);
  const [subs, setSubs] = useState<{ id: string; email: string; created_at: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    // role lookup is async; give it a moment before showing "no access"
    const t = setTimeout(() => setChecked(true), 1200);
    return () => clearTimeout(t);
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("products")
      .select("code, name, stock, base_stock")
      .order("sort_order")
      .then(({ data }) => setRows(data ?? []));
    supabase.from("requests").select("*").order("created_at", { ascending: false }).limit(200).then(({ data }) => setReqs(data ?? []));
    supabase.from("subscribers").select("*").order("created_at", { ascending: false }).limit(500).then(({ data }) => setSubs(data ?? []));
    const ch = supabase
      .channel(`booth-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, (p) => {
        const r = p.new as Row;
        setRows((rs) => rs.map((x) => (x.code === r.code ? { ...x, stock: r.stock } : x)));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [isAdmin]);

  const set = async (code: string, stock: number) => {
    setErr("");
    const { error } = await supabase.rpc("admin_set_stock", { _code: code, _stock: Math.max(0, stock) });
    if (error) setErr(error.message);
  };
  const restockAll = async () => {
    setErr("");
    const { error } = await supabase.rpc("admin_restock_all");
    if (error) setErr(error.message);
  };

  let body;
  if (!ready) body = <p className="holo-lcd">TUNING IN…</p>;
  else if (!user) body = <p className="holo-copy">Sign in on the machine first, then come back to the booth.</p>;
  else if (!isAdmin) body = <p className="holo-copy">{checked ? "This booth is for the station owner only." : "Checking your pass…"}</p>;
  else
    body = (
      <>
        <table className="booth-table">
          <thead>
            <tr>
              <th>CODE</th>
              <th>NAME</th>
              <th>STOCK</th>
              <th>BASE</th>
              <th />
              <th>SET</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} className={r.stock === 0 ? "is-out" : undefined}>
                <td className="holo-lcd">{r.code}</td>
                <td>{r.name}</td>
                <td className="holo-lcd">{r.stock}</td>
                <td className="holo-lcd">{r.base_stock}</td>
                <td>
                  <div className="holo-qty">
                    <button type="button" aria-label={`Remove one ${r.code}`} disabled={r.stock === 0} onClick={() => set(r.code, r.stock - 1)}>−</button>
                    <button type="button" aria-label={`Add one ${r.code}`} onClick={() => set(r.code, r.stock + 1)}>+</button>
                  </div>
                </td>
                <td>
                  <form
                    className="booth-set"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const n = parseInt(draft[r.code] ?? "", 10);
                      if (Number.isFinite(n)) set(r.code, n);
                      setDraft((d) => ({ ...d, [r.code]: "" }));
                    }}
                  >
                    <input
                      className="holo-input"
                      inputMode="numeric"
                      aria-label={`Set stock for ${r.code}`}
                      value={draft[r.code] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [r.code]: e.target.value.replace(/\D/g, "") }))}
                    />
                    <button type="submit" className="btn-secondary">Set</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="holo-acts">
          <button type="button" className="btn-primary holo-add" onClick={restockAll}>
            Restock all<span className="holo-sub">back to base stock</span>
          </button>
        </div>
        {err && <div className="holo-toast">{err}</div>}
        <div className="holo-dash" />
        <h2 className="holo-h1 text-[22px]">Request line ({reqs.length})</h2>
        {reqs.length === 0 ? <p className="holo-copy">No messages yet.</p> : (
          <ul className="booth-list">
            {reqs.map((r) => (
              <li key={r.id}>
                <div className="holo-lcd">{new Date(r.created_at).toLocaleString("en-GB")} · {r.topic.toUpperCase()}</div>
                <div><b>{r.name}</b> · {r.email}</div>
                {r.message && <p className="holo-copy">{r.message}</p>}
              </li>
            ))}
          </ul>
        )}
        <div className="holo-dash" />
        <h2 className="holo-h1 text-[22px]">Subscribers ({subs.length})</h2>
        {subs.length === 0 ? <p className="holo-copy">Nobody on the list yet.</p> : (
          <ul className="booth-list">
            {subs.map((r) => <li key={r.id}><span className="holo-lcd">{new Date(r.created_at).toLocaleDateString("en-GB")}</span> {r.email}</li>)}
          </ul>
        )}
      </>
    );

  return (
    <div className="booth-page">
      <div className="booth-panel">
        <Link to="/" className="holo-x">[X]</Link>
        <div className="holo-lcd text-[20px]">LOST SIGNAL 88.8 · STAFF ONLY</div>
        <h1 className="holo-h1">The Booth</h1>
        <div className="holo-dash" />
        {body}
      </div>
    </div>
  );
}
