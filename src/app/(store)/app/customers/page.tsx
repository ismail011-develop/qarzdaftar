import { ScreenStub } from "@/components/ScreenStub";

export default function Page() {
  return <ScreenStub title="Mijozlar" proto="Store App → Mijozlar (+ Mijoz qoʻshish)" api={["GET /api/customers?q=", "POST /api/customers", "GET /api/customers/:id", "PATCH /api/customers/:id"]} />;
}
