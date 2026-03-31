"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { UploadStep } from "@/components/import/upload-step";
import { MappingStep } from "@/components/import/mapping-step";
import { PreviewStep } from "@/components/import/preview-step";
import { ScannedPrompt } from "@/components/import/scanned-prompt";
import { useParseImport, useCommitImport } from "@/hooks/use-import";
import type { ParsedRow } from "@/hooks/use-import";
import { useAccounts } from "@/hooks/use-accounts";
import { Button } from "@/components/ui/button";

// ── State machine types ──────────────────────────────────────────────────────

type WizardState =
  | { step: "upload" }
  | {
      step: "mapping";
      headers: string[];
      sheetNames: string[];
      selectedSheet: string | null;
      autoSuggest: Record<string, string>;
      file: File;
      accountId: number;
      currency: string;
    }
  | {
      step: "preview";
      rows: ParsedRow[];
      stats: { valid: number; duplicate: number; error: number };
      accountId: number;
      currency: string;
      file: File;
    }
  | { step: "scanned" };

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: "upload" | "mapping" | "preview" }) {
  const t = useTranslations("import.step");
  const steps = [
    { key: "upload", label: t("upload") },
    { key: "mapping", label: t("mapping") },
    { key: "preview", label: t("preview") },
  ] as const;
  const currentIdx = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-2 text-sm">
      {steps.map((step, idx) => (
        <div key={step.key} className="flex items-center gap-2">
          <div
            className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
              idx <= currentIdx
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {idx + 1}
          </div>
          <span className={idx <= currentIdx ? "font-medium" : "text-muted-foreground"}>
            {step.label}
          </span>
          {idx < steps.length - 1 && <span className="text-muted-foreground">›</span>}
        </div>
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const t = useTranslations("import");
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledAccountId = searchParams.get("accountId")
    ? Number(searchParams.get("accountId"))
    : null;

  const { data: accountsResp } = useAccounts();
  const accounts = accountsResp?.data ?? [];

  const [state, setState] = useState<WizardState>({ step: "upload" });
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(prefilledAccountId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const parseMutation = useParseImport();
  const commitMutation = useCommitImport();

  // ── Upload step: user selects file and account, clicks Next ─────────────
  async function handleUploadNext() {
    if (!selectedFile) {
      toast.error(t("errors.noFile"));
      return;
    }
    if (!selectedAccountId) {
      toast.error(t("errors.noAccount"));
      return;
    }
    const account = accounts.find((a) => a.id === selectedAccountId);
    const currency = account?.currency ?? "EGP";

    try {
      const result = await parseMutation.mutateAsync({
        file: selectedFile,
        accountId: selectedAccountId,
        currency,
      });

      if (result.result_type === "scanned") {
        setState({ step: "scanned" });
      } else if (result.result_type === "needs_mapping") {
        setState({
          step: "mapping",
          headers: result.headers,
          sheetNames: result.sheet_names,
          selectedSheet: result.selected_sheet,
          autoSuggest: result.auto_suggest,
          file: selectedFile,
          accountId: selectedAccountId,
          currency,
        });
      } else {
        setState({
          step: "preview",
          rows: result.rows,
          stats: { valid: result.valid_rows, duplicate: result.duplicate_rows, error: result.error_rows },
          accountId: selectedAccountId,
          currency,
          file: selectedFile,
        });
      }
    } catch {
      toast.error(t("errors.parseFailed"));
    }
  }

  // ── Mapping step: user confirms mapping, second parse call ───────────────
  async function handleMappingParse(
    mapping: Record<string, string>,
    dateFormat: string,
    skipRows: number,
    sheetName?: string,
  ) {
    if (state.step !== "mapping") return;
    const { file, accountId, currency } = state;

    try {
      const result = await parseMutation.mutateAsync({
        file,
        accountId,
        currency,
        columnMapping: mapping,
        dateFormat,
        sheetName,
      });

      if (result.result_type !== "complete") {
        toast.error(t("errors.parseFailed"));
        return;
      }
      setState({
        step: "preview",
        rows: result.rows,
        stats: { valid: result.valid_rows, duplicate: result.duplicate_rows, error: result.error_rows },
        accountId,
        currency,
        file,
      });
    } catch {
      toast.error(t("errors.parseFailed"));
    }
  }

  // ── Preview step: user commits selected rows ─────────────────────────────
  async function handleCommit(selectedRows: ParsedRow[]) {
    if (state.step !== "preview") return;
    const { accountId, currency } = state;

    try {
      await commitMutation.mutateAsync({
        account_id: accountId,
        rows: selectedRows.map((r) => ({
          date: r.date!,
          description: r.description,
          amount_minor: r.amount_minor!,
          currency,
          type: r.type,
          apply_to_balance: r.apply_to_balance,
        })),
      });

      router.push(`/accounts/${accountId}`);
    } catch {
      toast.error(t("errors.commitFailed"));
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const showStepIndicator = state.step === "upload" || state.step === "mapping" || state.step === "preview";

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {showStepIndicator && (
        <StepIndicator
          current={state.step === "preview" ? "preview" : state.step === "mapping" ? "mapping" : "upload"}
        />
      )}

      {state.step === "upload" && (
        <div className="space-y-6">
          <UploadStep
            selectedAccountId={selectedAccountId}
            onAccountChange={setSelectedAccountId}
            onFileSelected={setSelectedFile}
          />
          <Button
            onClick={handleUploadNext}
            disabled={!selectedFile || !selectedAccountId || parseMutation.isPending}
            className="w-full"
          >
            {parseMutation.isPending ? t("upload.analysing") : t("upload.next")}
          </Button>
        </div>
      )}

      {state.step === "mapping" && (
        <MappingStep
          headers={state.headers}
          autoSuggest={state.autoSuggest}
          sheetNames={state.sheetNames}
          selectedSheet={state.selectedSheet}
          onBack={() => setState({ step: "upload" })}
          onParse={handleMappingParse}
          isLoading={parseMutation.isPending}
        />
      )}

      {state.step === "preview" && (
        <PreviewStep
          rows={state.rows}
          stats={state.stats}
          currency={state.currency}
          onBack={() => {
            // Reset to upload — mapping state is not preserved on back navigation.
            // User re-selects file and re-maps. Simpler than storing full mapping state.
            setSelectedFile(null);
            setState({ step: "upload" });
          }}
          onCommit={handleCommit}
          isLoading={commitMutation.isPending}
        />
      )}

      {state.step === "scanned" && (
        <ScannedPrompt onBack={() => setState({ step: "upload" })} />
      )}
    </div>
  );
}
