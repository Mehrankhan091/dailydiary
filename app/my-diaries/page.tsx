"use client"

import { useEffect } from "react"
import ProtectedRoute from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { DiaryGrid } from "@/components/diary/diary-grid"
import { FirebaseSetupGuide } from "@/components/diary/firebase-setup-guide"
import { useDiaries } from "@/hooks/use-diaries"
import { useRouter } from "next/navigation"

export default function MyDiariesPage() {
  const { isUsingFirestore, error, refreshDiaries, deletingDiary } = useDiaries()
  const router = useRouter()

  // Safety mechanism - if we detect a stuck deletion, force a refresh
  useEffect(() => {
    let safetyTimer: NodeJS.Timeout | null = null

    if (deletingDiary) {
      // Set a safety timer to force refresh if deletion takes too long
      safetyTimer = setTimeout(() => {
        console.log("Safety timeout triggered in MyDiariesPage")
        refreshDiaries()
      }, 10000) // 10 second safety timeout
    }

    return () => {
      if (safetyTimer) {
        clearTimeout(safetyTimer)
      }
    }
  }, [deletingDiary, refreshDiaries])

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-auto">
          <Header />
          <main className="flex-1 p-6">
            {!isUsingFirestore && <FirebaseSetupGuide />}
            <DiaryGrid />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
