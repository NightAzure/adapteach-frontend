"use client";

// ---------------------------------------------------------------------------
// Data-dependency analysis — lets us accept any semantically valid ordering,
// not just the single solutionOrder the LLM happened to emit.
// ---------------------------------------------------------------------------

/** Python keywords + common builtins that are never "defined" by a student line. */
const PY_KEYWORDS = new Set([
  "False","None","True","and","as","assert","async","await","break","class",
  "continue","def","del","elif","else","except","finally","for","from",
  "global","if","import","in","is","lambda","nonlocal","not","or","pass",
  "raise","return","try","while","with","yield",
  // common builtins
  "print","range","len","int","str","float","bool","list","dict","set",
  "tuple","type","input","abs","max","min","sum","zip","enumerate","map",
  "filter","sorted","reversed","open","isinstance","hasattr","getattr",
  "append","extend","insert","remove","pop","index","count","split","join",
  "strip","upper","lower","format","replace","find",
]);

/** Remove string literals so identifiers inside them aren't treated as variable uses. */
function stripStrings(src: string): string {
  return src.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
}

/** Extract user-defined identifier names from an expression string. */
function extractIds(expr: string): Set<string> {
  const ids = new Set<string>();
  for (const m of stripStrings(expr).matchAll(/\b([A-Za-z_]\w*)\b/g)) {
    if (!PY_KEYWORDS.has(m[1])) ids.add(m[1]);
  }
  return ids;
}

/** Returns { defined, used } name sets for a single Python source line. */
function lineSymbols(src: string): { defined: Set<string>; used: Set<string> } {
  const defined = new Set<string>();
  const used    = new Set<string>();
  const s = src.trim();
  if (!s || s.startsWith("#")) return { defined, used };

  // Simple / annotated assignment: name = ...  /  name: type = ...
  const assign = s.match(/^([A-Za-z_]\w*)\s*(?::[^=]*)?\s*=\s*(.+)$/);
  if (assign && !s.startsWith("=")) {
    defined.add(assign[1]);
    for (const id of extractIds(assign[2])) used.add(id);
    return { defined, used };
  }
  // Augmented assignment: name += / -= / ...
  const aug = s.match(/^([A-Za-z_]\w*)\s*[+\-*/%&|^]=\s*(.+)$/);
  if (aug) {
    defined.add(aug[1]); used.add(aug[1]);
    for (const id of extractIds(aug[2])) used.add(id);
    return { defined, used };
  }
  // for-loop variable
  const forM = s.match(/^for\s+(.+?)\s+in\s+(.+):$/);
  if (forM) {
    for (const v of forM[1].split(",")) {
      const vt = v.trim();
      if (/^[A-Za-z_]\w*$/.test(vt)) defined.add(vt);
    }
    for (const id of extractIds(forM[2])) used.add(id);
    return { defined, used };
  }
  // def / class: defines the name
  const defM = s.match(/^(?:async\s+)?def\s+([A-Za-z_]\w*)|^class\s+([A-Za-z_]\w*)/);
  if (defM) {
    defined.add((defM[1] ?? defM[2])!);
    for (const id of extractIds(s.replace(/^(?:async\s+)?def\s+\w+|^class\s+\w+/, "")))
      used.add(id);
    return { defined, used };
  }
  // Everything else: only loads (function calls, return, print, …)
  for (const id of extractIds(s)) used.add(id);
  return { defined, used };
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

/**
 * Returns true if `userOrder` is a semantically valid ordering of `lines`.
 *
 * Strategy:
 *  1. Rebuild the canonical correct sequence from `solutionOrder`.
 *  2. Build data-flow edges: for each line that *uses* a name, find the
 *     earlier canonical line that *defines* that name → must-come-before edge.
 *  3. Add structural edges for indented lines (block headers) and
 *     else/elif/except/finally (must follow same-indented predecessor).
 *  4. Fall back to exact match if no edges were found (e.g. pure print calls
 *     with no variable flow — the order IS meaningful there).
 *  5. Check that every edge is satisfied by `userOrder`.
 */
function isParsonsOrderingValid(
  lines: string[],
  solutionOrder: number[],
  userOrder: number[],
): boolean {
  const canonical = solutionOrder.map((i) => lines[i]);
  const syms = canonical.map(lineSymbols);

  // name → canonical position where it is first defined
  const firstDef = new Map<string, number>();
  for (let pos = 0; pos < canonical.length; pos++)
    for (const name of syms[pos].defined)
      if (!firstDef.has(name)) firstDef.set(name, pos);

  // edges: (origIndexA must come before origIndexB)
  const edges: Array<[number, number]> = [];

  // data-flow edges
  for (let usePos = 0; usePos < canonical.length; usePos++) {
    for (const name of syms[usePos].used) {
      const defPos = firstDef.get(name);
      if (defPos !== undefined && defPos !== usePos)
        edges.push([solutionOrder[defPos], solutionOrder[usePos]]);
    }
  }
  // structural edges: indented line must follow its block header
  for (let pos = 1; pos < canonical.length; pos++) {
    const cur = indentOf(canonical[pos]);
    if (cur > 0) {
      for (let prev = pos - 1; prev >= 0; prev--) {
        if (indentOf(canonical[prev]) < cur) {
          edges.push([solutionOrder[prev], solutionOrder[pos]]);
          break;
        }
      }
    }
    // else/elif/except/finally must follow the same-indented predecessor
    const stripped = canonical[pos].trimStart();
    if (/^(else:|elif\b|except\b|finally:)/.test(stripped)) {
      const same = indentOf(canonical[pos]);
      for (let prev = pos - 1; prev >= 0; prev--) {
        if (indentOf(canonical[prev]) === same) {
          edges.push([solutionOrder[prev], solutionOrder[pos]]);
          break;
        }
      }
    }
  }

  // fall back to exact match when no dependency edges were found
  if (edges.length === 0)
    return userOrder.every((v, i) => v === solutionOrder[i]);

  // check userOrder satisfies every edge
  const posInUser = new Map<number, number>();
  userOrder.forEach((origIdx, pos) => posInUser.set(origIdx, pos));
  return edges.every(([a, b]) => (posInUser.get(a) ?? -1) < (posInUser.get(b) ?? -1));
}

// ---------------------------------------------------------------------------

import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, GripVertical, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ArtifactSubmitResult } from "@/components/artifacts/artifact-renderer";

type LineItem = { id: string; text: string; originalIndex: number };

function SortableLine({
  line,
  index,
  total,
  isCorrect,
  annotation,
  locked,
}: {
  line: LineItem;
  index: number;
  total: number;
  isCorrect?: boolean;
  annotation?: string;
  locked?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: line.id,
    disabled: locked,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-stretch rounded-[var(--radius-md)] border text-sm outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[var(--brand-600)] ${
        isDragging
          ? "rotate-1 scale-[1.01] opacity-80 shadow-[var(--shadow-popover)]"
          : isCorrect
            ? "border-emerald-500 bg-emerald-500/10"
            : "border-[var(--line)] bg-[var(--surface-0)] hover:border-[var(--brand-500)] hover:shadow-[var(--shadow-card)]"
      } ${isDragging ? "touch-none" : ""}`}
      aria-label={`Code line ${index + 1} of ${total}`}
    >
      {/* Grip handle — wider tap target on mobile */}
      <button
        className={`flex items-center justify-center rounded-l-[var(--radius-md)] px-3 text-[var(--ink-400)] transition-colors group-hover:bg-[var(--surface-2)] group-hover:text-[var(--ink-600)] touch-none ${
          isCorrect ? "text-emerald-400" : ""
        } ${locked ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing"}`}
        {...attributes}
        {...(locked ? {} : listeners)}
        aria-label="Drag handle"
        tabIndex={-1}
        disabled={locked}
      >
        <GripVertical className="size-5 shrink-0" />
      </button>

      {/* Line content */}
      <div className="flex flex-1 items-center gap-2 overflow-hidden py-2.5 pr-3">
        <code
          className={`min-w-0 overflow-x-auto whitespace-pre font-mono text-[12px] leading-relaxed sm:text-[13px] ${
            isCorrect ? "text-emerald-800" : "text-[var(--ink-800)]"
          }`}
        >
          {line.text}
        </code>
        {annotation && (
          <button
            title={annotation}
            className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 hover:bg-blue-200"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >?</button>
        )}
      </div>

      {/* Correctness indicator */}
      {isCorrect !== undefined && (
        <div className="flex items-center pr-3">
          <CheckCircle2 className="size-4 text-emerald-500" />
        </div>
      )}
    </div>
  );
}

export function ParsonsBoard({
  lines,
  solutionOrder,
  lineAnnotations,
  onResult,
  locked,
}: {
  lines: string[];
  solutionOrder?: number[];
  lineAnnotations?: string[];
  onResult?: (result: ArtifactSubmitResult) => void;
  locked?: boolean;
}) {
  const sensors = useSensors(
    // Mouse: activate after tiny movement to avoid blocking clicks
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // Touch: delay 250 ms so normal page scrolling still works; tolerance allows
    // slight finger movement during the hold without cancelling the drag
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [items, setItems] = useState<LineItem[]>(() => {
    const arr = lines.map((text, index) => ({ id: `line-${index}`, text, originalIndex: index }));
    // Fisher-Yates shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle");
  const [shaking, setShaking] = useState(false);

  const expected = useMemo(
    () => solutionOrder ?? lines.map((_, index) => index),
    [solutionOrder, lines],
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIdx = prev.findIndex((it) => it.id === active.id);
      const newIdx = prev.findIndex((it) => it.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
    if (result !== "idle") setResult("idle");
  };

  const checkAnswer = () => {
    const userOrder = items.map((it) => it.originalIndex);
    const correct = isParsonsOrderingValid(lines, expected, userOrder);
    setResult(correct ? "correct" : "incorrect");

    if (!correct) {
      setShaking(true);
      setTimeout(() => setShaking(false), 450);
    }

    onResult?.({
      score: correct ? 1 : 0,
      responseSummary: correct
        ? "Submitted correct parsons line order."
        : "Submitted incorrect parsons line order.",
      responseData: { userOrder, expectedOrder: expected },
    });
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--ink-900)]">
          Arrange the code lines in correct order
        </h3>
        {result === "correct" && (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 animate-pop">
            <CheckCircle2 className="size-4" /> Correct!
          </span>
        )}
        {result === "incorrect" && (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-rose-600">
            <XCircle className="size-4" /> Not quite — try again
          </span>
        )}
      </div>

      <p id="parsons-instructions" className="text-xs text-[var(--ink-500)]">
        Drag lines using the grip handle or use keyboard arrow keys after focusing a line.
      </p>

      <p className="sr-only" aria-live="polite">
        {result === "correct"
          ? "Answer marked correct."
          : result === "incorrect"
            ? "Answer marked incorrect."
            : ""}
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div
            className={`space-y-2 ${shaking ? "animate-shake" : ""}`}
            aria-describedby="parsons-instructions"
            role="list"
          >
            {items.map((line, index) => (
              <SortableLine
                key={line.id}
                line={line}
                index={index}
                total={items.length}
                isCorrect={result === "correct" ? true : undefined}
                annotation={lineAnnotations?.[line.originalIndex]}
                locked={locked}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex justify-end">
        <Button type="button" onClick={checkAnswer} disabled={locked}>
          Check Order
        </Button>
      </div>
    </Card>
  );
}
