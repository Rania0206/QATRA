import Placeholder from "../../components/Placeholder";

// TODO: implement the Messages feature
export default function MessagesTab() {
  return <Placeholder title="Messages" endpoints={["GET /api/messages", "POST /api/messages/reply"]} />;
}
