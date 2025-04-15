"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, MessageCircle, Share2, MoreHorizontal, UserPlus, UserCheck, Lock } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { VideoPlayer } from "@/components/video/video-player"
import { useSocialInteractions } from "@/hooks/use-social-interactions"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import type { FeedItem as FeedItemType } from "@/models/social"
import { ShareModal } from "@/components/feed/share-modal"
import { CommentsModal } from "@/components/feed/comments-modal"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

interface FeedItemProps {
  item: FeedItemType
  onUpdate?: (updatedItem: FeedItemType) => void
}

export function FeedItem({ item, onUpdate }: FeedItemProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { toggleLike, toggleFollow, checkLikeStatus, checkFollowStatus } = useSocialInteractions()
  const [isLiked, setIsLiked] = useState(item.userHasLiked || false)
  const [likeCount, setLikeCount] = useState(item.likeCount || 0)
  const [following, setFollowing] = useState(item.userIsFollowing || false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Check initial like and follow status
  useEffect(() => {
    const checkInitialStatus = async () => {
      if (user && item.id) {
        try {
          const isLiked = await checkLikeStatus(item.id, item.type)
          setIsLiked(isLiked)
        } catch (error) {
          console.error("Error checking initial like status:", error)
        }
      }
    }

    checkInitialStatus()
  }, [user, item.id, item.type, checkLikeStatus])

  // Handle like button click
  const handleLike = async () => {
    if (isLoading) return

    setIsLoading(true)
    // Optimistically update the UI
    const newLikeStatus = !isLiked
    setIsLiked(newLikeStatus)
    setLikeCount((prev) => (newLikeStatus ? prev + 1 : prev - 1))

    try {
      const result = await toggleLike(item.id, item.type)

      if (result === null) {
        // Rollback if the request fails
        setIsLiked(!newLikeStatus)
        setLikeCount((prev) => (newLikeStatus ? prev - 1 : prev + 1))
        console.error("Error updating like:")
      }
    } catch (error) {
      // Rollback if the request fails
      setIsLiked(!newLikeStatus)
      setLikeCount((prev) => (newLikeStatus ? prev - 1 : prev + 1))
      console.error("Error toggling like:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Check initial follow status
  useEffect(() => {
    const checkInitialFollowStatus = async () => {
      if (user && item.userId && item.userId !== user.uid) {
        try {
          const isFollowing = await checkFollowStatus(item.userId)
          setFollowing(isFollowing)
        } catch (error) {
          console.error("Error checking initial follow status:", error)
        }
      }
    }

    checkInitialFollowStatus()
  }, [user, item.userId, checkFollowStatus])

  // Handle follow button click
  const handleFollow = async () => {
    if (isLoading || !item.userId) return

    setIsLoading(true)
    try {
      const result = await toggleFollow(item.userId)

      if (result !== null) {
        setFollowing(result)

        if (onUpdate) {
          onUpdate({
            ...item,
            userIsFollowing: result,
          })
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Format the creation date
  const formatDate = (dateString: string | any) => {
    try {
      const date = typeof dateString === "string" ? new Date(dateString) : dateString?.toDate?.() || new Date()
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (err) {
      return "some time ago"
    }
  }

  // Navigate to diary or video page
  const navigateToItem = () => {
    try {
      if (item.type === "diary") {
        router.push(`/my-diaries/${item.id}`)
      } else if (item.type === "video" && item.videoURL) {
        // Open video player modal or navigate to video page
      }
    } catch (error) {
      console.error("Navigation error:", error)
    }
  }

  // Navigate to user profile
  const navigateToProfile = (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (item.userId === user?.uid) {
        router.push("/profile")
      } else if (item.userId) {
        // In a real app, you'd navigate to the other user's profile
        router.push("/profile")
      }
    } catch (error) {
      console.error("Profile navigation error:", error)
    }
  }

  // Get initials from display name
  const getInitials = () => {
    if (!item.userDisplayName) return "U"
    return item.userDisplayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <Card className="mb-4 overflow-hidden">
      <CardContent className="p-0">
        {/* Header with user info */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10 cursor-pointer" onClick={navigateToProfile}>
              <AvatarImage src={item.userPhotoURL || ""} alt={item.userDisplayName} />
              <AvatarFallback className="bg-blue-500 text-white">{getInitials()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center cursor-pointer" onClick={navigateToProfile}>
                <span className="font-medium">{item.userDisplayName || "Unknown User"}</span>
                <span className="text-gray-500 ml-1">@{item.username || "user"}</span>
              </div>
              <div className="text-xs text-gray-500">{formatDate(item.createdAt)}</div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {item.isPrivate && (
              <div className="text-gray-500 flex items-center">
                <Lock className="h-4 w-4 mr-1" />
                <span className="text-xs">Private</span>
              </div>
            )}

            {user && item.userId && item.userId !== user.uid && (
              <>
                {!following ? (
                  <Button variant="outline" size="sm" onClick={handleFollow} className="text-xs" disabled={isLoading}>
                    <UserPlus className="h-4 w-4 mr-1" />
                    Follow
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleFollow} className="text-xs" disabled={isLoading}>
                    <UserCheck className="h-4 w-4 mr-1" />
                    Following
                  </Button>
                )}
              </>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsShareModalOpen(true)}>Share</DropdownMenuItem>
                <DropdownMenuItem onClick={navigateToItem}>View Details</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <div onClick={navigateToItem} className="cursor-pointer">
          {item.type === "diary" && (
            <div className="relative aspect-video bg-gray-100">
              {item.thumbnailURL ? (
                <img
                  src={item.thumbnailURL || "/placeholder.svg"}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-blue-400 to-blue-600" />
              )}
            </div>
          )}

          {item.type === "video" && item.videoURL && (
            <VideoPlayer src={item.videoURL} poster={item.thumbnailURL} className="aspect-video" />
          )}

          <div className="p-4">
            <h3 className="text-lg font-semibold mb-1">{item.title || "Untitled"}</h3>
            {item.description && <p className="text-gray-600 text-sm line-clamp-2">{item.description}</p>}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-2 border-t flex justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={cn("flex items-center", isLiked ? "text-blue-500" : "")}
          disabled={isLoading}
        >
          <Heart className={cn("h-5 w-5 mr-1", isLiked ? "fill-current" : "")} />
          <span>{likeCount}</span>
        </Button>

        <Button variant="ghost" size="sm" onClick={() => setIsCommentsModalOpen(true)} className="flex items-center">
          <MessageCircle className="h-5 w-5 mr-1" />
          <span>{item.commentCount || 0}</span>
        </Button>

        <Button variant="ghost" size="sm" onClick={() => setIsShareModalOpen(true)} className="flex items-center">
          <Share2 className="h-5 w-5 mr-1" />
          <span>{item.shareCount || 0}</span>
        </Button>
      </CardFooter>

      {/* Modals */}
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} item={item} />

      <CommentsModal
        isOpen={isCommentsModalOpen}
        onClose={() => setIsCommentsModalOpen(false)}
        targetId={item.id}
        targetType={item.type}
      />
    </Card>
  )
}
