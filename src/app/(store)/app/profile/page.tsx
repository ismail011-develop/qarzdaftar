import { ScreenStub } from "@/components/ScreenStub";

export default function Page() {
  return <ScreenStub title="Profil va sozlamalar" proto="Store App → Profil" api={["GET /api/store", "PATCH /api/store"]} />;
}
