import { ScreenStub } from "@/components/ScreenStub";

export default function AdminDashboard() {
  return <ScreenStub title="Dashboard" proto="Admin Panel → Dashboard" api={["GET /api/admin/dashboard"]} />;
}
