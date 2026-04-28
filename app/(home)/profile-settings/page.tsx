import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import PersonalInfo from "../components/personal-info"
import LandPreferences from "../components/land-preferences"
import NotificationPreferences from "../components/notification-preferences"
import ProfileSettingsSidebar from "../components/profile-settings-sidebar"
import SavedSearchAlerts from "../components/saved-search-alerts"
import Security from "../components/security"

export default async function ProfileSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return <div className="min-h-screen bg-background font-ibm-plex-sans">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
          <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Sign in to load this page and update your personal info, preferences, and security
            settings.
          </p>
        </div>
      </div>
    </div>
  }

  return (
    <div className="min-h-screen bg-background font-ibm-plex-sans">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your personal info, preferences, and security settings.
          </p>
        </div>

        {/* Main content */}
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <ProfileSettingsSidebar />

          <main className="flex flex-col gap-6">
            <section id="personal-info">
              <PersonalInfo />
            </section>
            <section id="land-preferences">
              <LandPreferences />
            </section>
            <section id="notification-preferences">
              <NotificationPreferences />
            </section>
            <section id="saved-search-alerts">
              <SavedSearchAlerts />
            </section>
            <section id="security">
              <Security />
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
