"use client"

import { useState, useEffect } from "react"
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  increment,
  serverTimestamp,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import type { DiaryVideo } from "@/models/diary"

export function useDiaryVideos(diaryId: string) {
  const { user } = useAuth()
  const [videos, setVideos] = useState<DiaryVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useFirestore, setUseFirestore] = useState(true)

  // Create a memory-only videos list as fallback
  const createMemoryVideos = () => {
    // Return empty array as initial state
    return []
  }

  // Fetch videos for a specific diary
  useEffect(() => {
    async function fetchVideos() {
      if (!user || !diaryId) {
        setVideos([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      // If we've already determined Firestore isn't available, use memory videos
      if (!useFirestore) {
        try {
          const localVideos = JSON.parse(localStorage.getItem("diaryVideos") || "[]")
          const filteredVideos = localVideos
            .filter((video: DiaryVideo) => video.diaryId === diaryId && video.userId === user.uid)
            .sort((a: DiaryVideo, b: DiaryVideo) => a.orderIndex - b.orderIndex)

          setVideos(filteredVideos)
        } catch (err) {
          console.error("Error loading videos from localStorage:", err)
          setVideos([])
        }

        setLoading(false)
        return
      }

      try {
        // Use a simpler query that doesn't require a composite index
        const videosRef = collection(db, "diaryVideos")
        const q = query(videosRef, where("diaryId", "==", diaryId))

        const querySnapshot = await getDocs(q)
        const videosData: DiaryVideo[] = []

        querySnapshot.forEach((doc) => {
          videosData.push({ id: doc.id, ...doc.data() } as DiaryVideo)
        })

        // Sort the videos client-side by orderIndex
        videosData.sort((a, b) => {
          return (a.orderIndex || 0) - (b.orderIndex || 0)
        })

        setVideos(videosData)
      } catch (err) {
        console.error("Error fetching videos:", err)
        setError("Missing or insufficient permissions - using local storage")

        // Disable Firestore for future operations
        setUseFirestore(false)

        // Try to load from localStorage
        try {
          const localVideos = JSON.parse(localStorage.getItem("diaryVideos") || "[]")
          const filteredVideos = localVideos
            .filter((video: DiaryVideo) => video.diaryId === diaryId && video.userId === user.uid)
            .sort((a: DiaryVideo, b: DiaryVideo) => a.orderIndex - b.orderIndex)

          setVideos(filteredVideos)
        } catch (err) {
          console.error("Error loading videos from localStorage:", err)
          setVideos([])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [user, diaryId, useFirestore])

  // The rest of the code remains the same...
  // Add a video to the diary
  const addVideo = async (videoFile: File, thumbnailFile: File, duration: number) => {
    if (!user || !diaryId) return null

    try {
      let videoURL = ""
      let thumbnailURL = ""
      const timestamp = new Date().toISOString()
      const videoId = `video_${Date.now()}`
      const orderIndex = Date.now()

      // Try to upload files to Firebase Storage
      try {
        // Upload video file
        const videoStorageRef = ref(storage, `videos/${user.uid}/${diaryId}/${Date.now()}_video`)
        await uploadBytes(videoStorageRef, videoFile)
        videoURL = await getDownloadURL(videoStorageRef)

        // Upload thumbnail
        const thumbnailStorageRef = ref(storage, `videos/${user.uid}/${diaryId}/${Date.now()}_thumbnail`)
        await uploadBytes(thumbnailStorageRef, thumbnailFile)
        thumbnailURL = await getDownloadURL(thumbnailStorageRef)
      } catch (err) {
        console.error("Error uploading files to Firebase Storage:", err)

        // Create local URLs for files
        videoURL = URL.createObjectURL(videoFile)
        thumbnailURL = URL.createObjectURL(thumbnailFile)
      }

      // Create video data
      const videoData = {
        id: videoId,
        diaryId,
        userId: user.uid,
        videoURL,
        thumbnailURL,
        duration,
        orderIndex,
        createdAt: timestamp,
      } as DiaryVideo

      // Try to save to Firestore if available
      if (useFirestore) {
        try {
          // Remove id from the data to be saved (Firestore will generate its own)
          const { id, ...firestoreData } = videoData

          // Add serverTimestamp for Firestore
          const docRef = await addDoc(collection(db, "diaryVideos"), {
            ...firestoreData,
            createdAt: serverTimestamp(),
          })

          // Update the ID to use Firestore's ID
          videoData.id = docRef.id

          // Increment video count in diary
          const diaryRef = doc(db, "diaries", diaryId)
          await updateDoc(diaryRef, {
            videoCount: increment(1),
            updatedAt: serverTimestamp(),
          })
        } catch (err) {
          console.error("Error creating video in Firestore:", err)
          setError("Permission error - using local storage")
          setUseFirestore(false)

          // Continue with local video (already created above)

          // Update diary video count in local storage
          try {
            const localDiaries = JSON.parse(localStorage.getItem("diaries") || "[]")
            const updatedDiaries = localDiaries.map((diary: any) => {
              if (diary.id === diaryId) {
                return {
                  ...diary,
                  videoCount: (diary.videoCount || 0) + 1,
                  updatedAt: timestamp,
                }
              }
              return diary
            })
            localStorage.setItem("diaries", JSON.stringify(updatedDiaries))
          } catch (err) {
            console.error("Error updating diary count in localStorage:", err)
          }
        }
      } else {
        // Update diary video count in local storage
        try {
          const localDiaries = JSON.parse(localStorage.getItem("diaries") || "[]")
          const updatedDiaries = localDiaries.map((diary: any) => {
            if (diary.id === diaryId) {
              return {
                ...diary,
                videoCount: (diary.videoCount || 0) + 1,
                updatedAt: timestamp,
              }
            }
            return diary
          })
          localStorage.setItem("diaries", JSON.stringify(updatedDiaries))
        } catch (err) {
          console.error("Error updating diary count in localStorage:", err)
        }
      }

      // Update local state
      setVideos((prev) => [...prev, videoData])

      // Save to localStorage as fallback
      try {
        const localVideos = JSON.parse(localStorage.getItem("diaryVideos") || "[]")
        localStorage.setItem("diaryVideos", JSON.stringify([...localVideos, videoData]))
      } catch (err) {
        console.error("Error saving to localStorage:", err)
      }

      return videoData
    } catch (err) {
      console.error("Error adding video:", err)
      setError("Failed to add video")
      return null
    }
  }

  // Delete a video from the diary
  const deleteVideo = async (videoId: string) => {
    if (!user || !diaryId) return false

    try {
      // Find the video in local state
      const videoToDelete = videos.find((v) => v.id === videoId)
      if (!videoToDelete) return false

      // Try to delete from Firestore if available
      if (useFirestore) {
        try {
          // Delete video file from storage
          if (videoToDelete.videoURL && !videoToDelete.videoURL.startsWith("blob:")) {
            try {
              const videoRef = ref(storage, videoToDelete.videoURL)
              await deleteObject(videoRef)
            } catch (err) {
              console.error("Error deleting video file:", err)
            }
          }

          // Delete thumbnail from storage
          if (videoToDelete.thumbnailURL && !videoToDelete.thumbnailURL.startsWith("blob:")) {
            try {
              const thumbnailRef = ref(storage, videoToDelete.thumbnailURL)
              await deleteObject(thumbnailRef)
            } catch (err) {
              console.error("Error deleting thumbnail:", err)
            }
          }

          // Delete video document
          await deleteDoc(doc(db, "diaryVideos", videoId))

          // Decrement video count in diary
          const diaryRef = doc(db, "diaries", diaryId)
          await updateDoc(diaryRef, {
            videoCount: increment(-1),
            updatedAt: serverTimestamp(),
          })
        } catch (err) {
          console.error("Error deleting from Firestore:", err)
          setError("Permission error - using local storage")
          setUseFirestore(false)

          // Continue with local deletion (handled below)

          // Update diary video count in local storage
          try {
            const localDiaries = JSON.parse(localStorage.getItem("diaries") || "[]")
            const updatedDiaries = localDiaries.map((diary: any) => {
              if (diary.id === diaryId) {
                return {
                  ...diary,
                  videoCount: Math.max(0, (diary.videoCount || 0) - 1),
                  updatedAt: new Date().toISOString(),
                }
              }
              return diary
            })
            localStorage.setItem("diaries", JSON.stringify(updatedDiaries))
          } catch (err) {
            console.error("Error updating diary count in localStorage:", err)
          }
        }
      } else {
        // Update diary video count in local storage
        try {
          const localDiaries = JSON.parse(localStorage.getItem("diaries") || "[]")
          const updatedDiaries = localDiaries.map((diary: any) => {
            if (diary.id === diaryId) {
              return {
                ...diary,
                videoCount: Math.max(0, (diary.videoCount || 0) - 1),
                updatedAt: new Date().toISOString(),
              }
            }
            return diary
          })
          localStorage.setItem("diaries", JSON.stringify(updatedDiaries))
        } catch (err) {
          console.error("Error updating diary count in localStorage:", err)
        }
      }

      // Update local state
      setVideos((prev) => prev.filter((video) => video.id !== videoId))

      // Delete from localStorage as fallback
      try {
        const localVideos = JSON.parse(localStorage.getItem("diaryVideos") || "[]")
        const updatedVideos = localVideos.filter((video: DiaryVideo) => video.id !== videoId)
        localStorage.setItem("diaryVideos", JSON.stringify(updatedVideos))
      } catch (err) {
        console.error("Error deleting from localStorage:", err)
      }

      return true
    } catch (err) {
      console.error("Error deleting video:", err)
      setError("Failed to delete video")
      return false
    }
  }

  // Reorder videos
  const reorderVideos = async (videoIds: string[]) => {
    if (!user || !diaryId) return false

    try {
      // Update order index for each video
      const updatedVideos = [...videos]

      videoIds.forEach((videoId, index) => {
        const videoIndex = updatedVideos.findIndex((v) => v.id === videoId)
        if (videoIndex !== -1) {
          updatedVideos[videoIndex] = {
            ...updatedVideos[videoIndex],
            orderIndex: index,
          }
        }
      })

      // Try to update in Firestore if available
      if (useFirestore) {
        try {
          const updatePromises = videoIds.map((videoId, index) => {
            const videoRef = doc(db, "diaryVideos", videoId)
            return updateDoc(videoRef, {
              orderIndex: index,
            })
          })

          await Promise.all(updatePromises)
        } catch (err) {
          console.error("Error reordering videos in Firestore:", err)
          setError("Permission error - using local storage")
          setUseFirestore(false)

          // Continue with local reordering (handled below)
        }
      }

      // Update local state
      setVideos(updatedVideos.sort((a, b) => a.orderIndex - b.orderIndex))

      // Update in localStorage as fallback
      try {
        const localVideos = JSON.parse(localStorage.getItem("diaryVideos") || "[]")
        const otherVideos = localVideos.filter((video: DiaryVideo) => video.diaryId !== diaryId)
        const updatedLocalVideos = [...otherVideos, ...updatedVideos]
        localStorage.setItem("diaryVideos", JSON.stringify(updatedLocalVideos))
      } catch (err) {
        console.error("Error updating order in localStorage:", err)
      }

      return true
    } catch (err) {
      console.error("Error reordering videos:", err)
      setError("Failed to reorder videos")
      return false
    }
  }

  return {
    videos,
    loading,
    error,
    addVideo,
    deleteVideo,
    reorderVideos,
    isUsingFirestore: useFirestore,
  }
}
