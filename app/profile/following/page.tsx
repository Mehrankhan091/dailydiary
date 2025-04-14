"use client"

import ProtectedRoute from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useUserProfile } from "@/hooks/use-user-profile"

export default function FollowingPage() {
  const { profile } = useUserProfile()

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center mb-6">
                <Button variant="ghost" size="icon" asChild className="mr-2">
                  <Link href="/profile">
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                </Button>
                <h1 className="text-2xl font-bold">Following</h1>
              </div>

              {profile?.stats?.following ? (
                <div className="space-y-4">
                  {/* Following list would go here */}
                  <p className="text-center text-gray-500 py-8">
                    This is where the people you follow would be displayed.
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium mb-2">Not following anyone</h3>
                  <p className="text-gray-500">When you follow people, they'll appear here.</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
