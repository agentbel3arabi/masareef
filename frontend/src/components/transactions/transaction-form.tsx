"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { CURRENCIES, parseMajorToMinor } from "@/lib/money";
import { Plus } from "lucide-react";

interface TransactionFormProps {
  accountId: number;
  accountCurrency?: string;
}

export function TransactionForm({ accountId, accountCurrency = "EGP" }: TransactionFormProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"debit" | "credit">("debit");
  const [notes, setNotes] = useState("");

  const createTx = useCreateTransaction();

  const exponent = CURRENCIES[accountCurrency]?.exponent ?? 2;
  const amountStep = (1 / Math.pow(10, exponent)).toFixed(exponent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountMinor = parseMajorToMinor(amount, exponent);

    await createTx.mutateAsync({
      account_id: accountId,
      date,
      description,
      amount_minor: amountMinor,
      type,
      currency: accountCurrency,
      notes: notes || undefined,
    });

    setOpen(false);
    setDescription("");
    setAmount("");
    setNotes("");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 me-1" />
          Add Transaction
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New Transaction</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={type === "debit" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setType("debit")}
            >
              Expense
            </Button>
            <Button
              type="button"
              variant={type === "credit" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setType("credit")}
            >
              Income
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Carrefour City Stars"
            />
          </div>

          <div className="space-y-2">
            <Label>Amount ({accountCurrency})</Label>
            <Input
              type="number"
              step={amountStep}
              min={amountStep}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button type="submit" className="w-full" disabled={createTx.isPending}>
            {createTx.isPending ? t("common.loading") : t("common.save")}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
