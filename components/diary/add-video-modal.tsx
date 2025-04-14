"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Video, Loader2 } from "lucide-react"
import { useDiaryVideos } from "@/hooks/use-diary-videos"
import { VideoPlayer } from "@/components/video/video-player"

interface AddVideoModalProps {
  diaryId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AddVideoModal({ diaryId, isOpen, onClose, onSuccess }: AddVideoModalProps) {
  const { addVideo } = useDiaryVideos(diaryId)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check if it's a video file
      if (!file.type.startsWith("video/")) {
        alert("Please select a video file")
        return
      }

      setVideoFile(file)
      const videoUrl = URL.createObjectURL(file)
      setVideoPreview(videoUrl)

      // Reset thumbnail
      setThumbnailFile(null)

      // Load video to get duration and generate thumbnail
      const video = document.createElement("video")
      video.preload = "metadata"
      video.onloadedmetadata = () => {
        // Check if video is within 90 seconds
        if (video.duration > 90) {
          alert("Video must be 90 seconds or less")
          setVideoFile(null)
          setVideoPreview(null)
          URL.revokeObjectURL(videoUrl)
          return
        }

        // Generate thumbnail
        video.currentTime = 1 // Set to 1 second to avoid black frame
        video.onseeked = () => {
          const canvas = document.createElement("canvas")
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext("2d")
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)

          // Convert canvas to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const thumbnailFile = new File([blob], "thumbnail.jpg", { type: "image/jpeg" })
                setThumbnailFile(thumbnailFile)
              }
            },
            "image/jpeg",
            0.8,
          )
        }
      }
      video.src = videoUrl
    }
  }

  const handleSelectVideo = () => {
    fileInputRef.current?.click()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!videoFile || !thumbnailFile) return

    setIsSubmitting(true)

    try {
      // Get video duration
      const duration = videoRef.current?.duration || 0

      const video = await addVideo(videoFile, thumbnailFile, duration)

      if (video) {
        onSuccess?.()
        onClose()
      }
    } catch (error) {
      console.error("Error uploading video:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Clean up object URLs when component unmounts or modal closes
  useEffect(() => {
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview)
      }
    }
  }, [videoPreview])

  const handleClose = () => {
    // Reset state
    setVideoFile(null)
    setThumbnailFile(null)
    setVideoPreview(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Video to Diary</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="video">Select Video (90 seconds max)</Label>
            <div
              className="h-64 bg-gray-100 rounded-md flex items-center justify-center cursor-pointer overflow-hidden"
              onClick={handleSelectVideo}
            >
              {videoPreview ? (
                <VideoPlayer
                  src={videoPreview}
                  className="w-full h-full"
                  onError={() => {
                    setVideoPreview(null)
                    setVideoFile(null)
                  }}
                />
              ) : (
                <div className="flex flex-col items-center text-gray-500">
                  <Video className="h-8 w-8 mb-2" />
                  <span>Click to select video</span>
                  <span className="text-xs mt-1">(90 seconds max)</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                id="video"
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoChange}
              />
              <video ref={videoRef} className="hidden" src={videoPreview || undefined} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!videoFile || !thumbnailFile || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Add Video"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
