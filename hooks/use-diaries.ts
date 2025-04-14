"use client"

import { useState, useEffect, useCallback, useReducer } from "react"
import { useAuth } from "@/contexts/auth-context"
import type { Diary } from "@/models/diary"
import { DiaryService } from "@/services/diary-service"
import { DeletionService, type DeletionJob } from "@/services/deletion-service"

// Define state interface for reducer
interface DiariesState {
  diaries: Diary[]
  loading: boolean
  error: string | null
  useFirestore: boolean
  lastDeletedDiary: Diary | null
  isDeleting: boolean
  deletionJobs: Map<string, DeletionJob>
}

// Define action types
type DiariesAction =
  | { type: "SET_DIARIES"; payload: Diary[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_USE_FIRESTORE"; payload: boolean }
  | { type: "SET_LAST_DELETED_DIARY"; payload: Diary | null }
  | { type: "SET_IS_DELETING"; payload: boolean }
  | { type: "ADD_DELETION_JOB"; payload: { jobId: string; job: DeletionJob } }
  | { type: "REMOVE_DIARY"; payload: string }
  | { type: "ADD_DIARY"; payload: Diary }
  | { type: "UPDATE_DIARY"; payload: { diaryId: string; updates: Partial<Diary> } }
  | { type: "BATCH_UPDATE"; payload: Partial<DiariesState> }

// Reducer function
function diariesReducer(state: DiariesState, action: DiariesAction): DiariesState {
  switch (action.type) {
    case "SET_DIARIES":
      return { ...state, diaries: action.payload }
    case "SET_LOADING":
      return { ...state, loading: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload }
    case "SET_USE_FIRESTORE":
      return { ...state, useFirestore: action.payload }
    case "SET_LAST_DELETED_DIARY":
      return { ...state, lastDeletedDiary: action.payload }
    case "SET_IS_DELETING":
      return { ...state, isDeleting: action.payload }
    case "ADD_DELETION_JOB":
      const newJobs = new Map(state.deletionJobs)
      newJobs.set(action.payload.jobId, action.payload.job)
      return { ...state, deletionJobs: newJobs }
    case "REMOVE_DIARY":
      return {
        ...state,
        diaries: state.diaries.filter((diary) => diary.id !== action.payload),
      }
    case "ADD_DIARY":
      return {
        ...state,
        diaries: [action.payload, ...state.diaries],
      }
    case "UPDATE_DIARY":
      return {
        ...state,
        diaries: state.diaries.map((diary) =>
          diary.id === action.payload.diaryId ? { ...diary, ...action.payload.updates } : diary,
        ),
      }
    case "BATCH_UPDATE":
      return { ...state, ...action.payload }
    default:
      return state
  }
}

export function useDiaries() {
  const { user } = useAuth()
  const [refreshCounter, setRefreshCounter] = useState(0)

  // Initial state
  const initialState: DiariesState = {
    diaries: [],
    loading: true,
    error: null,
    useFirestore: true,
    lastDeletedDiary: null,
    isDeleting: false,
    deletionJobs: new Map(),
  }

  // Use reducer for state management
  const [state, dispatch] = useReducer(diariesReducer, initialState)

  // Destructure state for easier access
  const { diaries, loading, error, useFirestore, lastDeletedDiary, isDeleting, deletionJobs } = state

  // Fetch user's diaries
  const fetchDiaries = useCallback(async () => {
    if (!user) {
      dispatch({ type: "BATCH_UPDATE", payload: { diaries: [], loading: false } })
      return
    }

    dispatch({ type: "SET_LOADING", payload: true })
    dispatch({ type: "SET_ERROR", payload: null })

    // If we've already determined Firestore isn't available, use memory diaries
    if (!useFirestore) {
      try {
        const localDiaries = JSON.parse(localStorage.getItem("diaries") || "[]")
        const userDiaries = localDiaries.filter((diary: Diary) => diary.userId === user.uid)
        dispatch({ type: "SET_DIARIES", payload: userDiaries })
      } catch (err) {
        console.error("Error loading from localStorage:", err)
        dispatch({ type: "SET_DIARIES", payload: [] })
      }
      dispatch({ type: "SET_LOADING", payload: false })
      return
    }

    try {
      // Use the diary service to fetch diaries
      const diariesData = await DiaryService.fetchDiaries(user.uid)

      // Filter out soft-deleted diaries
      const activeDiaries = diariesData.filter((diary) => !diary.isDeleted)

      // Check for last deleted diary
      const lastDeleted = DeletionService.getLastDeletedDiary()

      // Batch update state
      dispatch({
        type: "BATCH_UPDATE",
        payload: {
          diaries: activeDiaries,
          lastDeletedDiary: lastDeleted || null,
          loading: false,
        },
      })
    } catch (err) {
      console.error("Error fetching diaries:", err)
      dispatch({ type: "SET_ERROR", payload: "Missing or insufficient permissions - using local storage" })
      dispatch({ type: "SET_USE_FIRESTORE", payload: false })

      // Use memory diaries
      try {
        const localDiaries = JSON.parse(localStorage.getItem("diaries") || "[]")
        const userDiaries = localDiaries.filter((diary: Diary) => diary.userId === user.uid)
        dispatch({ type: "SET_DIARIES", payload: userDiaries })
      } catch (localErr) {
        console.error("Error loading from localStorage:", localErr)
        dispatch({ type: "SET_DIARIES", payload: [] })
      }
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [user, useFirestore])

  // Initial fetch and refresh when counter changes
  useEffect(() => {
    fetchDiaries()
  }, [fetchDiaries, refreshCounter])

  // Create a new diary
  const createDiary = async (title: string, description: string, coverImage: File | null, isPrivate: boolean) => {
    if (!user) return null

    try {
      if (useFirestore) {
        try {
          // Use the diary service to create a diary
          const newDiary = await DiaryService.createDiary(user.uid, title, description, coverImage, isPrivate)

          // Update local state
          dispatch({ type: "ADD_DIARY", payload: newDiary })

          return newDiary
        } catch (err) {
          console.error("Error creating diary in Firestore:", err)
          dispatch({ type: "SET_ERROR", payload: "Permission error - using local storage" })
          dispatch({ type: "SET_USE_FIRESTORE", payload: false })

          // Fall back to local storage
        }
      }

      // Local storage fallback
      const timestamp = new Date().toISOString()
      const diaryId = `diary_${Date.now()}`

      // Create diary data for local storage
      const diaryData = {
        id: diaryId,
        userId: user.uid,
        title,
        description,
        coverImageURL: "",
        isPrivate,
        videoCount: 0,
        isDeleted: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      } as Diary

      // Update local state
      dispatch({ type: "ADD_DIARY", payload: diaryData })

      // Save to localStorage
      try {
        const localDiaries = JSON.parse(localStorage.getItem("diaries") || "[]")
        localStorage.setItem("diaries", JSON.stringify([diaryData, ...localDiaries]))
      } catch (err) {
        console.error("Error saving to localStorage:", err)
      }

      return diaryData
    } catch (err) {
      console.error("Error creating diary:", err)
      dispatch({ type: "SET_ERROR", payload: "Failed to create diary" })
      return null
    }
  }

  // Update diary details
  const updateDiary = async (diaryId: string, updates: Partial<Diary>, newCoverImage?: File) => {
    if (!user) return false

    try {
      const timestamp = new Date().toISOString()

      if (useFirestore) {
        try {
          // Use the diary service to update the diary
          await DiaryService.updateDiary(diaryId, updates, newCoverImage)

          // Get updated coverImageURL if a new image was uploaded
          let coverImageURL = updates.coverImageURL
          if (newCoverImage) {
            const updatedDiary = await DiaryService.getDiaryById(diaryId)
            if (updatedDiary) {
              coverImageURL = updatedDiary.coverImageURL
            }
          }

          // Update local state
          dispatch({
            type: "UPDATE_DIARY",
            payload: {
              diaryId,
              updates: {
                ...updates,
                ...(coverImageURL ? { coverImageURL } : {}),
                updatedAt: timestamp,
              },
            },
          })

          return true
        } catch (err) {
          console.error("Error updating diary in Firestore:", err)
          dispatch({ type: "SET_ERROR", payload: "Permission error - using local storage" })
          dispatch({ type: "SET_USE_FIRESTORE", payload: false })

          // Continue with local update
        }
      }

      // Local storage fallback
      dispatch({
        type: "UPDATE_DIARY",
        payload: {
          diaryId,
          updates: { ...updates, updatedAt: timestamp },
        },
      })

      // Update in localStorage
      try {
        const localDiaries = JSON.parse(localStorage.getItem("diaries") || "[]")
        const updatedDiaries = localDiaries.map((diary: Diary) =>
          diary.id === diaryId ? { ...diary, ...updates, updatedAt: timestamp } : diary,
        )
        localStorage.setItem("diaries", JSON.stringify(updatedDiaries))
      } catch (err) {
        console.error("Error updating in localStorage:", err)
      }

      return true
    } catch (err) {
      console.error("Error updating diary:", err)
      dispatch({ type: "SET_ERROR", payload: "Failed to update diary" })
      return false
    }
  }

  // Helper method for processing local storage deletions in chunks
  const processLocalDeletion = async (diaryId: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        ;(window as any).requestIdleCallback(
          async () => {
            try {
              const localDiaries = JSON.parse(localStorage.getItem("diaries") || "[]")
              const updatedDiaries = localDiaries.filter((d: Diary) => d.id !== diaryId)

              // Split into chunks if large
              if (updatedDiaries.length > 100) {
                const chunkSize = 50
                for (let i = 0; i < updatedDiaries.length; i += chunkSize) {
                  const chunk = updatedDiaries.slice(i, i + chunkSize)
                  localStorage.setItem("diaries", JSON.stringify(chunk))
                  await new Promise((r) => setTimeout(r, 0))
                }
              } else {
                localStorage.setItem("diaries", JSON.stringify(updatedDiaries))
              }

              // Handle videos separately
              const localVideos = JSON.parse(localStorage.getItem("diaryVideos") || "[]")
              const updatedVideos = localVideos.filter((v: any) => v.diaryId !== diaryId)
              localStorage.setItem("diaryVideos", JSON.stringify(updatedVideos))

              resolve()
            } catch (err) {
              console.error("Error updating localStorage:", err)
              resolve()
            }
          },
          { timeout: 2000 },
        )
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(async () => {
          try {
            const localDiaries = JSON.parse(localStorage.getItem("diaries") || "[]")
            const updatedDiaries = localDiaries.filter((d: Diary) => d.id !== diaryId)
            localStorage.setItem("diaries", JSON.stringify(updatedDiaries))

            const localVideos = JSON.parse(localStorage.getItem("diaryVideos") || "[]")
            const updatedVideos = localVideos.filter((v: any) => v.diaryId !== diaryId)
            localStorage.setItem("diaryVideos", JSON.stringify(updatedVideos))

            resolve()
          } catch (err) {
            console.error("Error updating localStorage:", err)
            resolve()
          }
        }, 0)
      }
    })
  }

  // Delete a diary using the new deletion service with improved non-blocking approach
  const deleteDiary = async (diaryId: string): Promise<{ success: boolean; jobId?: string }> => {
    if (!user || isDeleting) return { success: false }

    try {
      dispatch({ type: "SET_IS_DELETING", payload: true })

      // Use microtask for immediate UI response
      await Promise.resolve()

      const diaryToDelete = diaries.find((d) => d.id === diaryId)
      if (!diaryToDelete) {
        dispatch({ type: "SET_IS_DELETING", payload: false })
        return { success: false }
      }

      // Add performance tracking
      const startTime = performance.now()
      diaryToDelete.startTime = startTime

      // Batch all state updates - optimistic UI update
      dispatch({
        type: "BATCH_UPDATE",
        payload: {
          diaries: diaries.filter((d) => d.id !== diaryId),
          lastDeletedDiary: diaryToDelete,
        },
      })

      // Use setTimeout to break up the work
      return await new Promise((resolve) => {
        setTimeout(async () => {
          try {
            await DeletionService.archiveDiary(diaryToDelete)

            if (useFirestore) {
              const jobId = await DeletionService.executeDeletion(diaryId, user.uid)

              // Update local deletion jobs
              const job = DeletionService.getJob(jobId)
              if (job) {
                dispatch({
                  type: "ADD_DELETION_JOB",
                  payload: { jobId, job },
                })
              }

              console.log(`Deletion initiated in ${performance.now() - startTime}ms`)
              resolve({ success: true, jobId })
            } else {
              // Local storage fallback with chunking
              await processLocalDeletion(diaryId)
              resolve({ success: true })
            }
          } catch (error) {
            console.error("Deletion failed:", error)
            resolve({ success: false })
          } finally {
            dispatch({ type: "SET_IS_DELETING", payload: false })
          }
        }, 0)
      })
    } catch (error) {
      console.error("Error in delete process:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to delete diary" })
      dispatch({ type: "SET_IS_DELETING", payload: false })
      return { success: false }
    }
  }

  // Recover the last deleted diary
  const recoverLastDeletedDiary = async (): Promise<boolean> => {
    if (!lastDeletedDiary) return false

    try {
      if (useFirestore) {
        // Try to recover from Firestore
        const success = await DeletionService.recoverDiary(lastDeletedDiary.id)
        if (success) {
          // Batch update state
          dispatch({
            type: "BATCH_UPDATE",
            payload: {
              diaries: [...diaries, lastDeletedDiary],
              lastDeletedDiary: null,
            },
          })

          // Clear from localStorage
          localStorage.removeItem("lastDeletedDiary")

          return true
        }
      }

      // Local recovery fallback
      dispatch({
        type: "BATCH_UPDATE",
        payload: {
          diaries: [...diaries, lastDeletedDiary],
          lastDeletedDiary: null,
        },
      })

      // Update localStorage
      try {
        const localDiaries = JSON.parse(localStorage.getItem("diaries") || "[]")
        localStorage.setItem("diaries", JSON.stringify([...localDiaries, lastDeletedDiary]))
        localStorage.removeItem("lastDeletedDiary")
      } catch (err) {
        console.error("Error updating localStorage:", err)
      }

      return true
    } catch (err) {
      console.error("Error recovering diary:", err)
      return false
    }
  }

  // Force refresh the diaries list
  const refreshDiaries = () => {
    setRefreshCounter((prev) => prev + 1)
  }

  return {
    diaries,
    loading,
    error,
    createDiary,
    updateDiary,
    deleteDiary,
    lastDeletedDiary,
    recoverLastDeletedDiary,
    isUsingFirestore: useFirestore,
    isDeleting,
    refreshDiaries,
  }
}
