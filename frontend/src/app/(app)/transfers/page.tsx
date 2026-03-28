"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useTransfers } from "@/hooks/use-transfers";
import { TransferForm } from "@/components/transfers/transfer-form";
import { MoneyDisplay } from "@/components/shared/money-display";
import { ArrowRight } from "lucide-react";

export default function TransfersPage() {
  const t = useTranslations();
  const [page] = useState(1);
  const { data, isLoading } = useTransfers(page);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("nav.transfers")}</h1>
        <TransferForm />
      </div>

      {isLoading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-start text-sm font-medium">{t("transfers.date")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium">{t("transfers.from")}</th>
                <th className="px-4 py-3 text-center text-sm font-medium"></th>
                <th className="px-4 py-3 text-start text-sm font-medium">{t("transfers.to")}</th>
                <th className="px-4 py-3 text-end text-sm font-medium">{t("transfers.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.data || []).map((transfer) => (
                <tr key={transfer.transfer_id} className="border-b">
                  <td className="px-4 py-3 text-sm">{transfer.date}</td>
                  <td className="px-4 py-3 text-sm">{transfer.from_account?.name}</td>
                  <td className="px-4 py-3 text-center">
                    <ArrowRight className="h-4 w-4 inline text-muted-foreground" />
                  </td>
                  <td className="px-4 py-3 text-sm">{transfer.to_account?.name}</td>
                  <td className="px-4 py-3 text-end">
                    <MoneyDisplay
                      amount={transfer.source_amount}
                      currency={transfer.from_account?.currency || "EGP"}
                      showCurrency
                    />
                  </td>
                </tr>
              ))}
              {(!data?.data || data.data.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    {t("transfers.noTransfers")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
