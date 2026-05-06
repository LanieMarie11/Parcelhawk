"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function LoginRequiredToast() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const auth = searchParams.get("auth");
    if (pathname !== "/" || auth !== "login-required") return;

    toast.error("Try to login", {
      description: "Please sign in to access that page.",
    });

    const params = new URLSearchParams(searchParams.toString());
    params.delete("auth");
    const next = params.toString();
    router.replace(next ? `/?${next}` : "/", { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}
