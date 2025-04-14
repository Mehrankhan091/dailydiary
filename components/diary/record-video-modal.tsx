"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VideoRecorder } from "@/components/video/video-recorder"
import { VideoUploader } from "@/components/video/video-uploader"

interface RecordVideoModalProps {
  diaryId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RecordVideoModal({ diaryId, isOpen, onClose, onSuccess }: RecordVideoModalProps) {
  const [step, setStep] = useState<"record" | "upload">("record")
  const [videoData, setVideoData] = useState<{
    videoBlob: Blob
    thumbnailBlob: Blob
    duration: number
  } | null>(null)

  const handleVideoRecorded = (videoBlob: Blob, thumbnailBlob: Blob, duration: number) => {
    setVideoData({ videoBlob, thumbnailBlob, duration })
    setStep("upload")
  }

  const handleCancel = () => {
    setStep("record")
    setVideoData(null)
    onClose()
  }

  const handleSuccess = () => {
    setStep("record")
    setVideoData(null)
    onSuccess()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{step === "record" ? "Record Video" : "Upload Video"}</DialogTitle>
        </DialogHeader>

        {step === "record" && <VideoRecorder onVideoRecorded={handleVideoRecorded} onCancel={handleCancel} />}

        {step === "upload" && videoData && (
          <VideoUploader
            diaryId={diaryId}
            videoBlob={videoData.videoBlob}
            thumbnailBlob={videoData.thumbnailBlob}
            duration={videoData.duration}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
