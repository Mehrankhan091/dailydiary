"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Video, Square, Pause, Play, Trash2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface VideoRecorderProps {
  onVideoRecorded: (videoBlob: Blob, thumbnailBlob: Blob, duration: number) => void
  onCancel: () => void
}

export function VideoRecorder({ onVideoRecorded, onCancel }: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null)
  const [videoURL, setVideoURL] = useState<string | null>(null)
  const [thumbnailURL, setThumbnailURL] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const MAX_RECORDING_TIME = 90 // 90 seconds

  // Initialize camera
  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: true,
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          streamRef.current = stream
        }
      } catch (err) {
        console.error("Error accessing camera:", err)
        setError("Could not access camera or microphone. Please ensure you've granted the necessary permissions.")
      }
    }

    setupCamera()

    // Cleanup function
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      if (videoURL) {
        URL.revokeObjectURL(videoURL)
      }

      if (thumbnailURL) {
        URL.revokeObjectURL(thumbnailURL)
      }
    }
  }, [])

  const startRecording = () => {
    if (!streamRef.current) return

    chunksRef.current = []

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm;codecs=h264",
      videoBitsPerSecond: 2500000, // 2.5 Mbps for 720p
    })

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data)
      }
    }

    mediaRecorder.onstop = () => {
      const videoBlob = new Blob(chunksRef.current, { type: "video/webm" })
      processRecording(videoBlob)
    }

    mediaRecorderRef.current = mediaRecorder
    mediaRecorder.start(1000) // Collect data every second

    setIsRecording(true)
    setRecordingTime(0)

    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= MAX_RECORDING_TIME) {
          stopRecording()
          return MAX_RECORDING_TIME
        }
        return prev + 1
      })
    }, 1000)
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_RECORDING_TIME) {
            stopRecording()
            return MAX_RECORDING_TIME
          }
          return prev + 1
        })
      }, 1000)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const processRecording = async (videoBlob: Blob) => {
    setIsProcessing(true)

    try {
      // Create video URL for preview
      const url = URL.createObjectURL(videoBlob)
      setVideoURL(url)
      setRecordedVideo(videoBlob)

      // Load the video to generate thumbnail and get duration
      const video = document.createElement("video")
      video.src = url

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          // Generate thumbnail from first frame
          video.currentTime = 1 // Set to 1 second to avoid black frame

          video.onseeked = () => {
            const canvas = document.createElement("canvas")
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext("2d")
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)

            // Convert to WebP for smaller size
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const thumbnailUrl = URL.createObjectURL(blob)
                  setThumbnailURL(thumbnailUrl)

                  // Pass the processed video and thumbnail to parent
                  onVideoRecorded(videoBlob, blob, video.duration)
                }
                resolve()
              },
              "image/webp",
              0.8,
            )
          }
        }
      })
    } catch (err) {
      console.error("Error processing video:", err)
      setError("Error processing video. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const discardRecording = () => {
    if (videoURL) {
      URL.revokeObjectURL(videoURL)
    }

    if (thumbnailURL) {
      URL.revokeObjectURL(thumbnailURL)
    }

    setRecordedVideo(null)
    setVideoURL(null)
    setThumbnailURL(null)
    setRecordingTime(0)

    onCancel()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="text-red-500 font-medium">{error}</div>
            <Button onClick={onCancel}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardContent className="p-6 space-y-4">
        <div className="relative aspect-video bg-black rounded-md overflow-hidden">
          {!recordedVideo ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <video src={videoURL || undefined} controls className="w-full h-full object-contain" />
          )}

          {isRecording && (
            <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded-md flex items-center">
              <div className="w-3 h-3 rounded-full bg-white mr-2 animate-pulse"></div>
              {formatTime(recordingTime)} / {formatTime(MAX_RECORDING_TIME)}
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Processing video...</p>
              </div>
            </div>
          )}
        </div>

        {isRecording && <Progress value={(recordingTime / MAX_RECORDING_TIME) * 100} className="h-2" />}

        <div className="flex justify-center gap-4">
          {!isRecording && !recordedVideo && (
            <>
              <Button onClick={startRecording}>
                <Video className="mr-2 h-4 w-4" />
                Start Recording
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </>
          )}

          {isRecording && (
            <>
              <Button variant="destructive" onClick={stopRecording}>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>

              {isPaused ? (
                <Button onClick={resumeRecording}>
                  <Play className="mr-2 h-4 w-4" />
                  Resume
                </Button>
              ) : (
                <Button onClick={pauseRecording}>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </Button>
              )}
            </>
          )}

          {recordedVideo && !isProcessing && (
            <>
              <Button variant="destructive" onClick={discardRecording}>
                <Trash2 className="mr-2 h-4 w-4" />
                Discard
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </>
          )}
        </div>

        {isRecording && (
          <p className="text-center text-sm text-gray-500">Recording will automatically stop after 90 seconds</p>
        )}
      </CardContent>
    </Card>
  )
}
