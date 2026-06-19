"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export function AdminSignInForm() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (role === "admin") {
      router.replace("/admin");
    }
  }, [session, status, router]);

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Email and password are required");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        role: "admin",
        redirect: false,
      });

      if (result?.ok) {
        toast.success("Signed in as admin");
        router.push("/admin");
        return;
      }

      toast.error("Invalid email or password");
    } catch (error) {
      console.error(error);
      toast.error("Connection failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <form
        onSubmit={handleSignIn}
        className="w-full max-w-md rounded-2xl bg-card p-10 shadow-lg font-ibm-plex-sans"
      >
        <h1 className="text-3xl font-phudu font-medium uppercase tracking-wide text-foreground">
          Admin Sign In
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          ParcelHawk internal dashboard access.
        </p>

        <div className="mt-6">
          <label
            htmlFor="admin-email"
            className="block text-base text-foreground"
          >
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            placeholder="admin@parcelhawk.ai"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
        </div>

        <div className="mt-4">
          <label
            htmlFor="admin-password"
            className="block text-base text-foreground"
          >
            Password
          </label>
          <div className="relative mt-2">
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-xl cursor-pointer bg-brand-green py-3.5 text-lg text-white shadow-md transition-colors hover:bg-brand-green-hover active:bg-brand-green-active disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
