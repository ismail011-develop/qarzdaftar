import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "QarzDaftar",
  description: "Qarz unutilmaydi. Munosabat buzilmaydi.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "QarzDaftar", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: "#04100c", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className="min-h-screen bg-qd-bg font-sans text-qd-text antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
