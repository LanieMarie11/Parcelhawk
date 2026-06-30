export async function resolveInvestorPostAuthPath(): Promise<string> {
  try {
    const response = await fetch("/api/investor/subscription/status", {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return "/realtor-portal/subscribe";
    }

    const data = (await response.json()) as { active?: boolean };
    return data.active ? "/realtor-portal" : "/realtor-portal/subscribe";
  } catch {
    return "/realtor-portal/subscribe";
  }
}
