"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MoreVertical, Trash2, Play, Plus, Info, Video } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AddVideoModal } from "@/components/diary/add-video-modal"
import { RecordVideoModal } from "@/components/diary/record-video-modal"
import { VideoPlayer } from "@/components/video/video-player"
import { useDiaryVideos } from "@/hooks/use-diary-videos"
import type { DiaryVideo } from "@/models/diary"

interface VideoListProps {
  diaryId: string
}

export function VideoList({ diaryId }: VideoListProps) {
  const { videos, loading, error, deleteVideo, isUsingFirestore } = useDiaryVideos(diaryId)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)
  const [videoToDelete, setVideoToDelete] = useState<DiaryVideo | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<DiaryVideo | null>(null)

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleDeleteVideo = async () => {
    if (videoToDelete) {
      await deleteVideo(videoToDelete.id)
      setVideoToDelete(null)
    }
  }

  const handleVideoSuccess = () => {
    // Refresh videos list if needed
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="warning" className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Limited Functionality</AlertTitle>
          <AlertDescription>
            <p>{error} - Your video changes will be saved locally but not to the database.</p>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Videos</h2>
        <div className="flex gap-2">
          <Button onClick={() => setIsRecordModalOpen(true)} variant="outline">
            <Video className="mr-2 h-4 w-4" />
            Record Video
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Video
          </Button>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <h3 className="text-lg font-medium mb-2">No videos yet</h3>
          <p className="text-gray-500 mb-6">Add your first video to this diary</p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => setIsRecordModalOpen(true)} variant="outline">
              <Video className="mr-2 h-4 w-4" />
              Record Video
            </Button>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Video
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {videos.map((video) => (
            <Card key={video.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div
                    className="relative w-32 h-24 bg-gray-200 rounded overflow-hidden flex-shrink-0 cursor-pointer"
                    onClick={() => setSelectedVideo(video)}
                  >
                    <img
                      src={video.thumbnailURL || "/placeholder.svg"}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg"
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="h-8 w-8 text-white" />
                    </div>
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                      {formatDuration(video.duration)}
                    </div>
                  </div>
                  <div className="flex-1 flex justify-between items-center">
                    <div>
                      <p className="font-medium">Video {videos.indexOf(video) + 1}</p>
                      <p className="text-sm text-gray-500">{new Date(video.createdAt).toLocaleDateString()}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-red-600" onClick={() => setVideoToDelete(video)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddVideoModal
        diaryId={diaryId}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleVideoSuccess}
      />

      <RecordVideoModal
        diaryId={diaryId}
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={handleVideoSuccess}
      />

      <AlertDialog open={!!videoToDelete} onOpenChange={(open) => !open && setVideoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this video from your diary. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteVideo}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden">
          {selectedVideo && (
            <VideoPlayer
              src={selectedVideo.videoURL}
              poster={selectedVideo.thumbnailURL}
              onError={(e) => console.error("Video playback error:", e)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
