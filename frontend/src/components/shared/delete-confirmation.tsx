"use client";

import { useTranslations } from "next-intl";
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
import { Button } from "@/components/ui/button";

interface DeleteConfirmationProps {
  /** The name of the item being deleted, shown in the confirmation message. */
  itemName: string;
  /** Called when the user confirms deletion. */
  onConfirm: () => void;
  /** Whether the delete operation is in progress. */
  isPending?: boolean;
  /** Custom trigger element. Defaults to a red "Delete" button. */
  trigger?: React.ReactElement;
}

export function DeleteConfirmation({
  itemName,
  onConfirm,
  isPending = false,
  trigger,
}: DeleteConfirmationProps) {
  const t = useTranslations("common.delete");

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          trigger || (
            <Button variant="destructive" size="sm">
              {t("button")}
            </Button>
          )
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description", { name: itemName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? t("deleting") : t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

