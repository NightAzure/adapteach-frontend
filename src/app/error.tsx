"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageErrorState } from "@/components/ui/page-states";

export default function RootError({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <PageErrorState
        title="Something went wrong"
        message="An unexpected error occurred. Please try again or return to the home page."
        backHref="/"
      />
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
