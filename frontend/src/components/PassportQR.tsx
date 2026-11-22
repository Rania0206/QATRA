import { QRCodeSVG } from "qrcode.react";
import { useLang, type Lang } from "../i18n";

const T: Record<string, Record<Lang, string>> = {
  title: { en: "Batch passport", fr: "Passeport du lot", ar: "جواز الدفعة" },
  hint: { en: "Scan to open it on a phone", fr: "Scanner pour l'ouvrir sur un téléphone", ar: "امسح الرمز لفتحه على الهاتف" },
  open: { en: "Open the passport", fr: "Ouvrir le passeport", ar: "فتح الجواز" },
  local: {
    en: "This address only works on this computer. To scan it with a phone, open QATRA through the laptop's network address (npm run dev:lan).",
    fr: "Cette adresse ne fonctionne que sur cet ordinateur. Pour la scanner avec un téléphone, ouvrez QATRA via l'adresse réseau de l'ordinateur (npm run dev:lan).",
    ar: "هذا العنوان يعمل على هذا الحاسوب فقط. لمسحه بالهاتف، افتح QATRA عبر عنوان الشبكة للحاسوب (npm run dev:lan).",
  },
};

const isLocal = (host: string) => host === "localhost" || host === "127.0.0.1" || host === "[::1]";

/** URL of a batch passport on this site: window.location.origin + /passport/{id}. */
export const passportUrl = (batchId: string) => `${window.location.origin}/passport/${encodeURIComponent(batchId)}`;

/** QR code that opens the passport page of a batch. Reusable on any screen that shows a batch. */
export default function PassportQR({ batchId, size = 128 }: { batchId: string; size?: number }) {
  const { lang } = useLang();
  const url = passportUrl(batchId);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="shrink-0 border border-line bg-white p-2" role="img" aria-label={`${T.title[lang]} ${batchId}: QR code`}>
          <QRCodeSVG value={url} size={size} level="M" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-[length:calc(15px*var(--fs))] text-ink-soft">{T.hint[lang]}</p>
          <a href={url} target="_blank" rel="noreferrer" className="link text-[length:calc(15px*var(--fs))]">
            {T.open[lang]}
          </a>
          <p dir="ltr" className="break-all text-start text-[length:calc(12px*var(--fs))] text-ink-soft">
            {url}
          </p>
        </div>
      </div>
      {isLocal(window.location.hostname) && <p className="text-[length:calc(13px*var(--fs))] leading-snug text-warn">{T.local[lang]}</p>}
    </div>
  );
}
