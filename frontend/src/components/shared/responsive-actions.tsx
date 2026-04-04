"use client";

import { type ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ResponsiveActionsProps {
  primary?: ReactNode;
  secondary?: ReactNode;
  secondaryMenuItems?: ReactNode;
}

export function ResponsiveActions({ primary, secondary, secondaryMenuItems }: ResponsiveActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {secondary && (
        <div className="hidden sm:flex items-center gap-2">{secondary}</div>
      )}
      {secondaryMenuItems && (
        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">{secondaryMenuItems}</DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      {primary}
    </div>
  );
}
