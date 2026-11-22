import { C, useLang } from "../i18n";

interface Props {
  error: Error | string;
  onRetry?: () => void;
}

export default function ErrorBox({ error, onRetry }: Props) {
  const { lang } = useLang();
  const message = typeof error === "string" ? error : error.message;
  return (
    <div role="alert" className="border border-bad bg-cream px-6 py-8 text-center">
      <h3 className="text-3xl text-bad">{C.error[lang]}</h3>
      <p dir="ltr" className="mx-auto mt-3 max-w-xl break-words text-[length:calc(15px*var(--fs))]">
        {message}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn mt-6">
          {C.retry[lang]}
        </button>
      )}
    </div>
  );
}
