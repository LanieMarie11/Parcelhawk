"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type PendingPromptUpdater = string | ((prev: string) => string);

type LandPropertySearchHandoffContextValue = {
  pendingPrompt: string;
  setPendingPrompt: (value: PendingPromptUpdater) => void;
};

const LandPropertySearchHandoffContext =
  createContext<LandPropertySearchHandoffContextValue | null>(null);

export function LandPropertySearchHandoffProvider({ children }: { children: ReactNode }) {
  const [pendingPrompt, setPendingPromptState] = useState("");
  const setPendingPrompt = useCallback((value: PendingPromptUpdater) => {
    setPendingPromptState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      return next.trim();
    });
  }, []);

  const value = useMemo(
    () => ({ pendingPrompt, setPendingPrompt }),
    [pendingPrompt, setPendingPrompt]
  );

  return (
    <LandPropertySearchHandoffContext.Provider value={value}>
      {children}
    </LandPropertySearchHandoffContext.Provider>
  );
}

export function useLandPropertySearchHandoff(): LandPropertySearchHandoffContextValue {
  const ctx = useContext(LandPropertySearchHandoffContext);
  if (!ctx) {
    throw new Error(
      "useLandPropertySearchHandoff must be used within LandPropertySearchHandoffProvider"
    );
  }
  return ctx;
}
