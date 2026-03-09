import type { StudentHistoryRow } from "@/types/models";

export const STATIC_SEQUENCE = ["p-101", "t-102", "m-201", "fc-301"] as const;

export function nextStaticArtifactId(history: StudentHistoryRow[]) {
  const completed = new Set(history.map((row) => row.artifactId));
  return STATIC_SEQUENCE.find((artifactId) => !completed.has(artifactId)) ?? null;
}
