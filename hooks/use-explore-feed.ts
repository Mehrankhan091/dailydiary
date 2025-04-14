"use client"

import { useState, useEffect } from "react"
import { collection, query, where, orderBy, limit, getDocs, startAfter, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import type { FeedItem } from "@/models/social"
import type { Diary } from "@/models/diary"
import type { UserProfile } from "@/models/user-profile"

const ITEMS_PER_PAGE = 10

export function useExploreFeed() {
  const { user } = useAuth()
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [indexError, setIndexError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [lastVisible, setLastVisible] = useState<any>(null)
  const [useFirestore, setUseFirestore] = useState(true)

  // Fetch initial explore feed
  useEffect(() => {
    if (!user) {
      setFeedItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    fetchExploreFeed()
  }, [user])

  // Function to fetch explore feed items
  const fetchExploreFeed = async (loadMore = false) => {
    if (!user) return

    try {
      // If we've already determined Firestore isn't available, use local data
      if (!useFirestore) {
        const localFeed = getLocalFeed()
        setFeedItems(loadMore ? [...feedItems, ...localFeed] : localFeed)
        setHasMore(false)
        setLoading(false)
        return
      }

      // Try a simpler query first that doesn't require a composite index
      try {
        // First attempt: Try a simple query without complex ordering
        let exploreQuery

        if (loadMore && lastVisible) {
          exploreQuery = query(
            collection(db, "diaries"),
            where("isPrivate", "==", false),
            orderBy("createdAt", "desc"), // Simpler ordering that might not require a complex index
            startAfter(lastVisible),
            limit(ITEMS_PER_PAGE),
          )
        } else {
          exploreQuery = query(
            collection(db, "diaries"),
            where("isPrivate", "==", false),
            orderBy("createdAt", "desc"),
            limit(ITEMS_PER_PAGE),
          )
        }

        const diariesSnapshot = await getDocs(exploreQuery)

        // Update last visible for pagination
        if (!diariesSnapshot.empty) {
          setLastVisible(diariesSnapshot.docs[diariesSnapshot.docs.length - 1])
        } else {
          setHasMore(false)
        }

        // Process diaries into feed items
        const feedItemsPromises = diariesSnapshot.docs.map(async (diaryDoc) => {
          const diaryData = { id: diaryDoc.id, ...diaryDoc.data() } as Diary

          // Get user profile for this diary
          let userProfile: UserProfile | null = null
          try {
            const userProfileRef = doc(db, "userProfiles", diaryData.userId)
            const userProfileSnap = await getDoc(userProfileRef)
            userProfile = userProfileSnap.exists() ? (userProfileSnap.data() as UserProfile) : null
          } catch (profileErr) {
            console.error("Error fetching user profile:", profileErr)
            // Continue with null profile
          }

          // Check if user has liked this diary
          let userHasLiked = false
          try {
            const likeRef = doc(db, "likes", `${user.uid}_diary_${diaryData.id}`)
            const likeSnap = await getDoc(likeRef)
            userHasLiked = likeSnap.exists()
          } catch (likeErr) {
            console.error("Error checking like status:", likeErr)
            // Continue with default value
          }

          // Check if user is following the diary creator
          let isFollowing = false
          try {
            const followRef = doc(db, "follows", `${user.uid}_${diaryData.userId}`)
            const followSnap = await getDoc(followRef)
            isFollowing = followSnap.exists()
          } catch (followErr) {
            console.error("Error checking follow status:", followErr)
            // Continue with default value
          }

          return {
            id: diaryData.id,
            type: "diary",
            userId: diaryData.userId,
            userDisplayName: userProfile?.displayName || "Unknown User",
            username: userProfile?.username || `user${diaryData.userId.substring(0, 5)}`,
            userPhotoURL: userProfile?.photoURL || "",
            title: diaryData.title,
            description: diaryData.description || "",
            thumbnailURL: diaryData.coverImageURL,
            isPrivate: diaryData.isPrivate,
            likeCount: diaryData.likeCount || 0,
            commentCount: diaryData.commentCount || 0,
            shareCount: diaryData.shareCount || 0,
            createdAt: diaryData.createdAt,
            userIsFollowing: isFollowing,
            userHasLiked,
          } as FeedItem
        })

        const newFeedItems = await Promise.all(feedItemsPromises)

        // Update state
        setFeedItems(loadMore ? [...feedItems, ...newFeedItems] : newFeedItems)
        setLoading(false)
        setIndexError(null)

        // Save to local storage for offline access
        saveToLocalStorage(loadMore ? [...feedItems, ...newFeedItems] : newFeedItems)
      } catch (err: any) {
        console.error("Error fetching explore feed:", err)

        // Check if this is an index error
        const errorMessage = err.toString()
        if (errorMessage.includes("index") || errorMessage.includes("Index")) {
          // Extract the index creation URL if available
          const indexUrlMatch = errorMessage.match(/https:\/\/console\.firebase\.google\.com[^\s]+/)
          const indexUrl = indexUrlMatch ? indexUrlMatch[0] : null

          setIndexError(indexUrl || "Firestore index required. Please check the console for the index creation link.")

          // Try a fallback query that doesn't require the complex index
          try {
            // Fallback query: Just get public diaries without complex ordering
            const fallbackQuery = query(
              collection(db, "diaries"),
              where("isPrivate", "==", false),
              limit(ITEMS_PER_PAGE),
            )

            const fallbackSnapshot = await getDocs(fallbackQuery)

            // Process diaries into feed items (simplified)
            const fallbackItems = await Promise.all(
              fallbackSnapshot.docs.map(async (doc) => {
                const data = doc.data() as Diary
                return {
                  id: doc.id,
                  type: "diary",
                  userId: data.userId,
                  userDisplayName: "User", // Simplified
                  username: `user${data.userId.substring(0, 5)}`,
                  userPhotoURL: "",
                  title: data.title,
                  description: data.description || "",
                  thumbnailURL: data.coverImageURL,
                  isPrivate: data.isPrivate,
                  likeCount: data.likeCount || 0,
                  commentCount: data.commentCount || 0,
                  shareCount: data.shareCount || 0,
                  createdAt: data.createdAt,
                  userIsFollowing: false,
                  userHasLiked: false,
                } as FeedItem
              }),
            )

            setFeedItems(fallbackItems)
            setLoading(false)

            // Save to local storage
            saveToLocalStorage(fallbackItems)
          } catch (fallbackErr) {
            console.error("Error with fallback query:", fallbackErr)
            // If even the fallback fails, use local storage
            const localFeed = getLocalFeed()
            setFeedItems(localFeed)
            setLoading(false)
          }
        } else {
          // Not an index error, handle differently
          setError("Failed to load explore feed. Using cached data.")
          setUseFirestore(false)

          // Fall back to local storage
          const localFeed = getLocalFeed()
          setFeedItems(loadMore ? [...feedItems, ...localFeed] : localFeed)
          setHasMore(false)
          setLoading(false)
        }
      }
    } catch (err) {
      console.error("Error in explore feed:", err)
      setError("Failed to load explore feed. Using cached data.")
      setUseFirestore(false)

      // Fall back to local storage
      const localFeed = getLocalFeed()
      setFeedItems(loadMore ? [...feedItems, ...localFeed] : localFeed)
      setHasMore(false)
      setLoading(false)
    }
  }

  // Load more feed items
  const loadMore = async () => {
    if (loading || !hasMore) return

    setLoading(true)
    await fetchExploreFeed(true)
    setLoading(false)
  }

  // Get feed from local storage
  const getLocalFeed = (): FeedItem[] => {
    try {
      const storedFeed = localStorage.getItem("exploreFeed")
      return storedFeed ? JSON.parse(storedFeed) : []
    } catch (err) {
      console.error("Error reading from localStorage:", err)
      return []
    }
  }

  // Save feed to local storage
  const saveToLocalStorage = (items: FeedItem[]) => {
    try {
      localStorage.setItem("exploreFeed", JSON.stringify(items))
    } catch (err) {
      console.error("Error saving to localStorage:", err)
    }
  }

  // Refresh feed
  const refreshFeed = async () => {
    setLastVisible(null)
    setHasMore(true)
    setLoading(true)
    await fetchExploreFeed(false)
    setLoading(false)
  }

  return {
    feedItems,
    loading,
    error,
    indexError,
    hasMore,
    loadMore,
    refreshFeed,
    isUsingFirestore: useFirestore,
  }
}
