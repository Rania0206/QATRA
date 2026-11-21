import Placeholder from "../../components/Placeholder";

// TODO: implement the Public feature
export default function PublicTab() {
  return <Placeholder title="Public" endpoints={["POST /api/requests", "GET /api/requests", "PATCH /api/requests/{id}", "GET /api/meta/sources"]} />;
}
