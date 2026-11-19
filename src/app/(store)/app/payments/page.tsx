import { ScreenStub } from "@/components/ScreenStub";

export default function Page() {
  return <ScreenStub title="Toʻlovlar va operatsiyalar tarixi" proto="Store App → Operatsiyalar" api={["GET /api/payments", "POST /api/payments/:id/void"]} />;
}
