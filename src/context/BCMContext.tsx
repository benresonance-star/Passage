"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { BCMState } from "@/types";
import { INITIAL_STATE, loadState, saveState } from "@/lib/storage";

interface BCMContextType {
  state: BCMState;
  setState: React.Dispatch<React.SetStateAction<BCMState>>;
  isHydrated: boolean;
}

const BCMContext = createContext<BCMContextType | undefined>(undefined);

export function BCMProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BCMState>(INITIAL_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load state on mount
  useEffect(() => {
    const saved = loadState();
    
    // Check for streak reset on load
    if (saved.stats.lastActivity) {
      const now = new Date();
      const lastActivity = new Date(saved.stats.lastActivity);
      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastDate = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate());
      const diffInDays = Math.floor((nowDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffInDays > 1) {
        saved.stats.streak = 0;
      }
    }
    
    setState(saved);
    setIsHydrated(true);
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    if (isHydrated) {
      saveState(state);
    }
  }, [state, isHydrated]);

  return (
    <BCMContext.Provider value={{ state, setState, isHydrated }}>
      {children}
    </BCMContext.Provider>
  );
}

export function useBCM() {
  const context = useContext(BCMContext);
  if (context === undefined) {
    throw new Error("useBCM must be used within a BCMProvider");
  }
  return context;
}

