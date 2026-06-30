"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { SignUpSubscribeStep } from "@/components/sign-up-subscribe-step";

export function InvestorSubscribePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update } = useSession();
  const checkoutHandled = useRef(false);

  useEffect(() => {
    if (checkoutHandled.current) return;

    const checkoutStatus = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id")?.trim();

    if (checkoutStatus === "cancel") {
      checkoutHandled.current = true;
      toast.message("Checkout canceled", {
        description: "Subscribe to regain access to your portal.",
      });
      router.replace("/realtor-portal/subscribe");
      return;
    }

    if (checkoutStatus !== "success" || !sessionId) return;

    checkoutHandled.current = true;

    void (async () => {
      try {
        const response = await fetch("/api/investor/subscription/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = await response.json().catch(() => ({} as Record<string, unknown>));
        const message = typeof data.error === "string" ? data.error : undefined;

        if (!response.ok) {
          toast.error("Could not confirm subscription", { description: message });
          router.replace("/realtor-portal/subscribe");
          return;
        }

        await update({ subscriptionActive: true });
        toast.success("Subscription active");
        router.replace("/realtor-portal");
      } catch (error) {
        console.error(error);
        toast.error("Connection failed", {
          description: "Check your network and try again.",
        });
      }
    })();
  }, [router, searchParams, update]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <SignUpSubscribeStep
        returnTo="portal"
        showBackButton={false}
        onSubscribed={() => {
          void (async () => {
            await update({ subscriptionActive: true });
            router.push("/realtor-portal");
          })();
        }}
      />
    </div>
  );
}
