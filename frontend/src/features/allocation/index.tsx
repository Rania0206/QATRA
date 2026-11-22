import { useEffect, useState } from "react";
import ErrorBox from "../../components/ErrorBox";
import FarmCodeForm from "../../components/FarmCodeForm";
import { Band, Intro, Skeleton } from "../../components/ui";
import { USE_MOCKS } from "../../config";
import { getFarmCode, saveFarmCode } from "../../farm";
import { fmtDateL, useLang } from "../../i18n";
import { useOperatorView } from "../compatibility/OperatorView";
import AllocationCard from "./AllocationCard";
import OperatorAllocation from "./OperatorView";
import { DemoTag, Notes } from "./Notes";
import { usePlan } from "./data";
import { A, farmerWarnings } from "./texts";

/** "How much water does my farm get today?" - one farm only. A farmer never sees other farms. */
function FarmerAllocation() {
  const { lang } = useLang();
  const [farmCode, setFarmCode] = useState<string | null>(getFarmCode);
  const [badCode, setBadCode] = useState(false); // a saved or linked code that does not exist
  const plan = usePlan();
  const d = plan.data;

  const farm = farmCode ? d?.farms.find((f) => f.id.toUpperCase() === farmCode) : undefined;
  const item = farm ? d?.allocation.items.find((i) => i.farm_id === farm.id) : undefined;
  const money = farm ? d?.savings?.items.find((i) => i.farm_id === farm.id) : undefined;
  const compat = farm ? d?.compat?.items.find((i) => i.farm_id === farm.id) : undefined;

  // a remembered or linked code that does not exist: ask again
  useEffect(() => {
    if (farmCode && d && !farm) {
      setBadCode(true);
      setFarmCode(null);
      saveFarmCode(null);
    }
  }, [farmCode, d, farm]);

  const choose = (code: string) => {
    setBadCode(false);
    setFarmCode(code);
    saveFarmCode(code);
  };
  const change = () => {
    setFarmCode(null);
    saveFarmCode(null);
  };

  return (
    <>
      <Band tone="olive" className="md:py-24">
        <Intro as="h1" size="xl" eyebrow={A.eyebrow[lang]} title={A.title[lang]}>
          <p>{farmCode ? A.leadOwn[lang] : A.leadCode[lang]}</p>
          {farmCode && d?.savings?.date && (
            <p className="mt-4 text-[16px]">
              {A.planFor[lang]} {fmtDateL(d.savings.date, lang)}
            </p>
          )}
        </Intro>
        {!farmCode && <FarmCodeForm onSubmit={choose} notFound={badCode} />}
      </Band>

      {farmCode && (
        <Band tone="cream">
          {USE_MOCKS && <p className="mb-6 text-center text-[15px]">{A.mockNote[lang]}</p>}
          {plan.error ? (
            <ErrorBox error={plan.error} onRetry={plan.reload} />
          ) : !d || !farm ? (
            <div className="mx-auto max-w-2xl space-y-4" aria-busy="true">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : !item ? (
            <p className="text-center text-[17px]">{A.noFarmPlan[lang]}</p>
          ) : (
            <>
              <AllocationCard farm={farm} item={item} money={money} compat={compat} lang={lang} large onChange={change} />
              <Notes warnings={farmerWarnings([...d.allocation.warnings, ...(d.savings?.warnings ?? [])], farm.id)} lang={lang} />
              <DemoTag lang={lang} />
            </>
          )}
        </Band>
      )}
    </>
  );
}

/** Farmers get their own farm only. The all-farms operator view is a hidden demo mode (#/allocation?view=operator). */
export default function AllocationTab() {
  return useOperatorView() ? <OperatorAllocation /> : <FarmerAllocation />;
}
