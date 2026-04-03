"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { FormSheet } from "@/components/shared/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useRecordPayment, useMatchSuggestions } from "@/hooks/use-debts";
import { useAccounts } from "@/hooks/use-accounts";
import { MoneyDisplay } from "@/components/shared/money-display";
import { CURRENCIES, parseMajorToMinor, formatWithCurrency } from "@/lib/money";
import { CheckCircle2 } from "lucide-react";
import type { MatchSuggestion } from "@/lib/types/debts";

interface RecordPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtId: number;
  currency: string;
  debtType?: string;
  linkedAccountId?: number | null;
  showMatchSuggestions?: boolean;
  prefillAmount?: number;
  prefillDate?: string;
  prefillAccountId?: number;
  installmentNumber?: number;
}

export function RecordPaymentForm({
  open,
  onOpenChange,
  debtId,
  currency,
  linkedAccountId,
  showMatchSuggestions,
  prefillAmount,
  prefillDate,
  prefillAccountId,
  installmentNumber,
}: RecordPaymentFormProps) {
  const t = useTranslations("debts.form.payment");
  const today = new Date().toISOString().split("T")[0];

  const exponent = CURRENCIES[currency]?.exponent ?? 2;
  const defaultAmount = prefillAmount
    ? String(prefillAmount / Math.pow(10, exponent))
    : "";
  const defaultDate = prefillDate ?? today;
  const defaultAccountId = prefillAccountId
    ? String(prefillAccountId)
    : linkedAccountId
      ? String(linkedAccountId)
      : "";

  const [view, setView] = useState<"match" | "manual">("manual");
  const [date, setDate] = useState(defaultDate);
  const [amount, setAmount] = useState(defaultAmount);
  const [notes, setNotes] = useState("");
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [linkExistingTxId, setLinkExistingTxId] = useState<number | null>(null);
  const [confirmingTxId, setConfirmingTxId] = useState<number | null>(null);

  const { data: accountsData } = useAccounts();
  const accounts = (accountsData?.data ?? []).filter(
    (a) => a.currency === currency && a.is_active
  );

  const { data: matchData } = useMatchSuggestions(
    showMatchSuggestions ? debtId : 0
  );
  const suggestions = matchData?.data ?? [];

  const mutation = useRecordPayment(debtId);

  // Set initial view based on suggestions availability
  /* eslint-disable react-hooks/set-state-in-effect -- intentional reset on dialog open */
  useEffect(() => {
    if (open) {
      if (showMatchSuggestions && suggestions.length > 0) {
        setView("match");
      } else {
        setView("manual");
      }
    }
  }, [open, showMatchSuggestions, suggestions.length]);

  // Reset fields when form opens
  useEffect(() => {
    if (open) {
      setDate(defaultDate);
      setAmount(defaultAmount);
      setNotes("");
      setAccountId(defaultAccountId);
      setLinkExistingTxId(null);
      setConfirmingTxId(null);
    }
  }, [open, defaultDate, defaultAmount, defaultAccountId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleConfirmMatch = (suggestion: MatchSuggestion) => {
    setConfirmingTxId(suggestion.transaction_id);
    mutation.mutate(
      {
        date: suggestion.date,
        amount_minor: Math.abs(suggestion.amount_minor),
        account_id: linkedAccountId
          ? linkedAccountId
          : parseInt(accountId, 10),
        notes: null,
        link_existing_transaction_id: suggestion.transaction_id,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setConfirmingTxId(null);
        },
        onError: () => {
          setConfirmingTxId(null);
        },
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(
      {
        date,
        amount_minor: parseMajorToMinor(amount, exponent),
        account_id: parseInt(accountId, 10),
        notes: notes || null,
        link_existing_transaction_id: linkExistingTxId,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const title = installmentNumber
    ? `${t("title")} — ${t("installmentNumber", { number: installmentNumber })}`
    : t("title");

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={t("description")}
    >
      {/* Expected amount & due date header */}
      {prefillAmount && prefillDate && (
        <p className="mb-4 text-sm text-muted-foreground">
          {t("expected", {
            amount: formatWithCurrency(prefillAmount, currency),
            date: prefillDate,
          })}
        </p>
      )}

      {view === "match" && suggestions.length > 0 ? (
        <div className="space-y-4">
          {/* Match suggestions section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground">
                {t("matchFound")}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {suggestions.map((s) => (
              <div
                key={s.transaction_id}
                className="rounded-lg border bg-card p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium">{s.date}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {s.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <MoneyDisplay
                      amount={Math.abs(s.amount_minor)}
                      currency={currency}
                      size="sm"
                    />
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {t("matchScore", { score: s.score })}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  size="sm"
                  disabled={
                    mutation.isPending &&
                    confirmingTxId === s.transaction_id
                  }
                  onClick={() => handleConfirmMatch(s)}
                >
                  <CheckCircle2 className="me-2 h-4 w-4" />
                  {mutation.isPending &&
                  confirmingTxId === s.transaction_id
                    ? t("confirming")
                    : t("confirmMatch")}
                </Button>
              </div>
            ))}
          </div>

          {/* Separator and manual entry link */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground">
                {t("orManual")}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              onClick={() => setView("manual")}
            >
              {t("enterManually")}
            </Button>
          </div>
        </div>
      ) : (
        /* Manual form */
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Back to matches link when suggestions exist */}
          {showMatchSuggestions && suggestions.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-2 text-sm text-muted-foreground"
              onClick={() => setView("match")}
            >
              {`← ${t("matchFound")}`}
            </Button>
          )}

          <div className="space-y-2">
            <Label htmlFor="payment-date">{t("date")}</Label>
            <Input
              id="payment-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-amount">{t("amount")}</Label>
            <Input
              id="payment-amount"
              type="number"
              step={String(Math.pow(10, -exponent))}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-notes">{t("notes")}</Label>
            <textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("selectAccount")} *</Label>
            <Select
              value={accountId}
              onValueChange={(v) => setAccountId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectAccount")} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={String(acc.id)}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending || !accountId}
          >
            {mutation.isPending ? t("saving") : t("submit")}
          </Button>
        </form>
      )}
    </FormSheet>
  );
}
