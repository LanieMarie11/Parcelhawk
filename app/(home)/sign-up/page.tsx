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

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const referralRef = parseRef(sp);
  return <SignUpForm referralRef={referralRef} />;
}
