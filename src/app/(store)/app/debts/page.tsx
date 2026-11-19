import { ScreenStub } from "@/components/ScreenStub";

export default function Page() {
  return <ScreenStub title="Qarzlar" proto="Store App → Qarzlar (+ Qarz qoʻshish, tafsilot)" api={["GET /api/debts", "POST /api/debts", "PATCH /api/debts/:id", "POST /api/debts/:id/payments", "POST /api/debts/:id/settle"]} />;
}
