"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

export function NavLinks({ items, variant }: { items: NavItem[]; variant: "bottom" | "side" }) {
  const path = usePathname();
  const active = (h: string) => (h === "/app" || h === "/admin" ? path === h : path.startsWith(h));
  const cls = (on: boolean) =>
    variant === "bottom"
      ? `flex-1 py-3 text-center text-xs ${on ? "text-qd-green" : "text-qd-mute"}`
      : `rounded-xl px-3 py-2 text-sm ${on ? "bg-qd-card2 font-semibold text-qd-green" : "text-qd-mute"}`;
  return (
    <nav className={variant === "bottom" ? "fixed inset-x-0 bottom-0 z-10 flex border-t border-qd-line bg-[#08170f] pb-[env(safe-area-inset-bottom)]" : "flex gap-1 overflow-x-auto md:flex-col"}>
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={cls(active(i.href))}>{i.label}</Link>
      ))}
    </nav>
  );
}
