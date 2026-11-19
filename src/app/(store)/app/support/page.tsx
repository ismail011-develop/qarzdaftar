import { ScreenStub } from "@/components/ScreenStub";

export default function Page() {
  return <ScreenStub title="Qoʻllab-quvvatlash (chat)" proto="Store App → Profil → Adminga yozish" api={["GET /api/support/conversations", "POST /api/support/conversations", "GET|POST /api/support/conversations/:id/messages", "Realtime: support_messages"]} />;
}
