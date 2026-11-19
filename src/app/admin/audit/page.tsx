import { ScreenStub } from "@/components/ScreenStub";

export default function Page() {
  return <ScreenStub title="Audit jurnali" proto="Admin → Sozlamalar / Audit" api={["GET /api/admin/audit"]} />;
}
