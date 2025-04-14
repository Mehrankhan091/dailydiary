"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { useDiaryVideos } from "@/hooks/use-diary-videos"

interface VideoUploaderProps {
  diaryId: string
  videoBlob: Blob
  thumbnailBlob: Blob
  duration: number
  onSuccess: () => void
  onCancel: () => void
}

export function VideoUploader({
  diaryId,
  videoBlob,
  thumbnailBlob,
  duration,
  onSuccess,
  onCancel,
}: VideoUploaderProps) {
  const { addVideo } = useDiaryVideos(diaryId)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Start upload automatically
    handleUpload()

    // Cleanup function
    return () => {
      // Cancel upload if component unmounts during upload
      // This would require additional implementation in a real app
    }
  }, [])

  const handleUpload = async () => {
    setStatus("uploading")
    setUploadProgress(0)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval)
            return 95
          }
          return prev + 5
        })
      }, 300)

      // Perform the actual upload
      const result = await addVideo(
        new File([videoBlob], "video.webm", { type: "video/webm" }),
        new File([thumbnailBlob], "thumbnail.webp", { type: "image/webp" }),
        duration,
      )

      clearInterval(progressInterval)

      if (result) {
        setUploadProgress(100)
        setStatus("success")
        setTimeout(() => {
          onSuccess()
        }, 1000)
      } else {
        throw new Error("Upload failed")
      }
    } catch (err) {
      console.error("Error uploading video:", err)
      setStatus("error")
      setError("Failed to upload video. Please try again.")
    }
  }

  return (
    <div className="space-y-6 p-4">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">
          {status === "uploading" && "Uploading video..."}
          {status === "success" && "Upload complete!"}
          {status === "error" && "Upload failed"}
        </h3>

        {status === "uploading" && (
          <p className="text-sm text-gray-500">Please don't close this window while uploading</p>
        )}
      </div>

      <div className="space-y-2">
        <Progress value={uploadProgress} className="h-2" />
        <div className="flex justify-between text-sm text-gray-500">
          <span>{uploadProgress}%</span>
          <span>{Math.round(((videoBlob.size + thumbnailBlob.size) / 1024 / 1024) * 10) / 10} MB</span>
        </div>
      </div>

      <div className="flex justify-center">
        {status === "uploading" && (
          <div className="flex items-center text-blue-500">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            <span>Processing and uploading...</span>
          </div>
        )}

        {status === "success" && (
          <div className="flex items-center text-green-500">
            <CheckCircle2 className="h-5 w-5 mr-2" />
            <span>Video uploaded successfully!</span>
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center text-red-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error || "Something went wrong"}</span>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-4">
        {status === "error" && (
          <>
            <Button onClick={handleUpload}>Try Again</Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </>
        )}

        {status === "uploading" && (
          <Button variant="outline" onClick={onCancel} disabled>
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}
