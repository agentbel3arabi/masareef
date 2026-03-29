"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCategories } from "@/hooks/use-categories";
import {
  useBulkDeleteTransactions,
  useBulkCategorizeTransactions,
} from "@/hooks/use-transactions";

interface BulkToolbarProps {
  selectedIds: number[];
  onCancel: () => void;
}

export function BulkToolbar({ selectedIds, onCancel }: BulkToolbarProps) {
  const t = useTranslations("transactions");
  const locale = useLocale();
  const { data: categoriesData } = useCategories();
  const bulkDelete = useBulkDeleteTransactions();
  const bulkCategorize = useBulkCategorizeTransactions();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    await bulkDelete.mutateAsync({ ids: selectedIds });
    onCancel();
    setConfirmOpen(false);
  };

  const handleCategorize = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = Number(e.target.value);
    if (!categoryId) return;
    await bulkCategorize.mutateAsync({ ids: selectedIds, category_id: categoryId });
    onCancel();
    e.target.value = "";
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
        <span className="text-sm font-medium text-primary">
          {t("selectedCount", { count: selectedIds.length })}
        </span>
        <div className="grow" />
        <select
          defaultValue=""
          onChange={handleCategorize}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          disabled={bulkCategorize.isPending}
        >
          <option value="">{t("recategorize")}</option>
          {(categoriesData?.data || []).map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon ? `${cat.icon} ` : ""}
              {locale === "ar" && cat.name_ar ? cat.name_ar : cat.name_en}
            </option>
          ))}
        </select>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          disabled={bulkDelete.isPending}
          className="gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("deleteSelected")}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1">
          <X className="h-3.5 w-3.5" />
          {t("cancel")}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("deleteSelected")}</DialogTitle>
            <DialogDescription>
              {t("bulkDeleteConfirm", { count: selectedIds.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={bulkDelete.isPending}
              onClick={handleDelete}
            >
              {bulkDelete.isPending ? "…" : t("deleteSelected")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
