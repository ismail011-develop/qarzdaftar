"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { normalizePhone } from "@/lib/money";

type Mode = "login" | "register" | "otp" | "reset" | "newpass";

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [mode, setMode] = useState<Mode>("login");
  const [f, setF] = useState({ phone: "+998", password: "", name: "", store: "", code: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sb = createClient();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function finish() {
    const { data: isAdmin } = await sb.rpc("is_admin");
    const pending = sessionStorage.getItem("qd_store_name");
    if (pending) {   // first login after registration: create the store
      await fetch("/api/store", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: pending }) });
      sessionStorage.removeItem("qd_store_name");
    }
    router.replace(next ?? (isAdmin === true ? "/admin" : "/app"));
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null); setBusy(true);
    try {
      const phone = normalizePhone(f.phone);
      if (!phone) return setMsg("Telefon raqami notoʻgʻri (+998 XX XXX XX XX)");
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ phone, password: f.password });
        return error ? setMsg("Telefon yoki parol notoʻgʻri") : finish();
      }
      if (mode === "register") {
        if (f.password.length < 8) return setMsg("Parol kamida 8 belgi");
        sessionStorage.setItem("qd_store_name", f.store.trim());
        const { data, error } = await sb.auth.signUp({ phone, password: f.password, options: { data: { full_name: f.name.trim() } } });
        if (error) return setMsg(error.message);
        return data.session ? finish() : (setMode("otp"), setMsg("SMS kod yuborildi"));
      }
      if (mode === "otp") {
        const { error } = await sb.auth.verifyOtp({ phone, token: f.code, type: "sms" });
        return error ? setMsg("Kod notoʻgʻri") : finish();
      }
      if (mode === "reset") {
        const { error } = await sb.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
        return error ? setMsg("Kod yuborilmadi") : (setMode("newpass"), setMsg("SMS kod yuborildi"));
      }
      if (mode === "newpass") {
        const v = await sb.auth.verifyOtp({ phone, token: f.code, type: "sms" });
        if (v.error) return setMsg("Kod notoʻgʻri");
        if (f.password.length < 8) return setMsg("Parol kamida 8 belgi");
        const u = await sb.auth.updateUser({ password: f.password });
        return u.error ? setMsg(u.error.message) : finish();
      }
    } finally { setBusy(false); }
  }
  const input = "w-full rounded-xl border border-qd-line bg-qd-card px-3 py-3 outline-none focus:border-qd-emerald";
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-3xl font-extrabold">Qarz<span className="text-qd-green">Daftar</span></h1>
      <p className="text-sm text-qd-mute">Qarz unutilmaydi. Munosabat buzilmaydi.</p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === "register" && (<>
          <input className={input} placeholder="Ism va familiya" value={f.name} onChange={set("name")} required />
          <input className={input} placeholder="Doʻkon nomi" value={f.store} onChange={set("store")} required minLength={2} />
        </>)}
        <input className={input} inputMode="tel" autoComplete="tel" placeholder="+998 90 123 45 67" value={f.phone} onChange={set("phone")} required />
        {(mode === "otp" || mode === "newpass") && <input className={input} inputMode="numeric" placeholder="SMS kod" value={f.code} onChange={set("code")} required />}
        {mode !== "reset" && mode !== "otp" && <input className={input} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "newpass" ? "Yangi parol" : "Parol"} value={f.password} onChange={set("password")} required />}
        {msg && <p className="text-sm text-qd-amber">{msg}</p>}
        <button disabled={busy} className="rounded-xl bg-qd-emerald py-3 font-bold text-[#031a10] disabled:opacity-50">
          {{ login: "Kirish", register: "Roʻyxatdan oʻtish", otp: "Tasdiqlash", reset: "Kod yuborish", newpass: "Parolni saqlash" }[mode]}
        </button>
      </form>
      <div className="flex justify-between text-sm text-qd-mute">
        <button onClick={() => setMode(mode === "register" ? "login" : "register")}>{mode === "register" ? "Kirish" : "Roʻyxatdan oʻtish"}</button>
        <button onClick={() => setMode("reset")}>Parolni tiklash</button>
      </div>
    </main>
  );
}
