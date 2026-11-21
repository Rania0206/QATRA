import type { Decision } from "../../api/types";
import { DECISION, type Lang } from "./format";

export default function DecisionBadge({ decision, lang, large = false }: { decision: Decision; lang: Lang; large?: boolean }) {
  const d = DECISION[decision];
  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg font-bold ${d.cls} ${
        large ? "px-4 py-2 text-xl" : "px-3 py-1 text-base"
      }`}
    >
      <span aria-hidden="true">{d.icon}</span>
      {d[lang]}
    </span>
  );
}
