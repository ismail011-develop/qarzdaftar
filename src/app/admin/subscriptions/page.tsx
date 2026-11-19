import { ScreenStub } from "@/components/ScreenStub";

export default function Page() {
  return <ScreenStub title="Obunalar va tariflar" proto="Admin → Obunalar / Tariflar" api={["GET /api/admin/subscriptions", "POST /api/admin/subscriptions/grant", "GET|POST /api/admin/plans", "PATCH /api/admin/plans/:id"]} />;
}
