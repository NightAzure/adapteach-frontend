import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";

export default function StudentNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <Card className="max-w-md space-y-4 text-center">
        <div className="flex justify-center">
          <FileQuestion className="size-10 text-[var(--ink-400)]" />
        </div>
        <div>
          <CardTitle className="text-xl">Page not found</CardTitle>
          <CardMeta className="mt-1">
            This page does not exist or has been moved.
          </CardMeta>
        </div>
        <Link href="/student/dashboard">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </Card>
    </div>
  );
}
