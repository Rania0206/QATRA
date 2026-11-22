import { useState, type FormEvent } from "react";
import { get } from "../api/client";
import type { Farm } from "../api/types";
import { useApi } from "../hooks/useApi";
import { FARM, useLang } from "../i18n";

/** "Your farm code" box. The code is checked against the farm list but the list is never shown. */
export default function FarmCodeForm({ onSubmit }: { onSubmit: (code: string) => void }) {
  const { lang } = useLang();
  const farms = useApi<Farm[]>(() => get<Farm[]>("/api/farms"));
  const [input, setInput] = useState("");
  const [notFound, setNotFound] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const code = input.trim().toUpperCase();
    if (!code) return;
    if (farms.data && !farms.data.some((f) => f.id.toUpperCase() === code)) {
      setNotFound(true);
      return;
    }
    onSubmit(code);
  };

  return (
    <form onSubmit={submit} className="fade-up mx-auto mt-10 flex max-w-md flex-col items-center gap-3">
      <label htmlFor="farm-code" className="text-[17px]">
        {FARM.codeLabel[lang]}
      </label>
      <div className="flex w-full gap-2">
        <input
          id="farm-code"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setNotFound(false);
          }}
          autoComplete="off"
          maxLength={12}
          dir="ltr"
          className="min-w-0 flex-1 border border-ink bg-cream px-4 py-3 text-center text-[20px] uppercase tracking-widest focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          aria-invalid={notFound}
          aria-describedby="farm-code-hint"
        />
        <button type="submit" className="btn min-w-0 bg-ink text-cream">
          {FARM.see[lang]}
        </button>
      </div>
      <p id="farm-code-hint" className={`text-[15px] ${notFound ? "font-medium text-bad" : ""}`}>
        {notFound ? FARM.notFound[lang] : FARM.codeHint[lang]}
      </p>
    </form>
  );
}
