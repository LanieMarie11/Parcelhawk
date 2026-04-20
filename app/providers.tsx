"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { LandPropertySearchHandoffProvider } from "@/lib/land-property-search-context";
import { SignInModalProvider } from "@/lib/sign-in-modal-context";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <LandPropertySearchHandoffProvider>
        <SignInModalProvider>
          {children}
          <Toaster richColors position="bottom-right" />
        </SignInModalProvider>
      </LandPropertySearchHandoffProvider>
    </SessionProvider>
  );
}
