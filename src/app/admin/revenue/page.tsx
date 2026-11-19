import { ScreenStub } from "@/components/ScreenStub";

export default function Page() {
  return <ScreenStub title="Daromad statistikasi" proto="Admin → Daromad" api={["GET /api/admin/dashboard"]} />;
}
