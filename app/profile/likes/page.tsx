"use client"

import ProtectedRoute from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useUserProfile } from "@/hooks/use-user-profile"

export default function LikesPage() {
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
                <h1 className="text-2xl font-bold">Likes</h1>
              </div>

              {profile?.stats?.likes ? (
                <div className="space-y-4">
                  {/* Likes list would go here */}
                  <p className="text-center text-gray-500 py-8">This is where your liked posts would be displayed.</p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium mb-2">No likes yet</h3>
                  <p className="text-gray-500">When you like posts, they'll appear here.</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
