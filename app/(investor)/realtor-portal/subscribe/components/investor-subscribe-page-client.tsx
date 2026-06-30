"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { SignUpSubscribeStep } from "@/components/sign-up-subscribe-step";

function checkoutHandledStorageKey(sessionId: string) {
  return `investor-checkout-handled:${sessionId}`;
}

function isCheckoutSessionHandled(sessionId: string): boolean {
  try {
    return sessionStorage.getItem(checkoutHandledStorageKey(sessionId)) === "1";
  } catch {
    return false;
  }
}

function markCheckoutSessionHandled(sessionId: string) {
  try {
    sessionStorage.setItem(checkoutHandledStorageKey(sessionId), "1");
  } catch {
    // ignore storage errors
  }
}

export function InvestorSubscribePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update } = useSession();
  const checkoutHandled = useRef(false);
  const updateSession = useRef(update);
  updateSession.current = update;

  const handleSubscribed = useCallback(() => {
    void (async () => {
      await updateSession.current({ subscriptionActive: true });
      router.replace("/realtor-portal");
    })();
  }, [router]);

  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id")?.trim();

    if (checkoutStatus === "cancel") {
      if (checkoutHandled.current) return;
      checkoutHandled.current = true;
      toast.message("Checkout canceled", {
        description: "Subscribe to regain access to your portal.",
      });
      router.replace("/realtor-portal/subscribe");
      return;
    }

    if (checkoutStatus !== "success" || !sessionId) return;
    if (checkoutHandled.current || isCheckoutSessionHandled(sessionId)) return;

    checkoutHandled.current = true;
    markCheckoutSessionHandled(sessionId);

    void (async () => {
      try {
        const response = await fetch("/api/investor/subscription/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = await response.json().catch(() => ({} as Record<string, unknown>));
        const message = typeof data.error === "string" ? data.error : undefined;
        const active = data.active === true;

        if (!response.ok || !active) {
          toast.error("Could not confirm subscription", {
            description: message ?? "Subscription is not active yet. Please try again.",
          });
          router.replace("/realtor-portal/subscribe");
          return;
        }

        await updateSession.current({ subscriptionActive: true });
        toast.success("Subscription active");
        router.replace("/realtor-portal");
      } catch (error) {
        console.error(error);
        toast.error("Connection failed", {
          description: "Check your network and try again.",
        });
      }
    })();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <SignUpSubscribeStep
        returnTo="portal"
        showBackButton={false}
        onSubscribed={handleSubscribed}
      />
    </div>
  );
}
