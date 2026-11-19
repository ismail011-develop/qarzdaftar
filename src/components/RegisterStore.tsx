"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function RegisterStore() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/store", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    if (r.ok) router.refresh(); else setErr("Doʻkonni yaratib boʻlmadi");
  }
  return (
    <form onSubmit={submit} className="mx-auto mt-24 flex max-w-sm flex-col gap-3 p-6">
      <h1 className="text-xl font-bold">Doʻkonni roʻyxatdan oʻtkazing</h1>
      <input className="rounded-xl border border-qd-line bg-qd-card px-3 py-3" placeholder="Doʻkon nomi" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
      {err && <p className="text-sm text-qd-amber">{err}</p>}
      <button className="rounded-xl bg-qd-emerald py-3 font-bold text-[#031a10]">Davom etish</button>
    </form>
  );
}
