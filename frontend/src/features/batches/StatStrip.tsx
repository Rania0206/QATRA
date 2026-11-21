import type { ReactNode } from "react";
import type { Batch, Tag } from "../../api/types";
import TagChip from "../../components/TagChip";
import ComplianceBadge from "./ComplianceBadge";
import { PERIMETER, fmtDate, fmtNumber } from "./format";
import { Skeleton } from "./ui";

function Stat({ value, unit, caption, tag, extra }: { value: string; unit: string; caption: string; tag: Tag; extra?: ReactNode }) {
  return (
    <div className="q-card flex flex-col justify-between gap-4 p-5">
      <p className="q-display text-5xl xl:text-[64px]">
        {value}
        <span className="ml-2 text-3xl xl:text-4xl">{unit}</span>
      </p>
      <div className="space-y-2">
        <p className="q-label">{caption}</p>
        <div className="flex flex-wrap items-center gap-2">
          {extra}
          <TagChip tag={tag} />
        </div>
      </div>
    </div>
  );
}

export default function StatStrip({ latest }: { latest?: Batch }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Stat
        value={fmtNumber(PERIMETER.equipped_ha)}
        unit="HA"
        caption={`${PERIMETER.name} · equipped for treated water`}
        tag={PERIMETER.tag}
      />
      <Stat
        value={fmtNumber(PERIMETER.delivered_m3)}
        unit="M³"
        caption={`Delivered to farms in ${PERIMETER.season}`}
        tag={PERIMETER.tag}
      />
      {latest ? (
        <Stat
          value={fmtNumber(latest.volume_m3)}
          unit="M³"
          caption={`Today's batch · ${fmtDate(latest.date)}`}
          tag={latest.tag}
          extra={<ComplianceBadge status={latest.status} />}
        />
      ) : (
        <div className="q-card space-y-4 p-5">
          <Skeleton className="h-14 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-7 w-3/4" />
        </div>
      )}
    </div>
  );
}
