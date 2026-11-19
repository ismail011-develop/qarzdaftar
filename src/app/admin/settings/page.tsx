import { ScreenStub } from "@/components/ScreenStub";

export default function Page() {
  return <ScreenStub title="Sozlamalar" proto="Admin → Sozlamalar" api={["GET|POST /api/admin/plans"]} />;
}
