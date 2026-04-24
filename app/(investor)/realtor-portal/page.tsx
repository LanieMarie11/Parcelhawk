import { InvestorHeader } from "@/components/investor-header";

export default function RealtorPortalPage() {
  return (
    <>
      <InvestorHeader activeMode="investor" />
      <div className="mx-auto w-full max-w-4xl px-4 pb-10 pt-24 font-ibm-plex-sans sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Overview
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Welcome. Your investor account is ready.
        </p>
      </div>
    </>
  );
}
