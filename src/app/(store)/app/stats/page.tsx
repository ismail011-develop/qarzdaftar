import { ScreenStub } from "@/components/ScreenStub";

export default function Page() {
  return <ScreenStub title="Statistika" proto="Store App → Statistika" api={["GET /api/stats?from=&to="]} />;
}
