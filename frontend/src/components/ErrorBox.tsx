interface Props {
  error: Error | string;
  onRetry?: () => void;
}

export default function ErrorBox({ error, onRetry }: Props) {
  const message = typeof error === "string" ? error : error.message;
  return (
    <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
      <p className="text-sm font-semibold">Something went wrong</p>
      <p className="mt-1 break-words font-mono text-xs">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded bg-red-700 px-3 py-1 text-sm font-medium text-white hover:bg-red-800"
        >
          Retry
        </button>
      )}
    </div>
  );
}
