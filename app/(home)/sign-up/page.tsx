import SignUpForm from "@/components/sign-up-form";

function parseRef(
  searchParams: Record<string, string | string[] | undefined>
): string | undefined {
  const raw = searchParams.ref;
  if (typeof raw === "string") {
    const t = raw.trim();
    return t || undefined;
  }
  if (Array.isArray(raw) && raw[0]) {
    const t = String(raw[0]).trim();
    return t || undefined;
  }
  return undefined;
}

function parseCheckoutStatus(
  searchParams: Record<string, string | string[] | undefined>
): "success" | "cancel" | undefined {
  const raw = searchParams.checkout;
  if (raw === "success" || raw === "cancel") return raw;
  if (Array.isArray(raw) && (raw[0] === "success" || raw[0] === "cancel")) {
    return raw[0];
  }
  return undefined;
}

function parseSessionId(
  searchParams: Record<string, string | string[] | undefined>
): string | undefined {
  const raw = searchParams.session_id;
  if (typeof raw === "string") {
    const t = raw.trim();
    return t || undefined;
  }
  if (Array.isArray(raw) && raw[0]) {
    const t = String(raw[0]).trim();
    return t || undefined;
  }
  return undefined;
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const referralRef = parseRef(sp);
  const checkoutStatus = parseCheckoutStatus(sp);
  const checkoutSessionId = parseSessionId(sp);
  return (
    <SignUpForm
      referralRef={referralRef}
      checkoutStatus={checkoutStatus}
      checkoutSessionId={checkoutSessionId}
    />
  );
}
