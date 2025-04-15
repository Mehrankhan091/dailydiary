"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import ProtectedRoute from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit, Lock, Info } from "lucide-react"
import { VideoList } from "@/components/diary/video-list"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Diary } from "@/models/diary"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function DiaryPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [diary, setDiary] = useState<Diary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Properly unwrap the params promise
  const { id: diaryId } = use(params)

  useEffect(() => {
    async function fetchDiary() {
      try {
        const diaryDoc = await getDoc(doc(db, "diaries", diaryId))

        if (diaryDoc.exists()) {
          setDiary({ id: diaryDoc.id, ...diaryDoc.data() } as Diary)
        } else {
          router.push("/my-diaries")
        }
      } catch (err) {
        console.error("Error fetching diary:", err)
        setError("Error fetching diary - using local storage")

        // Try to get from localStorage
        try {
          const localDiaries = JSON.parse(localStorage.getItem("diaries") || "[]")
          const localDiary = localDiaries.find((d: Diary) => d.id === diaryId)
          if (localDiary) {
            setDiary(localDiary)
          } else {
            router.push("/my-diaries")
          }
        } catch (localErr) {
          console.error("Error fetching from localStorage:", localErr)
          router.push("/my-diaries")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchDiary()
  }, [diaryId, router])

  // Rest of your component remains the same...
  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 p-6 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-t-purple-500 rounded-full animate-spin"></div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!diary) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-4">Diary not found</h2>
                <Button asChild>
                  <Link href="/my-diaries">Go back to My Diaries</Link>
                </Button>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-auto">
          <Header />
          <main className="flex-1">
            {error && (
              <div className="p-4">
                <Alert variant="warning">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Limited Functionality</AlertTitle>
                  <AlertDescription>
                    <p>{error}</p>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Diary Header */}
            <div className="relative">
              {diary.coverImageURL ? (
                <div className="h-48 w-full">
                  <img
                    src={diary.coverImageURL || "/placeholder.svg"}
                    alt={diary.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg"
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30"></div>
                </div>
              ) : (
                <div className="h-48 w-full bg-gradient-to-r from-purple-400 to-purple-600"></div>
              )}

              <div className="absolute top-4 left-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-white/80 hover:bg-white"
                  onClick={() => router.push("/my-diaries")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>

              <div className="absolute top-4 right-4 flex gap-2">
                {diary.isPrivate && (
                  <div className="bg-white/80 text-gray-700 px-2 py-1 rounded-md flex items-center text-sm">
                    <Lock className="h-3 w-3 mr-1" />
                    Private
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/80 hover:bg-white"
                  onClick={() => router.push(`/my-diaries/${diaryId}/edit`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>

              <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/70 to-transparent text-white">
                <h1 className="text-2xl font-bold">{diary.title}</h1>
                {diary.description && <p className="mt-2 text-white/90">{diary.description}</p>}
              </div>
            </div>

            {/* Diary Content */}
            <div className="max-w-4xl mx-auto p-6">
              <VideoList diaryId={diaryId} />
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}