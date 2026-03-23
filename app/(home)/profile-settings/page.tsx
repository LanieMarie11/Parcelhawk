import PersonalInfo from "../components/personal-info"
import LandPreferences from "../components/land-preferences"
import NotificationPreferences from "../components/notification-preferences"
import SavedSearchAlerts from "../components/saved-search-alerts"
import Security from "../components/security"

export default function ProfileSettingsPage() {
  return (
    <div className="min-h-screen bg-background font-ibm-plex-sans">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your personal info, preferences, and security settings.
          </p>
        </div>

        {/* Main content */}
        <main className="flex flex-col gap-6">
          <PersonalInfo />
          <LandPreferences />
          {/* <NotificationPreferences /> */}
          {/* <SavedSearchAlerts /> */}
          <Security />
        </main>
      </div>
    </div>
  )
}
