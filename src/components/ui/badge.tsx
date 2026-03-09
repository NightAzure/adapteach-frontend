import { cn } from "@/lib/utils/cn";

const toneStyles = {
  adaptive: "bg-emerald-100 text-emerald-800 border-emerald-200",
  static:   "bg-stone-100 text-stone-700 border-stone-200",
  easy:     "bg-cyan-100 text-cyan-800 border-cyan-200",
  moderate: "bg-amber-100 text-amber-800 border-amber-200",
  hard:     "bg-rose-100 text-rose-800 border-rose-200",
  admin:    "bg-orange-100 text-orange-800 border-orange-200",
  // concept colors
  arrays:      "bg-teal-100 text-teal-800 border-teal-200",
  loops:       "bg-purple-100 text-purple-800 border-purple-200",
  functions:   "bg-blue-100 text-blue-800 border-blue-200",
  strings:     "bg-pink-100 text-pink-800 border-pink-200",
  dicts:       "bg-violet-100 text-violet-800 border-violet-200",
  classes:     "bg-indigo-100 text-indigo-800 border-indigo-200",
  exceptions:  "bg-red-100 text-red-800 border-red-200",
  files:       "bg-yellow-100 text-yellow-800 border-yellow-200",
  recursion:   "bg-lime-100 text-lime-800 border-lime-200",
};

type Tone = keyof typeof toneStyles;

/** Map a concept string to a tone key */
function conceptTone(label: string): Tone {
  const key = label.toLowerCase().replace(/[^a-z]/g, "") as Tone;
  return key in toneStyles ? key : "static";
}

export function Badge({
  label,
  tone,
  concept,
}: {
  label: string;
  tone?: Tone;
  /** If true, derive tone automatically from the label (concept names) */
  concept?: boolean;
}) {
  const resolvedTone: Tone = tone ?? (concept ? conceptTone(label) : "static");
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]",
        toneStyles[resolvedTone],
      )}
    >
      {label}
    </span>
  );
}
