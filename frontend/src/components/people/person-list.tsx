"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonCard } from "@/components/people/person-card";
import { usePersons, useDeletePerson } from "@/hooks/use-persons";
import type { PersonResponse } from "@/lib/types/debts";

interface PersonListProps {
  onEdit: (person: PersonResponse) => void;
  onAdd: () => void;
}

export function PersonList({ onEdit, onAdd }: PersonListProps) {
  const t = useTranslations("people");
  const tCommon = useTranslations("common");
  const { data, isLoading } = usePersons();
  const deleteMutation = useDeletePerson();
  const [deleteTarget, setDeleteTarget] = useState<PersonResponse | null>(null);

  const persons = data?.data ?? [];

  if (isLoading) {
    return <p className="text-muted-foreground text-sm py-4">{tCommon("loading")}</p>;
  }

  if (persons.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("noPeople")}
        description={t("noPeopleDescription")}
        action={{ label: t("addPerson"), onClick: onAdd }}
      />
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {persons.map((person) => (
          <PersonCard
            key={person.id}
            person={person}
            onEdit={onEdit}
            onDelete={setDeleteTarget}
          />
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDescription", { name: deleteTarget?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }
              }}
            >
              {deleteMutation.isPending ? tCommon("loading") : t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
