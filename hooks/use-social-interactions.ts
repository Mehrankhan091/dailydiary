"use client"

import { useState } from "react"
import {
  doc,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  increment,
  serverTimestamp,
  setDoc,
  limit as firestoreLimit,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import type { Comment } from "@/models/social"

export function useSocialInteractions() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Like/Unlike a diary or video
  const toggleLike = async (targetId: string, targetType: "diary" | "video") => {
    if (!user) return false

    setLoading(true)
    setError(null)

    try {
      // Create a unique ID for the like document
      const likeId = `${user.uid}_${targetType}_${targetId}`
      const likeRef = doc(db, "likes", likeId)
      const likeDoc = await getDoc(likeRef)

      // Get the target document reference
      const targetRef = doc(db, targetType === "diary" ? "diaries" : "diaryVideos", targetId)
      const targetDoc = await getDoc(targetRef)

      if (!targetDoc.exists()) {
        throw new Error(`${targetType} not found`)
      }

      if (likeDoc.exists()) {
        // Unlike: Delete the like document and decrement the count
        await deleteDoc(likeRef)
        await updateDoc(targetRef, {
          likeCount: increment(-1),
        })

        // Update user profile stats
        try {
          const userProfileRef = doc(db, "userProfiles", user.uid)
          await updateDoc(userProfileRef, {
            "stats.likes": increment(-1),
          })
        } catch (err) {
          console.error("Error updating user profile stats:", err)
        }

        return false // Returned value indicates if the item is now liked
      } else {
        // Like: Create the like document and increment the count
        await setDoc(likeRef, {
          userId: user.uid,
          targetId,
          targetType,
          createdAt: serverTimestamp(),
        })
        await updateDoc(targetRef, {
          likeCount: increment(1),
        })

        // Update user profile stats
        try {
          const userProfileRef = doc(db, "userProfiles", user.uid)
          await updateDoc(userProfileRef, {
            "stats.likes": increment(1),
          })
        } catch (err) {
          console.error("Error updating user profile stats:", err)
        }

        return true // Returned value indicates if the item is now liked
      }
    } catch (err) {
      console.error("Error toggling like:", err)
      setError("Failed to update like status")
      return null
    } finally {
      setLoading(false)
    }
  }

  // Check if user has liked an item
  const checkLikeStatus = async (targetId: string, targetType: "diary" | "video") => {
    if (!user) return false

    try {
      const likeId = `${user.uid}_${targetType}_${targetId}`
      const likeRef = doc(db, "likes", likeId)
      const likeDoc = await getDoc(likeRef)

      return likeDoc.exists()
    } catch (err) {
      console.error("Error checking like status:", err)
      return false
    }
  }

  // Add a comment
  const addComment = async (targetId: string, targetType: "diary" | "video", text: string) => {
    if (!user || !text.trim()) return null

    setLoading(true)
    setError(null)

    try {
      // Add the comment
      const commentData = {
        userId: user.uid,
        targetId,
        targetType,
        text: text.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      const commentRef = await addDoc(collection(db, "comments"), commentData)

      // Increment comment count on the target
      const targetRef = doc(db, targetType === "diary" ? "diaries" : "diaryVideos", targetId)
      await updateDoc(targetRef, {
        commentCount: increment(1),
      })

      return {
        id: commentRef.id,
        ...commentData,
      } as Comment
    } catch (err) {
      console.error("Error adding comment:", err)
      setError("Failed to add comment")
      return null
    } finally {
      setLoading(false)
    }
  }

  // Get comments for a target
  const getComments = async (targetId: string, targetType: "diary" | "video", commentLimit = 10) => {
    if (!user) return []

    setLoading(true)
    setError(null)

    try {
      const commentsQuery = query(
        collection(db, "comments"),
        where("targetId", "==", targetId),
        where("targetType", "==", targetType),
        orderBy("createdAt", "desc"),
        firestoreLimit(commentLimit),
      )

      const commentsSnapshot = await getDocs(commentsQuery)
      const comments: Comment[] = []

      commentsSnapshot.forEach((doc) => {
        comments.push({
          id: doc.id,
          ...doc.data(),
        } as Comment)
      })

      return comments
    } catch (err) {
      console.error("Error getting comments:", err)
      setError("Failed to load comments")
      return []
    } finally {
      setLoading(false)
    }
  }

  // Delete a comment
  const deleteComment = async (commentId: string, targetId: string, targetType: "diary" | "video") => {
    if (!user) return false

    setLoading(true)
    setError(null)

    try {
      // Get the comment to verify ownership
      const commentRef = doc(db, "comments", commentId)
      const commentDoc = await getDoc(commentRef)

      if (!commentDoc.exists()) {
        throw new Error("Comment not found")
      }

      const commentData = commentDoc.data()

      // Only allow the comment owner to delete
      if (commentData.userId !== user.uid) {
        throw new Error("Not authorized to delete this comment")
      }

      // Delete the comment
      await deleteDoc(commentRef)

      // Decrement comment count on the target
      const targetRef = doc(db, targetType === "diary" ? "diaries" : "diaryVideos", targetId)
      await updateDoc(targetRef, {
        commentCount: increment(-1),
      })

      return true
    } catch (err) {
      console.error("Error deleting comment:", err)
      setError("Failed to delete comment")
      return false
    } finally {
      setLoading(false)
    }
  }

  // Follow/Unfollow a user
  const toggleFollow = async (targetUserId: string) => {
    if (!user || targetUserId === user.uid) return false

    setLoading(true)
    setError(null)

    try {
      // Create a unique ID for the follow document
      const followId = `${user.uid}_${targetUserId}`
      const followRef = doc(db, "follows", followId)
      const followDoc = await getDoc(followRef)

      // Get user profiles
      const followerRef = doc(db, "userProfiles", user.uid)
      const followingRef = doc(db, "userProfiles", targetUserId)

      if (followDoc.exists()) {
        // Unfollow: Delete the follow document and update counts
        await deleteDoc(followRef)

        // Update follower count
        await updateDoc(followerRef, {
          "stats.following": increment(-1),
        })

        // Update following count
        await updateDoc(followingRef, {
          "stats.followers": increment(-1),
        })

        return false // Returned value indicates if the user is now followed
      } else {
        // Follow: Create the follow document and update counts
        await setDoc(followRef, {
          followerId: user.uid,
          followingId: targetUserId,
          createdAt: serverTimestamp(),
        })

        // Update follower count
        await updateDoc(followerRef, {
          "stats.following": increment(1),
        })

        // Update following count
        await updateDoc(followingRef, {
          "stats.followers": increment(1),
        })

        return true // Returned value indicates if the user is now followed
      }
    } catch (err) {
      console.error("Error toggling follow:", err)
      setError("Failed to update follow status")
      return null
    } finally {
      setLoading(false)
    }
  }

  // Check if user is following another user
  const checkFollowStatus = async (targetUserId: string) => {
    if (!user) return false

    try {
      const followId = `${user.uid}_${targetUserId}`
      const followRef = doc(db, "follows", followId)
      const followDoc = await getDoc(followRef)

      return followDoc.exists()
    } catch (err) {
      console.error("Error checking follow status:", err)
      return false
    }
  }

  // Record a share
  const recordShare = async (
    targetId: string,
    targetType: "diary" | "video",
    platform: "copy" | "twitter" | "facebook" | "whatsapp" | "email",
  ) => {
    if (!user) return false

    setLoading(true)
    setError(null)

    try {
      // Add the share record
      const shareData = {
        userId: user.uid,
        targetId,
        targetType,
        platform,
        createdAt: serverTimestamp(),
      }

      await addDoc(collection(db, "shares"), shareData)

      // Increment share count on the target
      const targetRef = doc(db, targetType === "diary" ? "diaries" : "diaryVideos", targetId)
      await updateDoc(targetRef, {
        shareCount: increment(1),
      })

      return true
    } catch (err) {
      console.error("Error recording share:", err)
      setError("Failed to record share")
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    toggleLike,
    checkLikeStatus,
    addComment,
    getComments,
    deleteComment,
    toggleFollow,
    checkFollowStatus,
    recordShare,
  }
}
