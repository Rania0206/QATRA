import type { Decision } from "../../api/types";
import { Badge } from "../batches/ui";
import { DECISION, type Lang } from "./format";

export default function DecisionBadge({ decision, lang, size = "md" }: { decision: Decision; lang: Lang; size?: "md" | "lg" | "xl" }) {
  const d = DECISION[decision];
  return <Badge tone={d.tone} icon={d.icon} label={d[lang]} size={size} />;
}
