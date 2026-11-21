import Placeholder from "../../components/Placeholder";

// TODO: implement the Batches feature
export default function BatchesTab() {
  return <Placeholder title="Batches" endpoints={["GET /api/batches", "GET /api/batches/{id}", "POST /api/batches", "GET /api/batches/{id}/passport", "GET /api/batches/{id}/risk", "GET /api/anomalies"]} />;
}
