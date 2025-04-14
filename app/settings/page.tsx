"use client"

import { useState } from "react"
import ProtectedRoute from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { PersonalInfo } from "@/components/profile/personal-info"
import { WorkEducation } from "@/components/profile/work-education"
import { PrivacySettings } from "@/components/profile/privacy-settings"
import { useRouter } from "next/navigation"
import { useUserProfile } from "@/hooks/use-user-profile"
import { ProfilePhotoUploader } from "@/components/profile/profile-photo-uploader"

export default function SettingsPage() {
  const router = useRouter()
  const { loading, error, profile } = useUserProfile()
  const [activeTab, setActiveTab] = useState("profile")

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-auto">
          <Header />
          <main className="flex-1 p-6">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.push("/profile")} className="mr-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-bold">Settings</h1>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-16 h-16 border-4 border-t-rose-500 rounded-full animate-spin"></div>
                </div>
              ) : profile ? (
                <Tabs defaultValue="profile" onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-8">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="account">Account</TabsTrigger>
                    <TabsTrigger value="privacy">Privacy</TabsTrigger>
                  </TabsList>

                  <TabsContent value="profile" className="space-y-6">
                    <div className="bg-white rounded-lg shadow">
                      <ProfilePhotoUploader />
                      <PersonalInfo />
                      <WorkEducation />
                    </div>
                  </TabsContent>

                  <TabsContent value="account" className="space-y-6">
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-lg font-semibold mb-4">Account Settings</h2>
                      <p className="text-gray-500">Account settings will be available here.</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="privacy" className="space-y-6">
                    <div className="bg-white rounded-lg shadow">
                      <PrivacySettings />
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <p className="text-gray-500">No profile data available</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
