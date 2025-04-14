"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Grid, Heart, Upload, Video } from "lucide-react"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useRouter } from "next/navigation"
import { useDiaries } from "@/hooks/use-diaries"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { CreateDiaryModal } from "@/components/diary/create-diary-modal"
import { SelectDiaryModal } from "@/components/diary/select-diary-modal"
import { Skeleton } from "@/components/ui/skeleton"

export function ProfileContent() {
  const { profile } = useUserProfile()
  const { diaries, loading: diariesLoading, refreshDiaries } = useDiaries()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("videos")
  const [sortBy, setSortBy] = useState("latest")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSelectDiaryModalOpen, setIsSelectDiaryModalOpen] = useState(false)

  // Filter diaries with videos
  const diariesWithVideos = diaries.filter((diary) => diary.videoCount > 0)

  // Generate random background color for diaries without cover photos
  const getRandomColor = (id: string) => {
    // Use the diary ID to generate a consistent color for each diary
    const hash = id.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)

    const colors = [
      "from-blue-400 to-blue-600",
      "from-purple-400 to-purple-600",
      "from-green-400 to-green-600",
      "from-yellow-400 to-yellow-600",
      "from-pink-400 to-pink-600",
      "from-indigo-400 to-indigo-600",
      "from-red-400 to-red-600",
      "from-teal-400 to-teal-600",
    ]

    return colors[Math.abs(hash) % colors.length]
  }

  // Refresh diaries when modal closes to show newly created diary
  const handleCreateDiarySuccess = (diaryId: string) => {
    refreshDiaries()
    if (activeTab === "videos") {
      router.push(`/my-diaries/${diaryId}`)
    }
  }

  const handleCreateDiary = () => {
    setIsCreateModalOpen(true)
  }

  const handleUploadVideo = () => {
    if (diaries.length === 0) {
      // If no diaries, open create diary modal
      setIsCreateModalOpen(true)
    } else {
      // If diaries exist, open select diary modal
      setIsSelectDiaryModalOpen(true)
    }
  }

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-gray-100 rounded-full p-6 mb-6">
        <Grid className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-medium mb-2">Upload your first video</h3>
      <p className="text-gray-500 mb-6 max-w-md">Your videos will appear here</p>
      <Button onClick={handleUploadVideo} className="bg-blue-500 hover:bg-blue-600">
        <Upload className="h-4 w-4 mr-2" />
        Upload Video
      </Button>
    </div>
  )

  if (!profile) return null

  return (
    <div className="border-t">
      <div className="max-w-4xl mx-auto">
        <Tabs defaultValue="videos" onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center px-6 py-3 border-b">
            <TabsList className="bg-transparent p-0 h-auto">
              <TabsTrigger
                value="videos"
                className={`px-4 py-3 rounded-none border-b-2 ${
                  activeTab === "videos" ? "border-blue-500 text-blue-500" : "border-transparent"
                }`}
              >
                <Grid className="h-4 w-4 mr-2" />
                Videos
              </TabsTrigger>
              <TabsTrigger
                value="liked"
                className={`px-4 py-3 rounded-none border-b-2 ${
                  activeTab === "liked" ? "border-blue-500 text-blue-500" : "border-transparent"
                }`}
              >
                <Heart className="h-4 w-4 mr-2" />
                Liked
              </TabsTrigger>
            </TabsList>

            <div className="flex space-x-2 text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortBy("latest")}
                className={sortBy === "latest" ? "bg-gray-100" : ""}
              >
                Latest
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortBy("popular")}
                className={sortBy === "popular" ? "bg-gray-100" : ""}
              >
                Popular
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortBy("oldest")}
                className={sortBy === "oldest" ? "bg-gray-100" : ""}
              >
                Oldest
              </Button>
            </div>
          </div>

          <TabsContent value="videos" className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">My Videos</h2>
              <Button onClick={handleUploadVideo} className="bg-blue-500 hover:bg-blue-600">
                <Video className="h-4 w-4 mr-2" />
                Upload Video
              </Button>
            </div>

            {diariesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-40 w-full" />
                    <CardContent className="p-4">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      <Skeleton className="h-10 w-full" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : diariesWithVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {diariesWithVideos.map((diary) => (
                  <Card key={diary.id} className="overflow-hidden">
                    <div
                      className="h-40 bg-gray-200 cursor-pointer"
                      onClick={() => router.push(`/my-diaries/${diary.id}`)}
                    >
                      {diary.coverImageURL ? (
                        <img
                          src={diary.coverImageURL || "/placeholder.svg"}
                          alt={diary.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg"
                          }}
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-r ${getRandomColor(diary.id)}`} />
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{diary.title}</h3>
                      <p className="text-sm text-gray-500">{diary.videoCount} videos</p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => router.push(`/my-diaries/${diary.id}`)}
                      >
                        View Videos
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              renderEmptyState()
            )}
          </TabsContent>

          <TabsContent value="liked" className="p-6">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-gray-100 rounded-full p-6 mb-6">
                <Heart className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium mb-2">No liked videos yet</h3>
              <p className="text-gray-500 mb-6">Videos you like will appear here</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <CreateDiaryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateDiarySuccess}
      />

      <SelectDiaryModal
        isOpen={isSelectDiaryModalOpen}
        onClose={() => setIsSelectDiaryModalOpen(false)}
        onSelect={(diaryId) => router.push(`/my-diaries/${diaryId}`)}
        onCreateNew={() => {
          setIsSelectDiaryModalOpen(false)
          setIsCreateModalOpen(true)
        }}
      />
    </div>
  )
}
