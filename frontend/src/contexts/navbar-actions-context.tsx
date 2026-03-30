"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface NavbarActionsContextValue {
  actions: ReactNode;
  setActions: (actions: ReactNode) => void;
}

const NavbarActionsContext = createContext<NavbarActionsContextValue>({
  actions: null,
  setActions: () => {},
});

export function NavbarActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode>(null);
  return (
    <NavbarActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </NavbarActionsContext.Provider>
  );
}

export function useNavbarActions() {
  return useContext(NavbarActionsContext);
}
