"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCategories } from "@/hooks/use-categories";
import {
  useRules,
  useUpdateRule,
  useDeleteRule,
  type CategorizationRule,
} from "@/hooks/use-categorization";

// ---------------------------------------------------------------------------
// Edit popover — inline form for updating pattern and category
// ---------------------------------------------------------------------------

interface EditRulePopoverProps {
  rule: CategorizationRule;
}

function EditRulePopover({ rule }: EditRulePopoverProps) {
  const t = useTranslations("categorization");
  const { data: categoriesData } = useCategories();
  const updateRule = useUpdateRule(rule.id);
  const [open, setOpen] = React.useState(false);
  const [pattern, setPattern] = React.useState(rule.pattern);
  const [categoryId, setCategoryId] = React.useState(String(rule.category_id));

  const categories = categoriesData?.data ?? [];

  const handleSave = () => {
    updateRule.mutate(
      { pattern: pattern || undefined, category_id: categoryId ? Number(categoryId) : undefined },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success(t("ruleUpdated"));
        },
        onError: () => {
          toast.error(t("ruleUpdateFailed"));
        },
      }
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("editRuleAriaLabel")}
          />
        }
      >
        <Pencil className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent className="w-72" side="inline-start">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              {t("patternColumn")}
            </label>
            <input
              className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              {t("categoryColumn")}
            </label>
            <select
              className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name_en}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateRule.isPending}
            >
              {t("saveRule")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation dialog
// ---------------------------------------------------------------------------

interface DeleteRuleDialogProps {
  rule: CategorizationRule;
}

function DeleteRuleDialog({ rule }: DeleteRuleDialogProps) {
  const t = useTranslations("categorization");
  const deleteRule = useDeleteRule();

  const handleDelete = () => {
    deleteRule.mutate(rule.id, {
      onSuccess: () => toast.success(t("ruleDeleted")),
      onError: () => toast.error(t("ruleDeleteFailed")),
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("deleteRuleAriaLabel")}
            className="text-destructive hover:text-destructive"
          />
        }
      >
        <Trash2 className="h-4 w-4" />
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteRuleTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteRuleBody", { pattern: rule.pattern })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteRule.isPending}
          >
            {t("deleteRuleConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------------------------------------------------------------------
// Category name lookup helper
// ---------------------------------------------------------------------------

function useCategoryName(categoryId: number): string {
  const { data } = useCategories();
  const cat = data?.data?.find((c) => c.id === categoryId);
  return cat?.name_en ?? String(categoryId);
}

// ---------------------------------------------------------------------------
// Rule row
// ---------------------------------------------------------------------------

interface RuleRowProps {
  rule: CategorizationRule;
}

function RuleRow({ rule }: RuleRowProps) {
  const categoryName = useCategoryName(rule.category_id);
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 text-sm font-mono">{rule.pattern}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {rule.match_type}
      </td>
      <td className="px-4 py-3 text-sm">{categoryName}</td>
      <td className="px-4 py-3 text-sm text-end">{rule.hit_count}</td>
      <td className="px-4 py-3 text-sm text-end">
        {Math.round(rule.confidence * 100)}%
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <EditRulePopover rule={rule} />
          <DeleteRuleDialog rule={rule} />
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loading rows
// ---------------------------------------------------------------------------

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b last:border-0">
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-32" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-20" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-24" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-10" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-12" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-16" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export function CategorizationRulesTable() {
  const t = useTranslations("categorization");
  const { data, isLoading } = useRules();

  const rules = data?.data ?? [];
  const isEmpty = !isLoading && rules.length === 0;

  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-start text-sm font-medium">
              {t("patternColumn")}
            </th>
            <th className="px-4 py-3 text-start text-sm font-medium">
              {t("matchTypeColumn")}
            </th>
            <th className="px-4 py-3 text-start text-sm font-medium">
              {t("categoryColumn")}
            </th>
            <th className="px-4 py-3 text-end text-sm font-medium">
              {t("hitCountColumn")}
            </th>
            <th className="px-4 py-3 text-end text-sm font-medium">
              {t("confidenceColumn")}
            </th>
            <th className="px-4 py-3 w-20">
              <span className="sr-only">{t("actionsColumn")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <SkeletonRows />
          ) : isEmpty ? (
            <tr>
              <td colSpan={6} className="px-4 py-16 text-center">
                <p className="text-base font-semibold">{t("noRulesTitle")}</p>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                  {t("noRulesBody")}
                </p>
              </td>
            </tr>
          ) : (
            rules.map((rule) => <RuleRow key={rule.id} rule={rule} />)
          )}
        </tbody>
      </table>
    </div>
  );
}
