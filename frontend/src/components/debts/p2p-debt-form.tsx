"use client";

import { useState } from "react";
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
import { useCreateDebt } from "@/hooks/use-debts";
import { usePersons } from "@/hooks/use-persons";
import { CURRENCIES } from "@/lib/money";
import type { DebtType, RepaymentMode } from "@/lib/types/debts";

interface P2PDebtFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toMinor(displayValue: string, currency: string): number {
  const exp = CURRENCIES[currency]?.exponent ?? 2;
  return Math.round(parseFloat(displayValue || "0") * Math.pow(10, exp));
}

const CURRENCY_CODES = Object.keys(CURRENCIES);

export function P2PDebtForm({ open, onOpenChange }: P2PDebtFormProps) {
  const [personId, setPersonId] = useState("");
  const [debtType, setDebtType] = useState<DebtType>("personal_lent");
  const [currency, setCurrency] = useState("EGP");
  const [amount, setAmount] = useState("");
  const [repaymentMode, setRepaymentMode] =
    useState<RepaymentMode>("lump_sum");
  const [dueDate, setDueDate] = useState("");
  const [splitCount, setSplitCount] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useCreateDebt();
  const { data: personsData } = usePersons();
  const persons = personsData?.data ?? [];

  const selectedPerson = persons.find((p) => String(p.id) === personId);

  const resetFields = () => {
    setPersonId("");
    setDebtType("personal_lent");
    setCurrency("EGP");
    setAmount("");
    setRepaymentMode("lump_sum");
    setDueDate("");
    setSplitCount("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPersonName = selectedPerson?.name ?? "";
    mutation.mutate(
      {
        type: debtType,
        name:
          debtType === "personal_lent"
            ? `Loan to ${selectedPersonName}`
            : `Borrowed from ${selectedPersonName}`,
        principal_minor: toMinor(amount, currency),
        currency,
        tenure_months: 0,
        start_date: new Date().toISOString().split("T")[0],
        person_id: parseInt(personId),
        repayment_mode: repaymentMode,
        due_date: repaymentMode === "lump_sum" ? dueDate || null : null,
        split_count:
          repaymentMode === "equal_splits" ? parseInt(splitCount) : null,
        notes: notes || null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          resetFields();
        },
      }
    );
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add Personal Debt"
      description="Record a personal loan or borrowing."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Person</Label>
          <Select value={personId} onValueChange={(v) => setPersonId(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select person" />
            </SelectTrigger>
            <SelectContent>
              {persons.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Type</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={debtType === "personal_lent" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setDebtType("personal_lent")}
            >
              I Lent
            </Button>
            <Button
              type="button"
              variant={debtType === "personal_borrowed" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setDebtType("personal_borrowed")}
            >
              I Borrowed
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Currency</Label>
          <Select value={currency} onValueChange={(v) => setCurrency(v ?? "EGP")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_CODES.map((code) => (
                <SelectItem key={code} value={code}>
                  {code} — {CURRENCIES[code].name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="p2p-amount">Amount</Label>
          <Input
            id="p2p-amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Repayment Mode</Label>
          <Select
            value={repaymentMode}
            onValueChange={(v) => setRepaymentMode((v ?? "lump_sum") as RepaymentMode)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lump_sum">Lump Sum</SelectItem>
              <SelectItem value="equal_splits">Equal Splits</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {repaymentMode === "lump_sum" && (
          <div className="space-y-2">
            <Label htmlFor="p2p-due">Due Date</Label>
            <Input
              id="p2p-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        )}

        {repaymentMode === "equal_splits" && (
          <div className="space-y-2">
            <Label htmlFor="p2p-splits">Number of Splits</Label>
            <Input
              id="p2p-splits"
              type="number"
              value={splitCount}
              onChange={(e) => setSplitCount(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="p2p-notes">Notes</Label>
          <textarea
            id="p2p-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Add Debt"}
        </Button>
      </form>
    </FormSheet>
  );
}
