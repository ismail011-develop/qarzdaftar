import { ScreenStub } from "@/components/ScreenStub";

export default function Page() {
  return <ScreenStub title="Support / Chat" proto="Admin → Chat" api={["GET /api/support/conversations", "GET|POST /api/support/conversations/:id/messages", "POST /api/support/conversations/:id/close", "Realtime: support_messages"]} />;
}
