import Placeholder from "../../components/Placeholder";

// TODO: implement the Allocation feature
export default function AllocationTab() {
  return <Placeholder title="Allocation" endpoints={["GET /api/forecast/needs", "GET /api/forecast/supply", "POST /api/allocate", "POST /api/explain"]} />;
}
