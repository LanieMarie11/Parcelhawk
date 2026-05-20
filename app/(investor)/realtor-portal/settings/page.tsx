import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import PersonalInfo from "./components/personal-info"
import LandPreferences from "./components/land-preferences"
import NotificationPreferences from "./components/notification-preferences"
import SettingsSidebar from "./components/settings-sidebar"
import SavedSearchAlerts from "./components/saved-search-alerts"
import Security from "./components/security"
import AccountDangerZone from "./components/account-danger-zone"
import InviteLinkSetting from "./components/invite-link-setting"
import BuyerConnectionSetting from "./components/buyer-connection-setting"

export default async function RealtorPortalSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-zinc-50 px-4 py-10 font-ibm-plex-sans sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
            <p className="max-w-md text-sm text-zinc-600">
              Sign in to load this page and update your personal info, preferences, and security
              settings.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-73px)] px-4 pb-8 pt-6 font-ibm-plex-sans sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Update your personal info, preferences, and security settings.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <SettingsSidebar />

          <main className="flex flex-col gap-6">
            <section id="personal-info">
              <PersonalInfo />
            </section>
            <section id="land-preferences">
              {/* <LandPreferences /> */}
            </section>
            <section id="notification-preferences">
              {/* <NotificationPreferences /> */}
            </section>
            <section id="saved-search-alerts">
              <SavedSearchAlerts />
            </section>
            <section id="invite-link-setting">
              <InviteLinkSetting />
            </section>
            <section id="security">
              <Security />
            </section>
            <section id="buyer-connection-setting">
              <BuyerConnectionSetting />
            </section>
            <section id="account-danger-zone">
              <AccountDangerZone />
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
