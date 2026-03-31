"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslations } from "next-intl";
import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/use-accounts";
import { cn } from "@/lib/utils";

interface UploadStepProps {
  selectedAccountId: number | null;
  onAccountChange: (id: number) => void;
  onFileSelected: (file: File) => void;
}

function FileTypeBadge({ filename }: { filename: string }) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">PDF</span>;
  if (ext === "csv") return <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">CSV</span>;
  return <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">XLSX</span>;
}

export function UploadStep({ selectedAccountId, onAccountChange, onFileSelected }: UploadStepProps) {
  const t = useTranslations("import.upload");
  const { data: accountsResp } = useAccounts();
  const accounts = accountsResp?.data ?? [];

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles[0]) onFileSelected(acceptedFiles[0]);
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const selectedFile = acceptedFiles[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Account selector */}
      <div className="space-y-2">
        <Label htmlFor="account-select">{t("account")}</Label>
        <Select
          value={selectedAccountId ? String(selectedAccountId) : ""}
          onValueChange={(v) => onAccountChange(Number(v))}
        >
          <SelectTrigger id="account-select" className="w-full">
            <SelectValue placeholder={t("selectAccount")} />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((acct) => (
              <SelectItem key={acct.id} value={String(acct.id)}>
                {acct.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="size-10 text-muted-foreground" />
        <div className="text-center space-y-1">
          <p className="font-medium">{t("dragDrop")}</p>
          <p className="text-sm text-muted-foreground">{t("or")}</p>
          <Button type="button" variant="outline" size="sm">
            {t("browse")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("supported")}</p>
      </div>

      {/* Selected file badge */}
      {selectedFile && (
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <FileText className="size-4 text-muted-foreground shrink-0" />
          <span className="flex-1 truncate">{selectedFile.name}</span>
          <FileTypeBadge filename={selectedFile.name} />
        </div>
      )}
    </div>
  );
}
