import { ScreenStub } from "@/components/ScreenStub";

export default function Page() {
  return <ScreenStub title="Check — toʻlovlarni tekshirish" proto="Admin → Toʻlovlar" api={["GET /api/admin/subscriptions?status=pending", "POST /api/admin/subscriptions/:id/confirm", "POST /api/admin/subscriptions/:id/reject", "GET /api/admin/stores/:id/check"]} />;
}
