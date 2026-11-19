import { ScreenStub } from "@/components/ScreenStub";

export default function Page() {
  return <ScreenStub title="Obuna" proto="Store App → Profil (obuna)" api={["GET /api/subscriptions", "POST /api/subscriptions"]} />;
}
