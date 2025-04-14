"use client"

import ProtectedRoute from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { ProfileHeader } from "@/components/profile/profile-header"
import { ProfileContent } from "@/components/profile/profile-content"
import { useUserProfile } from "@/hooks/use-user-profile"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RefreshCcw, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FirebaseSetupGuide } from "@/components/firebase-setup-guide"

export default function ProfilePage() {
  const { loading, error, profile, isUsingFirestore } = useUserProfile()

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-auto">
          <Header />
          <main className="flex-1 bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-16 h-16 border-4 border-t-rose-500 rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {error && (
                  <Alert variant="warning" className="m-6">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Limited Functionality</AlertTitle>
                    <AlertDescription className="flex flex-col gap-4">
                      <p>
                        {error} - Your profile changes will not be saved to the database, but will work during this
                        session.
                      </p>
                      <Button onClick={() => window.location.reload()} variant="outline" className="w-fit">
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Retry with Database
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {!isUsingFirestore && <FirebaseSetupGuide />}

                {profile ? (
                  <div className="max-w-4xl mx-auto">
                    <ProfileHeader />
                    <ProfileContent />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow">
                    <p className="text-gray-500">No profile data available</p>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
