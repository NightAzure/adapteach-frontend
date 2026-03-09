"use client";

import { ParsonsBoard } from "@/components/artifacts/parsons/parsons-board";
import { TracingPanel } from "@/components/artifacts/tracing/tracing-panel";
import { MutationWorkbench } from "@/components/artifacts/mutation/mutation-workbench";
import { FlashcardPanel } from "@/components/artifacts/flashcard/flashcard-panel";
import { Card } from "@/components/ui/card";
import type { Artifact } from "@/types/models";

export interface ArtifactSubmitResult {
  score: number;
  responseSummary: string;
  responseData?: Record<string, unknown>;
}

export function ArtifactRenderer({
  artifact,
  onSubmit,
  locked,
}: {
  artifact: Artifact;
  onSubmit?: (result: ArtifactSubmitResult) => void;
  locked?: boolean;
}) {
  switch (artifact.type) {
    case "parsons":
      return (
        <ParsonsBoard
          key={artifact.id}
          lines={artifact.lines ?? []}
          solutionOrder={artifact.solutionOrder}
          lineAnnotations={artifact.lineAnnotations}
          onResult={onSubmit}
          locked={locked}
        />
      );
    case "tracing":
      return <TracingPanel key={artifact.id} artifact={artifact} onResult={onSubmit} locked={locked} />;
    case "mutation":
      return <MutationWorkbench key={artifact.id} artifact={artifact} onResult={onSubmit} locked={locked} />;
    case "flashcard":
      return <FlashcardPanel key={artifact.id} artifact={artifact} onResult={onSubmit} locked={locked} />;
    default:
      return <Card>Unsupported artifact type.</Card>;
  }
}
