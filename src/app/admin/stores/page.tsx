import { ScreenStub } from "@/components/ScreenStub";

export default function Page() {
  return <ScreenStub title="Doʻkonlar" proto="Admin → Doʻkonlar / Maʼlumot / Bloklash" api={["GET /api/admin/stores", "POST /api/admin/stores/:id/status", "GET /api/admin/stores/:id/check"]} />;
}
