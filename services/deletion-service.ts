import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore"
import { ref, deleteObject, listAll } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import type { Diary } from "@/models/diary"

// Deletion states for tracking
export type DeletionState =
  | "idle"
  | "pending"
  | "soft-deleted"
  | "deleting-videos"
  | "deleting-storage"
  | "deleting-diary"
  | "completed"
  | "failed"

export interface DeletionJob {
  id: string
  diaryId: string
  state: DeletionState
  error?: string
  retryCount: number
  startTime: number
  lastUpdateTime: number
}

// In-memory store for deletion jobs
const deletionJobs = new Map<string, DeletionJob>()

// Maximum number of retries
const MAX_RETRIES = 3

// Task queue system for deletions
const deletionQueue: (() => Promise<void>)[] = []
let isProcessingQueue = false

async function processQueue() {
  if (isProcessingQueue || deletionQueue.length === 0) return

  isProcessingQueue = true
  try {
    const task = deletionQueue.shift()
    if (task) await task()
  } finally {
    isProcessingQueue = false
    if (deletionQueue.length > 0) {
      // Use setTimeout to allow UI to breathe
      setTimeout(processQueue, 0)
    }
  }
}

export class DeletionService {
  // Create a new deletion job
  static createJob(diaryId: string): string {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    const job: DeletionJob = {
      id: jobId,
      diaryId,
      state: "pending",
      retryCount: 0,
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
    }

    deletionJobs.set(jobId, job)
    return jobId
  }

  // Get job status
  static getJob(jobId: string): DeletionJob | undefined {
    return deletionJobs.get(jobId)
  }

  // Update job state
  private static updateJobState(jobId: string, state: DeletionState, error?: string): void {
    const job = deletionJobs.get(jobId)
    if (job) {
      job.state = state
      job.lastUpdateTime = Date.now()
      if (error) job.error = error
      deletionJobs.set(jobId, job)
    }
  }

  // Archive diary to localStorage before deletion - optimized with Promise and setTimeout
  static async archiveDiary(diary: Diary): Promise<void> {
    return new Promise((resolve) => {
      // Use setTimeout to move out of main thread
      setTimeout(() => {
        try {
          const archivedDiary = {
            ...diary,
            archivedAt: new Date().toISOString(),
          }

          // Use separate keys to avoid large JSON parsing
          localStorage.setItem(`diary_archive_${diary.id}`, JSON.stringify(archivedDiary))
          localStorage.setItem("lastDeletedDiary", JSON.stringify(archivedDiary))

          // Performance monitoring
          if (diary.startTime) {
            console.log(`Archived diary ${diary.id} in ${performance.now() - diary.startTime}ms`)
          }
          resolve()
        } catch (error) {
          console.error("Error archiving diary:", error)
          resolve() // Still resolve to avoid blocking
        }
      }, 0)
    })
  }

  // Soft delete a diary (mark as deleted)
  static async softDelete(diaryId: string, jobId: string): Promise<boolean> {
    try {
      this.updateJobState(jobId, "soft-deleted")

      const diaryRef = doc(db, "diaries", diaryId)
      await updateDoc(diaryRef, {
        isDeleted: true,
        updatedAt: serverTimestamp(),
      })

      return true
    } catch (error) {
      console.error("Soft delete failed:", error)
      this.updateJobState(jobId, "failed", "Soft delete failed")
      return false
    }
  }

  // Delete all videos associated with a diary
  static async deleteVideos(diaryId: string, jobId: string): Promise<boolean> {
    try {
      this.updateJobState(jobId, "deleting-videos")

      // Get all videos for this diary
      const videosRef = collection(db, "diaryVideos")
      const q = query(videosRef, where("diaryId", "==", diaryId))
      const videoSnapshot = await getDocs(q)

      if (videoSnapshot.empty) {
        return true
      }

      // Process in batches of 100 to avoid Firestore limits
      const allVideoDocs = videoSnapshot.docs
      const batchSize = 100

      for (let i = 0; i < allVideoDocs.length; i += batchSize) {
        // Use a batch for atomic operation
        const batch = writeBatch(db)

        // Get current batch
        const videosToDelete = allVideoDocs.slice(i, i + batchSize)

        videosToDelete.forEach((videoDoc) => {
          batch.delete(doc(db, "diaryVideos", videoDoc.id))
        })

        await batch.commit()

        // Allow UI to breathe between batches
        if (i + batchSize < allVideoDocs.length) {
          await new Promise((resolve) => setTimeout(resolve, 0))
        }
      }

      return true
    } catch (error) {
      console.error("Video deletion failed:", error)
      this.updateJobState(jobId, "failed", "Video deletion failed")
      return false
    }
  }

  // Delete storage files associated with a diary
  static async deleteStorage(diaryId: string, userId: string, jobId: string): Promise<boolean> {
    try {
      this.updateJobState(jobId, "deleting-storage")

      // List all files in the diary's storage folder
      const storageRef = ref(storage, `diaries/${userId}/${diaryId}`)

      try {
        const filesList = await listAll(storageRef)

        // Process in smaller batches
        const batchSize = 20
        const allFiles = filesList.items

        for (let i = 0; i < allFiles.length; i += batchSize) {
          const fileBatch = allFiles.slice(i, i + batchSize)

          // Delete each file in the current batch
          const deletePromises = fileBatch.map((fileRef) => {
            return deleteObject(fileRef).catch((err) => {
              console.warn(`Failed to delete file ${fileRef.fullPath}:`, err)
              // Continue even if individual file deletion fails
              return null
            })
          })

          await Promise.all(deletePromises)

          // Allow UI to breathe between batches
          if (i + batchSize < allFiles.length) {
            await new Promise((resolve) => setTimeout(resolve, 0))
          }
        }
      } catch (storageError) {
        // If listing fails, just log and continue
        console.warn("Failed to list storage files:", storageError)
      }

      return true
    } catch (error) {
      console.error("Storage deletion failed:", error)
      // Don't fail the whole job for storage errors
      return true
    }
  }

  // Delete the diary document itself
  static async deleteDiaryDoc(diaryId: string, jobId: string): Promise<boolean> {
    try {
      this.updateJobState(jobId, "deleting-diary")

      const diaryRef = doc(db, "diaries", diaryId)
      await deleteDoc(diaryRef)

      this.updateJobState(jobId, "completed")
      return true
    } catch (error) {
      console.error("Diary document deletion failed:", error)
      this.updateJobState(jobId, "failed", "Diary document deletion failed")
      return false
    }
  }

  // Execute the full deletion process with queue system
  static async executeDeletion(diaryId: string, userId: string): Promise<string> {
    const jobId = this.createJob(diaryId)

    // Add deletion task to queue
    deletionQueue.push(async () => {
      const startTime = performance.now()
      try {
        await this.processDeletion(diaryId, userId, jobId, startTime)
      } finally {
        console.log(`Deletion ${jobId} completed in ${performance.now() - startTime}ms`)
      }
    })

    // Start processing if not already running
    if (!isProcessingQueue) {
      setTimeout(processQueue, 0)
    }

    return jobId
  }

  // Process the deletion job with retries
  private static async processDeletion(
    diaryId: string,
    userId: string,
    jobId: string,
    startTime: number,
  ): Promise<void> {
    const job = deletionJobs.get(jobId)
    if (!job) return

    try {
      // Step 1: Soft delete
      const softDeleted = await this.softDelete(diaryId, jobId)
      if (!softDeleted) {
        await this.retryOrFail(diaryId, userId, jobId)
        return
      }

      // Allow UI to breathe between steps
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Step 2: Delete videos
      const videosDeleted = await this.deleteVideos(diaryId, jobId)
      if (!videosDeleted) {
        await this.retryOrFail(diaryId, userId, jobId)
        return
      }

      // Allow UI to breathe between steps
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Step 3: Delete storage files
      await this.deleteStorage(diaryId, userId, jobId)

      // Allow UI to breathe between steps
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Step 4: Delete diary document
      const diaryDeleted = await this.deleteDiaryDoc(diaryId, jobId)
      if (!diaryDeleted) {
        await this.retryOrFail(diaryId, userId, jobId)
        return
      }

      // Cleanup job after successful completion
      setTimeout(() => {
        deletionJobs.delete(jobId)
      }, 60000) // Keep job info for 1 minute
    } catch (error) {
      console.error("Deletion process failed:", error)
      await this.retryOrFail(diaryId, userId, jobId)
    }
  }

  // Retry logic for failed operations
  private static async retryOrFail(diaryId: string, userId: string, jobId: string): Promise<void> {
    const job = deletionJobs.get(jobId)
    if (!job) return

    if (job.retryCount < MAX_RETRIES) {
      // Increment retry count
      job.retryCount += 1
      deletionJobs.set(jobId, job)

      // Exponential backoff
      const delay = Math.pow(2, job.retryCount) * 1000

      console.log(`Retrying deletion job ${jobId} in ${delay}ms (attempt ${job.retryCount}/${MAX_RETRIES})`)

      // Retry after delay
      setTimeout(() => {
        this.processDeletion(diaryId, userId, jobId, performance.now())
      }, delay)
    } else {
      // Max retries reached, mark as failed
      this.updateJobState(jobId, "failed", `Failed after ${MAX_RETRIES} retries`)

      // Keep failed jobs for debugging
      setTimeout(() => {
        deletionJobs.delete(jobId)
      }, 3600000) // Keep failed jobs for 1 hour
    }
  }

  // Recover a deleted diary (from soft delete)
  static async recoverDiary(diaryId: string): Promise<boolean> {
    try {
      const diaryRef = doc(db, "diaries", diaryId)
      await updateDoc(diaryRef, {
        isDeleted: false,
        updatedAt: serverTimestamp(),
      })

      return true
    } catch (error) {
      console.error("Recovery failed:", error)
      return false
    }
  }

  // Get the last deleted diary from localStorage
  static getLastDeletedDiary(): Diary | null {
    try {
      const lastDeletedDiaryJson = localStorage.getItem("lastDeletedDiary")
      if (!lastDeletedDiaryJson) return null

      return JSON.parse(lastDeletedDiaryJson)
    } catch (error) {
      console.error("Error getting last deleted diary:", error)
      return null
    }
  }
}
