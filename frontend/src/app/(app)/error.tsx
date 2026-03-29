"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground max-w-sm">{t("description")}</p>
      </div>
      <div className="flex gap-3">
        <Button onClick={reset}>{t("tryAgain")}</Button>
        <Button variant="outline" render={<Link href="/dashboard" />}>
          {t("goHome")}
        </Button>
      </div>
    </div>
  );
}
