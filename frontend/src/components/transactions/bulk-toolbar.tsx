"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Trash2, X, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { CategoryIcon } from "@/lib/category-icon";
import { useCategories } from "@/hooks/use-categories";
import {
  useBulkDeleteTransactions,
  useBulkCategorizeTransactions,
} from "@/hooks/use-transactions";
import { useApproveBatch } from "@/hooks/use-categorization";

interface BulkToolbarProps {
  selectedIds: number[];
  onCancel: () => void;
  needsReview?: boolean;
}

export function BulkToolbar({ selectedIds, onCancel, needsReview }: BulkToolbarProps) {
  const t = useTranslations("transactions");
  const tCat = useTranslations("categorization");
  const locale = useLocale();
  const { data: categoriesData } = useCategories();
  const bulkDelete = useBulkDeleteTransactions();
  const bulkCategorize = useBulkCategorizeTransactions();
  const approveBatch = useApproveBatch();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    await bulkDelete.mutateAsync({ ids: selectedIds });
    onCancel();
    setConfirmOpen(false);
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
        <span className="text-sm font-medium text-primary">
          {t("selectedCount", { count: selectedIds.length })}
        </span>
        <div className="grow" />
        <Select
          onValueChange={async (val) => {
            const categoryId = Number(val);
            if (!categoryId) return;
            try {
              await bulkCategorize.mutateAsync({ ids: selectedIds, category_id: categoryId });
              onCancel();
            } catch (error) {
              console.error("Failed to bulk categorize transactions:", error);
            }
          }}
          disabled={bulkCategorize.isPending}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("recategorize")} />
          </SelectTrigger>
          <SelectContent>
            {(categoriesData?.data || []).map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                <span className="flex items-center gap-2">
                  <CategoryIcon icon={cat.icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {locale === "ar" && cat.name_ar ? cat.name_ar : cat.name_en}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {needsReview && (
          <Button
            variant="default"
            size="sm"
            onClick={async () => {
              try {
                const result = await approveBatch.mutateAsync({ transaction_ids: selectedIds });
                toast.success(tCat("approveSuccess", { count: result.data.approved }));
                onCancel();
              } catch {
                toast.error(tCat("approveFailed"));
              }
            }}
            disabled={approveBatch.isPending}
            className="gap-1.5"
          >
            {approveBatch.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {tCat("approving")}
              </>
            ) : (
              <>
                <CheckCheck className="h-3.5 w-3.5" />
                {tCat("approveAll")}
              </>
            )}
          </Button>
        )}
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
