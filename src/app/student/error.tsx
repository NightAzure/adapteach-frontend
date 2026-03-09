"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageErrorState } from "@/components/ui/page-states";

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-3">
      <PageErrorState
        title="Student page crashed"
        message="An unexpected runtime error occurred while rendering this route."
      />
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
