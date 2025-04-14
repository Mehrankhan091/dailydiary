"use client"

import { useState } from "react"
import { collection, query, where, orderBy, limit, getDocs, startAfter } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import type { SearchResult } from "@/models/social"

const RESULTS_PER_PAGE = 20

export function useSearch() {
  const { user } = useAuth()
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [lastVisible, setLastVisible] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchType, setSearchType] = useState<"all" | "users" | "diaries">("all")

  // Function to perform search
  const performSearch = async (term: string, type: "all" | "users" | "diaries" = "all", loadMore = false) => {
    if (!user || !term.trim()) {
      setResults([])
      setHasMore(false)
      return
    }

    setLoading(true)
    setError(null)

    if (!loadMore) {
      setSearchTerm(term)
      setSearchType(type)
      setLastVisible(null)
    }

    try {
      const searchResults: SearchResult[] = []

      // Try to search in Firestore, but handle permission errors gracefully
      try {
        // Search users
        if (type === "all" || type === "users") {
          let usersQuery

          if (loadMore && lastVisible?.users) {
            usersQuery = query(
              collection(db, "userProfiles"),
              where("displayName", ">=", term),
              where("displayName", "<=", term + "\uf8ff"),
              orderBy("displayName"),
              startAfter(lastVisible.users),
              limit(RESULTS_PER_PAGE / 2),
            )
          } else {
            usersQuery = query(
              collection(db, "userProfiles"),
              where("displayName", ">=", term),
              where("displayName", "<=", term + "\uf8ff"),
              orderBy("displayName"),
              limit(RESULTS_PER_PAGE / 2),
            )
          }

          const usersSnapshot = await getDocs(usersQuery)

          if (!usersSnapshot.empty) {
            const lastUser = usersSnapshot.docs[usersSnapshot.docs.length - 1]
            setLastVisible((prev) => ({ ...prev, users: lastUser }))
            setHasMore(true)

            usersSnapshot.forEach((doc) => {
              const userData = doc.data()
              searchResults.push({
                id: doc.id,
                type: "user",
                title: userData.displayName || "Unknown User",
                description: userData.bio || "",
                thumbnailURL: userData.photoURL || "",
                createdAt: userData.createdAt,
              })
            })
          }
        }

        // Search diaries
        if (type === "all" || type === "diaries") {
          let diariesQuery

          if (loadMore && lastVisible?.diaries) {
            diariesQuery = query(
              collection(db, "diaries"),
              where("isPrivate", "==", false),
              where("title", ">=", term),
              where("title", "<=", term + "\uf8ff"),
              orderBy("title"),
              orderBy("createdAt", "desc"),
              startAfter(lastVisible.diaries),
              limit(RESULTS_PER_PAGE / 2),
            )
          } else {
            diariesQuery = query(
              collection(db, "diaries"),
              where("isPrivate", "==", false),
              where("title", ">=", term),
              where("title", "<=", term + "\uf8ff"),
              orderBy("title"),
              orderBy("createdAt", "desc"),
              limit(RESULTS_PER_PAGE / 2),
            )
          }

          const diariesSnapshot = await getDocs(diariesQuery)

          if (!diariesSnapshot.empty) {
            const lastDiary = diariesSnapshot.docs[diariesSnapshot.docs.length - 1]
            setLastVisible((prev) => ({ ...prev, diaries: lastDiary }))
            setHasMore(true)

            diariesSnapshot.forEach((doc) => {
              const diaryData = doc.data()
              searchResults.push({
                id: doc.id,
                type: "diary",
                title: diaryData.title || "Untitled Diary",
                description: diaryData.description || "",
                thumbnailURL: diaryData.coverImageURL || "",
                userId: diaryData.userId,
                likeCount: diaryData.likeCount || 0,
                commentCount: diaryData.commentCount || 0,
                createdAt: diaryData.createdAt,
              })
            })
          }
        }
      } catch (firestoreErr) {
        console.error("Firestore search error:", firestoreErr)

        // If we have a permission error, try to provide some mock results
        if (firestoreErr.message && firestoreErr.message.includes("permission")) {
          // Add some mock results based on the search term
          if (type === "all" || type === "users") {
            searchResults.push({
              id: "mock-user-1",
              type: "user",
              title: `User matching "${term}"`,
              description: "This is a mock user result due to permission limitations",
              thumbnailURL: "",
              createdAt: new Date().toISOString(),
            })
          }

          if (type === "all" || type === "diaries") {
            searchResults.push({
              id: "mock-diary-1",
              type: "diary",
              title: `Diary about "${term}"`,
              description: "This is a mock diary result due to permission limitations",
              thumbnailURL: "",
              userId: "mock-user-1",
              likeCount: 5,
              commentCount: 2,
              createdAt: new Date().toISOString(),
            })
          }

          setError("Search is limited due to permission restrictions. Showing mock results.")
        } else {
          // Re-throw if it's not a permission error
          throw firestoreErr
        }
      }

      // Update results
      setResults(loadMore ? [...results, ...searchResults] : searchResults)
    } catch (err) {
      console.error("Error performing search:", err)
      setError("Failed to perform search. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  // Load more results
  const loadMore = async () => {
    if (loading || !hasMore || !searchTerm) return

    await performSearch(searchTerm, searchType, true)
  }

  // Clear search results
  const clearSearch = () => {
    setResults([])
    setSearchTerm("")
    setLastVisible(null)
    setHasMore(false)
    setError(null)
  }

  return {
    results,
    loading,
    error,
    hasMore,
    searchTerm,
    performSearch,
    loadMore,
    clearSearch,
  }
}
