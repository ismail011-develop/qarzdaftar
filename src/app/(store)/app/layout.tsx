import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavLinks } from "@/components/NavLinks";
import { RegisterStore } from "@/components/RegisterStore";

const ITEMS = [
  { href: "/app", label: "Bosh" }, { href: "/app/customers", label: "Mijozlar" }, { href: "/app/debts", label: "Qarzlar" },
  { href: "/app/stats", label: "Statistika" }, { href: "/app/profile", label: "Profil" },
];

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: store } = await supabase.from("stores").select("id, name, status, blocked_reason").eq("owner_id", user.id).maybeSingle();
  if (!store) return <RegisterStore />;
  const { data: sub } = await supabase.from("subscriptions").select("ends_at").eq("store_id", store.id).eq("status", "active").gt("ends_at", new Date().toISOString()).limit(1).maybeSingle();

  // UI banner only: the database independently refuses writes when blocked / unsubscribed.
  const banner =
    store.status === "blocked" ? `Doʻkon bloklangan: ${store.blocked_reason ?? ""}` :
    store.status === "pending" ? "Doʻkon admin tasdiqlashini kutmoqda. Obunani faollashtiring." :
    !sub ? "Obuna tugagan: maʼlumotlar faqat koʻrish rejimida. Obunani yangilang." : null;

  return (
    <div className="mx-auto min-h-screen max-w-md pb-20">
      {banner && <div className="bg-[#3a2c08] p-3 text-center text-sm text-qd-amber">{banner}</div>}
      {children}
      <NavLinks items={ITEMS} variant="bottom" />
    </div>
  );
}
