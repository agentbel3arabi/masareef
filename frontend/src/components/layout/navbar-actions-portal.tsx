"use client";

import { useEffect, type ReactNode } from "react";
import { useNavbarActions } from "@/contexts/navbar-actions-context";

interface NavbarActionsProps {
  children: ReactNode;
}

export function NavbarActions({ children }: NavbarActionsProps) {
  const { setActions } = useNavbarActions();

  useEffect(() => {
    setActions(children);
    return () => setActions(null);
  }, [children, setActions]);

  return null;
}
