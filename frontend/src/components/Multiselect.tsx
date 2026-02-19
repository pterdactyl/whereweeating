import { useEffect, useMemo, useRef, useState } from "react";

type MultiSelectProps = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxChips?: number;
};

export default function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = "Choose…",
  maxChips = 3,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // close on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.toLowerCase().includes(q));
  }, [options, query]);

  const isSelected = (opt: string) =>
    selected.some(s => s.toLowerCase() === opt.toLowerCase());

  const toggle = (opt: string) => {
    const exists = isSelected(opt);
    const next = exists
      ? selected.filter(s => s.toLowerCase() !== opt.toLowerCase())
      : [...selected, opt];
    onChange(next);
  };

  const removeChip = (opt: string) => {
    onChange(selected.filter(s => s.toLowerCase() !== opt.toLowerCase()));
  };

  const clearAll = () => onChange([]);

  const shownChips = selected.slice(0, maxChips);
  const extraCount = Math.max(0, selected.length - maxChips);

  return (
    <div className="w-full" ref={wrapRef}>
      <label className="text-sm font-medium block mb-2">{label}</label>

      <button
        type="button"
        onClick={() => {
          setOpen(v => !v);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={[
          "w-full min-h-[44px] px-3 py-2 rounded-md border",
          "bg-white/90 text-left flex items-center gap-2 flex-wrap",
          "border-gray-200 hover:border-gray-300 transition-colors",
          open ? "ring-2 ring-black/10" : "",
        ].join(" ")}
      >
        {selected.length > 0 ? (
          <>
            {shownChips.map(v => (
              <span
                key={v}
                className="inline-flex items-center gap-2 rounded-full bg-black text-white text-xs sm:text-sm px-3 py-1"
              >
                {v}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeChip(v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      removeChip(v);
                    }
                  }}
                  className="opacity-80 hover:opacity-100 cursor-pointer"
                  aria-label={`Remove ${v}`}
                >
                  ✕
                </span>
              </span>
            ))}

            {extraCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-gray-200 text-gray-800 text-xs sm:text-sm px-3 py-1">
                +{extraCount}
              </span>
            )}
          </>
        ) : (
          <span className="text-gray-500 text-sm">{placeholder}</span>
        )}

        <span className="ml-auto text-gray-500">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="mt-2 w-full rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
          {/* Search + actions */}
          <div className="p-2 border-b border-gray-100 flex items-center gap-2">
            <div className="flex-1">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            {selected.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs px-3 py-2 rounded-md border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-black"
              >
                Clear
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-auto p-2">
            {filteredOptions.length === 0 ? (
              <div className="text-sm text-gray-500 px-2 py-3">No results</div>
            ) : (
              <ul className="space-y-1">
                {filteredOptions.map(opt => {
                  const checked = isSelected(opt);
                  return (
                    <li key={opt}>
                      <button
                        type="button"
                        onClick={() => toggle(opt)}
                        className={[
                          "w-full flex items-center gap-3 px-2 py-2 rounded-md",
                          "hover:bg-gray-50 transition-colors",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "h-4 w-4 rounded border flex items-center justify-center",
                            checked ? "bg-black border-black" : "bg-white border-gray-300",
                          ].join(" ")}
                        >
                          {checked && <span className="text-white text-[10px] leading-none">✓</span>}
                        </span>
                        <span className="text-sm text-gray-900">{opt}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
