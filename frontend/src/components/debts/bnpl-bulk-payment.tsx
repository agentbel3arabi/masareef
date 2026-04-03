"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FormSheet } from "@/components/shared/form-sheet";
import { MoneyDisplay } from "@/components/shared/money-display";
import { useInstallments } from "@/hooks/use-installments";
import { useBulkPayment } from "@/hooks/use-debts";
import { useAccounts } from "@/hooks/use-accounts";
import {
  CURRENCIES,
  parseMajorToMinor,
  formatAmount,
  formatAmountAr,
} from "@/lib/money";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";
import type { InstallmentResponse } from "@/lib/types/debts";

interface BNPLBulkPaymentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SelectedItem {
  debtId: number;
  name: string;
  provider: string;
  amount: number;
}

/**
 * Group installments by provider (source account name).
 */
function groupByProvider(
  plans: InstallmentResponse[],
  accountMap: Map<number, { name: string; name_ar: string | null }>,
  locale: string,
  fallback: string,
): Map<string, InstallmentResponse[]> {
  const map = new Map<string, InstallmentResponse[]>();
  for (const plan of plans) {
    const acc = plan.source_account_id
      ? accountMap.get(plan.source_account_id)
      : null;
    const provider = acc
      ? locale === "ar" && acc.name_ar
        ? acc.name_ar
        : acc.name
      : fallback;
    if (!map.has(provider)) map.set(provider, []);
    map.get(provider)!.push(plan);
  }
  return map;
}

export function BNPLBulkPayment({ open, onOpenChange }: BNPLBulkPaymentProps) {
  const t = useTranslations("bulkPayment");
  const tInstallments = useTranslations("installments");
  const locale = useLocale();

  const [step, setStep] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Map<number, SelectedItem>>(
    new Map(),
  );
  const [feeMajor, setFeeMajor] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const { data: installmentsData } = useInstallments({
    type: "financing_app",
    status: "active",
  });
  const { data: accountsData } = useAccounts();
  const accounts = (accountsData?.data ?? []).filter((a) => a.is_active);
  const mutation = useBulkPayment();

  const allPlans = installmentsData?.data ?? [];

  // Only show plans that have remaining months (unpaid)
  const activePlans = useMemo(
    () => allPlans.filter((p) => p.remaining_months > 0),
    [allPlans],
  );

  const accountMap = useMemo(() => {
    const map = new Map<
      number,
      { name: string; name_ar: string | null }
    >();
    for (const acc of accounts) {
      map.set(acc.id, { name: acc.name, name_ar: acc.name_ar });
    }
    return map;
  }, [accounts]);

  const grouped = useMemo(
    () =>
      groupByProvider(
        activePlans,
        accountMap,
        locale,
        tInstallments("financingApp"),
      ),
    [activePlans, accountMap, locale, tInstallments],
  );

  const baseCurrency = activePlans[0]?.currency ?? "EGP";
  const exponent = CURRENCIES[baseCurrency]?.exponent ?? 2;

  const fmt = (minor: number) =>
    locale === "ar"
      ? `${formatAmountAr(minor, baseCurrency)} ${CURRENCIES[baseCurrency]?.symbol ?? baseCurrency}`
      : `${formatAmount(minor, baseCurrency)} ${CURRENCIES[baseCurrency]?.symbol ?? baseCurrency}`;

  const subtotal = useMemo(() => {
    let total = 0;
    for (const item of selectedItems.values()) {
      total += item.amount;
    }
    return total;
  }, [selectedItems]);

  const feeMinor = feeMajor ? parseMajorToMinor(feeMajor, exponent) : 0;
  const grandTotal = subtotal + feeMinor;

  // Compute current installment number for a plan
  const installmentNumber = (plan: InstallmentResponse) =>
    plan.months_paid + 1;

  const toggleItem = (plan: InstallmentResponse) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(plan.id)) {
        next.delete(plan.id);
      } else {
        const acc = plan.source_account_id
          ? accountMap.get(plan.source_account_id)
          : null;
        const provider = acc
          ? locale === "ar" && acc.name_ar
            ? acc.name_ar
            : acc.name
          : tInstallments("financingApp");
        next.set(plan.id, {
          debtId: plan.id,
          name: plan.name,
          provider,
          amount: plan.monthly_amount_minor,
        });
      }
      return next;
    });
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      // Reset on close
      setStep(1);
      setSelectedItems(new Map());
      setFeeMajor("");
      setAccountId("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
    }
    onOpenChange(openState);
  };

  const handleConfirm = () => {
    mutation.mutate(
      {
        items: Array.from(selectedItems.values()).map((item) => ({
          debt_id: item.debtId,
          amount_minor: item.amount,
        })),
        fee_minor: feeMinor,
        account_id: parseInt(accountId, 10),
        date: paymentDate,
        link_existing_transaction_id: null,
      },
      {
        onSuccess: () => {
          handleClose(false);
        },
      },
    );
  };

  const stepTitle = `${t("title")} — ${t("step", { current: step, total: 3 })}`;

  return (
    <FormSheet open={open} onOpenChange={handleClose} title={stepTitle}>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-violet-500" : "bg-muted"
              }`}
            />
          </div>
        ))}
      </div>

      {/* ────────── Step 1: Select Plans ────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("selectPlans")}</p>

          {Array.from(grouped.entries()).map(([provider, plans]) => (
            <div key={provider} className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                {provider}
              </h4>
              <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                {plans.map((plan) => {
                  const isSelected = selectedItems.has(plan.id);
                  return (
                    <label
                      key={plan.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-violet-50 dark:bg-violet-950/20"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleItem(plan)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {plan.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          #{installmentNumber(plan)} / {plan.total_months}
                        </p>
                      </div>
                      <MoneyDisplay
                        amount={plan.monthly_amount_minor}
                        currency={plan.currency}
                        size="sm"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Footer */}
          <div className="sticky bottom-0 bg-background pt-3 border-t border-border space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("selected", { count: selectedItems.size })}
              </span>
              <span className="font-bold">
                {t("subtotal")}: {fmt(subtotal)}
              </span>
            </div>
            <Button
              className="w-full"
              disabled={selectedItems.size === 0}
              onClick={() => setStep(2)}
            >
              {t("next")}
              <ChevronRight className="ms-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ────────── Step 2: Fees & Total ────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-bold">{t("feesTotal")}</h3>

          {/* Subtotal */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("installmentsTotal")}
            </span>
            <span className="font-medium">{fmt(subtotal)}</span>
          </div>

          {/* Fee input */}
          <div className="space-y-2">
            <Label htmlFor="bulk-fee">{t("paymentFees")}</Label>
            <Input
              id="bulk-fee"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={feeMajor}
              onChange={(e) => setFeeMajor(e.target.value)}
            />
          </div>

          {/* Computed total */}
          <div className="flex justify-between text-sm font-bold border-t border-border pt-3">
            <span>{t("totalToPay")}</span>
            <span>{fmt(grandTotal)}</span>
          </div>

          {/* Pay from account */}
          <div className="space-y-2">
            <Label>{t("payFrom")} *</Label>
            <Select
              value={accountId}
              onValueChange={(v) => setAccountId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("payFrom")} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={String(acc.id)}>
                    {locale === "ar" && acc.name_ar ? acc.name_ar : acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="bulk-date">{t("date")}</Label>
            <Input
              id="bulk-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep(1)}
            >
              <ChevronLeft className="me-2 h-4 w-4" />
              {t("back")}
            </Button>
            <Button
              className="flex-1"
              disabled={!accountId}
              onClick={() => setStep(3)}
            >
              {t("next")}
              <ChevronRight className="ms-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ────────── Step 3: Review & Confirm ────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="font-bold">{t("summary")}</h3>

          {/* Line items */}
          <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
            {Array.from(selectedItems.values()).map((item) => (
              <div
                key={item.debtId}
                className="flex items-center justify-between p-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.provider}
                  </p>
                </div>
                <MoneyDisplay
                  amount={item.amount}
                  currency={baseCurrency}
                  size="sm"
                />
              </div>
            ))}

            {/* Fee line */}
            {feeMinor > 0 && (
              <div className="flex items-center justify-between p-3 text-sm bg-muted/50">
                <span className="text-muted-foreground">{t("fees")}</span>
                <MoneyDisplay
                  amount={feeMinor}
                  currency={baseCurrency}
                  size="sm"
                />
              </div>
            )}
          </div>

          {/* Total */}
          <div className="flex justify-between items-center text-sm font-bold border-t border-border pt-3">
            <span>{t("totalToPay")}</span>
            <MoneyDisplay
              amount={grandTotal}
              currency={baseCurrency}
              size="md"
            />
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep(2)}
            >
              <ChevronLeft className="me-2 h-4 w-4" />
              {t("back")}
            </Button>
            <Button
              className="flex-1"
              disabled={mutation.isPending}
              onClick={handleConfirm}
            >
              <Check className="me-2 h-4 w-4" />
              {mutation.isPending ? t("processing") : t("confirm")}
            </Button>
          </div>
        </div>
      )}
    </FormSheet>
  );
}
