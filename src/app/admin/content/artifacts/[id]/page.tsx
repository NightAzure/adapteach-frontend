"use client";

import { useParams } from "next/navigation";
import { ArtifactRenderer } from "@/components/artifacts/artifact-renderer";
import { Badge } from "@/components/ui/badge";
import { Card, CardMeta } from "@/components/ui/card";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/ui/page-states";
import { SectionHeader } from "@/components/ui/section-header";
import { useArtifact } from "@/lib/hooks/queries";

export default function AdminArtifactDetailPage() {
  const params = useParams<{ id: string }>();
  const artifact = useArtifact(params?.id ?? "");

  if (artifact.isLoading) return <PageLoadingState title="Loading artifact detail..." />;
  if (artifact.isError) return <PageErrorState title="Artifact preview failed to load" backHref="/admin/content" />;
  if (!artifact.data) return <PageEmptyState title="Artifact not found" />;

  const item = artifact.data;

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Admin Artifact Review"
        title={item.title}
        subtitle={item.prompt}
      />

      <Card className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge label={item.type} tone="static" />
          <Badge label={item.difficulty} tone={item.difficulty} />
          <Badge label={item.concept} tone="admin" />
        </div>
        <CardMeta>Preview reflects the exact student interaction component used in session delivery.</CardMeta>
      </Card>

      <ArtifactRenderer artifact={item} />
    </div>
  );
}

