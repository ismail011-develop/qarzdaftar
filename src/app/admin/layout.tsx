import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavLinks } from "@/components/NavLinks";

const ITEMS = [
  { href: "/admin", label: "Dashboard" }, { href: "/admin/stores", label: "Doʻkonlar" },
  { href: "/admin/subscriptions", label: "Obunalar" }, { href: "/admin/checks", label: "Check" },
  { href: "/admin/support", label: "Chat" }, { href: "/admin/revenue", label: "Daromad" },
  { href: "/admin/audit", label: "Audit" }, { href: "/admin/settings", label: "Sozlamalar" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: middleware already checked; every API + RPC checks again inside the database.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) redirect("/app");
  return (
    <div className="mx-auto grid max-w-6xl gap-4 p-3 md:grid-cols-[190px_1fr]">
      <NavLinks items={ITEMS} variant="side" />
      <main>{children}</main>
    </div>
  );
}
