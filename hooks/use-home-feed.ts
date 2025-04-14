"use client"

import { useState, useEffect } from "react"
import { collection, query, where, orderBy, limit, getDocs, startAfter, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import type { FeedItem } from "@/models/social"
import type { Diary } from "@/models/diary"
import type { UserProfile } from "@/models/user-profile"

const ITEMS_PER_PAGE = 10

export function useHomeFeed() {
  const { user } = useAuth()
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [lastVisible, setLastVisible] = useState<any>(null)
  const [useFirestore, setUseFirestore] = useState(true)

  // Fetch initial feed
  useEffect(() => {
    if (!user) {
      setFeedItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    fetchFeed()
  }, [user])

  // Function to fetch feed items
  const fetchFeed = async (loadMore = false) => {
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

      // First, get users the current user is following
      let followingIds = []
      try {
        const followsRef = collection(db, "follows")
        const followsQuery = query(followsRef, where("followerId", "==", user.uid))
        const followsSnapshot = await getDocs(followsQuery)
        followingIds = followsSnapshot.docs.map((doc) => doc.data().followingId)
      } catch (err) {
        console.error("Error fetching follows:", err)
        // Continue without follows data
      }

      // Always include the user's own content
      followingIds.push(user.uid)

      try {
        // Query for all public diaries
        let feedQuery

        if (loadMore && lastVisible) {
          feedQuery = query(
            collection(db, "diaries"),
            where("isPrivate", "==", false),
            orderBy("createdAt", "desc"),
            startAfter(lastVisible),
            limit(ITEMS_PER_PAGE),
          )
        } else {
          feedQuery = query(
            collection(db, "diaries"),
            where("isPrivate", "==", false),
            orderBy("createdAt", "desc"),
            limit(ITEMS_PER_PAGE),
          )
        }

        const diariesSnapshot = await getDocs(feedQuery)

        // Update last visible for pagination
        if (!diariesSnapshot.empty) {
          setLastVisible(diariesSnapshot.docs[diariesSnapshot.docs.length - 1])
        } else {
          setHasMore(false)
        }

        // Process diaries into feed items
        const feedItemsPromises = diariesSnapshot.docs.map(async (diaryDoc) => {
          try {
            const diaryData = { id: diaryDoc.id, ...diaryDoc.data() } as Diary

            // Default values for user info
            let userDisplayName = "Unknown User"
            let userPhotoURL = ""
            let username = "user"
            let isFollowing = false
            let userHasLiked = false

            // Get user profile for this diary
            try {
              const userProfileRef = doc(db, "userProfiles", diaryData.userId)
              const userProfileSnap = await getDoc(userProfileRef)

              if (userProfileSnap.exists()) {
                const userProfile = userProfileSnap.data() as UserProfile
                userDisplayName = userProfile.displayName || "Unknown User"
                userPhotoURL = userProfile.photoURL || ""
                username = userProfile.username || `user${diaryData.userId.substring(0, 5)}`
              } else if (diaryData.userId === user.uid) {
                // If it's the current user's diary but profile doesn't exist
                userDisplayName = user.displayName || "Me"
                userPhotoURL = user.photoURL || ""
                username = `user${user.uid.substring(0, 5)}`
              }
            } catch (profileErr) {
              console.error("Error fetching user profile:", profileErr)
              // Continue with default values
            }

            // Check if user has liked this diary
            try {
              const likeRef = doc(db, "likes", `${user.uid}_diary_${diaryData.id}`)
              const likeSnap = await getDoc(likeRef)
              userHasLiked = likeSnap.exists()
            } catch (likeErr) {
              console.error("Error checking like status:", likeErr)
              // Continue with default value
            }

            // Check if user is following the diary creator
            isFollowing = followingIds.includes(diaryData.userId)

            return {
              id: diaryData.id,
              type: "diary",
              userId: diaryData.userId,
              userDisplayName,
              username,
              userPhotoURL,
              title: diaryData.title || "Untitled",
              description: diaryData.description || "",
              thumbnailURL: diaryData.coverImageURL || "",
              isPrivate: diaryData.isPrivate || false,
              likeCount: diaryData.likeCount || 0,
              commentCount: diaryData.commentCount || 0,
              shareCount: diaryData.shareCount || 0,
              createdAt: diaryData.createdAt || new Date().toISOString(),
              userIsFollowing: isFollowing,
              userHasLiked,
            } as FeedItem
          } catch (itemErr) {
            console.error("Error processing diary item:", itemErr)
            // Skip this item
            return null
          }
        })

        const newFeedItems = (await Promise.all(feedItemsPromises)).filter(Boolean) as FeedItem[]

        // Update state
        setFeedItems(loadMore ? [...feedItems, ...newFeedItems] : newFeedItems)
        setLoading(false)

        // Save to local storage for offline access
        saveToLocalStorage(loadMore ? [...feedItems, ...newFeedItems] : newFeedItems)
      } catch (err) {
        console.error("Error fetching feed:", err)
        setError("Failed to load feed. Using cached data.")
        setUseFirestore(false)

        // Fall back to local storage
        const localFeed = getLocalFeed()
        setFeedItems(loadMore ? [...feedItems, ...localFeed] : localFeed)
        setHasMore(false)
        setLoading(false)
      }
    } catch (err) {
      console.error("Error fetching feed:", err)
      setError("Failed to load feed. Using cached data.")
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
    await fetchFeed(true)
    setLoading(false)
  }

  // Get feed from local storage
  const getLocalFeed = (): FeedItem[] => {
    try {
      const storedFeed = localStorage.getItem("homeFeed")
      return storedFeed ? JSON.parse(storedFeed) : []
    } catch (err) {
      console.error("Error reading from localStorage:", err)
      return []
    }
  }

  // Save feed to local storage
  const saveToLocalStorage = (items: FeedItem[]) => {
    try {
      localStorage.setItem("homeFeed", JSON.stringify(items))
    } catch (err) {
      console.error("Error saving to localStorage:", err)
    }
  }

  // Refresh feed
  const refreshFeed = async () => {
    setLastVisible(null)
    setHasMore(true)
    setLoading(true)
    await fetchFeed(false)
    setLoading(false)
  }

  return {
    feedItems,
    loading,
    error,
    hasMore,
    loadMore,
    refreshFeed,
    isUsingFirestore: useFirestore,
  }
}
