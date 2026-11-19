import { ScreenStub } from "@/components/ScreenStub";

export default function Page() {
  return <ScreenStub title="Bildirishnomalar" proto="Store App → Bildirishnomalar" api={["GET /api/notifications", "PATCH /api/notifications"]} />;
}
