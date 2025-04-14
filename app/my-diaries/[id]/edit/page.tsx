"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import ProtectedRoute from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Camera, Loader2 } from "lucide-react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Diary } from "@/models/diary"
import { useDiaries } from "@/hooks/use-diaries"
import Link from "next/link"

export default function EditDiaryPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { updateDiary } = useDiaries()
  const [diary, setDiary] = useState<Diary | null>(null)
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchDiary() {
      try {
        const diaryDoc = await getDoc(doc(db, "diaries", params.id))

        if (diaryDoc.exists()) {
          const diaryData = { id: diaryDoc.id, ...diaryDoc.data() } as Diary
          setDiary(diaryData)
          setTitle(diaryData.title)
          setDescription(diaryData.description || "")
          setIsPrivate(diaryData.isPrivate)
          setCoverPreview(diaryData.coverImageURL || null)
        } else {
          router.push("/my-diaries")
        }
      } catch (err) {
        console.error("Error fetching diary:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchDiary()
  }, [params.id, router])

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverImage(file)
      setCoverPreview(URL.createObjectURL(file))
    }
  }

  const handleSelectCoverImage = () => {
    fileInputRef.current?.click()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !diary) return

    setIsSubmitting(true)

    try {
      const success = await updateDiary(diary.id, { title, description, isPrivate }, coverImage || undefined)

      if (success) {
        router.push(`/my-diaries/${diary.id}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <main className="flex-1 p-6">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center mb-6">
                <Button variant="ghost" size="icon" asChild className="mr-2">
                  <Link href={`/my-diaries/${diary.id}`}>
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                </Button>
                <h1 className="text-2xl font-bold">Edit Diary</h1>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="cover-image">Cover Image</Label>
                  <div
                    className="h-48 bg-gray-100 rounded-md flex items-center justify-center cursor-pointer overflow-hidden relative"
                    onClick={handleSelectCoverImage}
                  >
                    {coverPreview ? (
                      <>
                        <img
                          src={coverPreview || "/placeholder.svg"}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <Camera className="h-8 w-8 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-gray-500">
                        <Camera className="h-8 w-8 mb-2" />
                        <span>Click to add cover image</span>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      id="cover-image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverImageChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={30} required />
                  <div className="text-xs text-right text-gray-500">{title.length}/30</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={150}
                    className="resize-none"
                    rows={3}
                  />
                  <div className="text-xs text-right text-gray-500">{description.length}/150</div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="private">Private Diary</Label>
                  <Switch id="private" checked={isPrivate} onCheckedChange={setIsPrivate} />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/my-diaries/${diary.id}`}>Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={!title.trim() || isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
