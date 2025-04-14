import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  writeBatch,
  getDoc,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import type { Diary } from "@/models/diary"

export class DiaryService {
  // Fetch diaries for a user
  static async fetchDiaries(userId: string): Promise<Diary[]> {
    try {
      const diariesRef = collection(db, "diaries")
      const q = query(diariesRef, where("userId", "==", userId))
      const querySnapshot = await getDocs(q)

      const diariesData: Diary[] = []
      querySnapshot.forEach((doc) => {
        diariesData.push({ id: doc.id, ...doc.data() } as Diary)
      })

      // Sort by createdAt in descending order
      diariesData.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0)
        const timeB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0)
        return timeB.getTime() - timeA.getTime()
      })

      return diariesData
    } catch (error) {
      console.error("Error fetching diaries:", error)
      throw error
    }
  }

  // Create a new diary
  static async createDiary(
    userId: string,
    title: string,
    description: string,
    coverImage: File | null,
    isPrivate: boolean,
  ): Promise<Diary> {
    try {
      let coverImageURL = ""

      // Upload cover image if provided
      if (coverImage) {
        const storageRef = ref(storage, `diaries/${userId}/${Date.now()}_cover`)
        await uploadBytes(storageRef, coverImage)
        coverImageURL = await getDownloadURL(storageRef)
      }

      // Create diary data
      const diaryData = {
        userId,
        title,
        description,
        coverImageURL,
        isPrivate,
        videoCount: 0,
        isDeleted: false, // Add soft delete flag
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      // Add to Firestore
      const docRef = await addDoc(collection(db, "diaries"), diaryData)

      // Return the created diary with its ID
      return {
        id: docRef.id,
        ...diaryData,
        createdAt: new Date().toISOString(), // Convert for client-side use
        updatedAt: new Date().toISOString(),
      } as Diary
    } catch (error) {
      console.error("Error creating diary:", error)
      throw error
    }
  }

  // Update diary details
  static async updateDiary(diaryId: string, updates: Partial<Diary>, newCoverImage?: File): Promise<boolean> {
    try {
      let coverImageURL = updates.coverImageURL

      // Upload new cover image if provided
      if (newCoverImage) {
        const diaryDoc = await getDoc(doc(db, "diaries", diaryId))
        const diaryData = diaryDoc.data() as Diary

        const storageRef = ref(storage, `diaries/${diaryData.userId}/${Date.now()}_cover`)
        await uploadBytes(storageRef, newCoverImage)
        coverImageURL = await getDownloadURL(storageRef)
      }

      // Update in Firestore
      const diaryRef = doc(db, "diaries", diaryId)
      await updateDoc(diaryRef, {
        ...updates,
        ...(coverImageURL ? { coverImageURL } : {}),
        updatedAt: serverTimestamp(),
      })

      return true
    } catch (error) {
      console.error("Error updating diary:", error)
      throw error
    }
  }

  // Soft delete a diary
  static async softDeleteDiary(diaryId: string): Promise<boolean> {
    try {
      // Mark as deleted but don't actually remove
      const diaryRef = doc(db, "diaries", diaryId)
      await updateDoc(diaryRef, {
        isDeleted: true,
        updatedAt: serverTimestamp(),
      })

      return true
    } catch (error) {
      console.error("Error soft deleting diary:", error)
      throw error
    }
  }

  // Hard delete a diary and its videos
  static async hardDeleteDiary(diaryId: string): Promise<boolean> {
    try {
      const batch = writeBatch(db)

      // Get the diary document
      const diaryRef = doc(db, "diaries", diaryId)

      // Get all videos for this diary
      const videosRef = collection(db, "diaryVideos")
      const q = query(videosRef, where("diaryId", "==", diaryId))
      const videoSnapshot = await getDocs(q)

      // Add all video deletions to batch
      videoSnapshot.docs.forEach((videoDoc) => {
        batch.delete(doc(db, "diaryVideos", videoDoc.id))
      })

      // Add diary deletion to batch
      batch.delete(diaryRef)

      // Commit the batch
      await batch.commit()

      return true
    } catch (error) {
      console.error("Error hard deleting diary:", error)
      throw error
    }
  }

  // Hybrid delete approach - soft delete first, then hard delete asynchronously
  static async deleteDiary(diaryId: string): Promise<boolean> {
    try {
      // Step 1: Soft delete first (this is quick and ensures UI can update immediately)
      await this.softDeleteDiary(diaryId)

      // Step 2: Schedule hard delete to run asynchronously
      // This won't block the UI and will complete in the background
      setTimeout(async () => {
        try {
          await this.hardDeleteDiary(diaryId)
          console.log(`Diary ${diaryId} has been permanently deleted`)
        } catch (error) {
          console.error(`Background hard delete failed for diary ${diaryId}:`, error)
          // The diary is still soft-deleted, so this isn't critical
        }
      }, 2000) // Give a short delay to ensure UI has updated

      return true
    } catch (error) {
      console.error("Error in hybrid delete process:", error)
      throw error
    }
  }

  // Get diary by ID
  static async getDiaryById(diaryId: string): Promise<Diary | null> {
    try {
      const diaryDoc = await getDoc(doc(db, "diaries", diaryId))

      if (!diaryDoc.exists()) {
        return null
      }

      return { id: diaryDoc.id, ...diaryDoc.data() } as Diary
    } catch (error) {
      console.error("Error getting diary:", error)
      throw error
    }
  }

  // Archive diary to localStorage (for offline/backup)
  static archiveDiaryToLocalStorage(diary: Diary): void {
    try {
      // Get existing archived diaries
      const archivedDiaries = JSON.parse(localStorage.getItem("archivedDiaries") || "[]")

      // Add this diary to archive with timestamp
      const archivedDiary = {
        ...diary,
        archivedAt: new Date().toISOString(),
      }

      // Update archive
      localStorage.setItem("archivedDiaries", JSON.stringify([...archivedDiaries, archivedDiary]))
    } catch (error) {
      console.error("Error archiving diary to localStorage:", error)
      // Non-critical operation, so just log error
    }
  }
}
