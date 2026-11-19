import { ScreenStub } from "@/components/ScreenStub";

export default function StoreHome() {
  return <ScreenStub title="Bosh sahifa" proto="Store App → Bosh" api={["GET /api/stats", "GET /api/payments?limit=5", "GET /api/notifications?unread=1"]} />;
}
