import Link from "next/link";
import { AlertTriangle, Inbox, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";

export function PageLoadingState({ title = "Loading workspace..." }: { title?: string }) {
  return (
    <Card className="flex items-center gap-3">
      <LoaderCircle className="size-5 animate-spin text-[var(--brand-700)]" />
      <p className="text-sm text-[var(--ink-700)]">{title}</p>
    </Card>
  );
}

export function PageErrorState({
  title = "Something went wrong",
  message = "This page could not be loaded with the current data source.",
  backHref,
}: {
  title?: string;
  message?: string;
  backHref?: string;
}) {
  return (
    <Card className="space-y-3 border-[color-mix(in_srgb,#ca4867_40%,var(--line))]">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-5 text-[#ca4867]" />
        <CardTitle>{title}</CardTitle>
      </div>
      <CardMeta>{message}</CardMeta>
      {backHref ? (
        <Link href={backHref}>
          <Button variant="secondary">Back</Button>
        </Link>
      ) : null}
    </Card>
  );
}

export function PageEmptyState({
  title = "No records available",
  message = "There is currently no data to display for this page.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <Card className="space-y-2">
      <div className="flex items-center gap-2">
        <Inbox className="size-5 text-[var(--ink-500)]" />
        <CardTitle>{title}</CardTitle>
      </div>
      <CardMeta>{message}</CardMeta>
    </Card>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="h-10 animate-pulse rounded-lg bg-[var(--surface-2)]" />
      ))}
    </div>
  );
}
