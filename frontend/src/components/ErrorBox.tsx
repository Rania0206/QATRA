interface Props {
  error: Error | string;
  onRetry?: () => void;
}

export default function ErrorBox({ error, onRetry }: Props) {
  const message = typeof error === "string" ? error : error.message;
  return (
    <div role="alert" className="border border-bad bg-cream px-6 py-8 text-center">
      <h3 className="text-3xl text-bad">Something went wrong.</h3>
      <p className="mx-auto mt-3 max-w-xl break-words text-[15px]">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn mt-6">
          Try again
        </button>
      )}
    </div>
  );
}
