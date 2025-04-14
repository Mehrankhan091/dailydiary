import type { Timestamp } from "firebase/firestore"

export interface Like {
  id: string
  userId: string
  targetId: string // Can be diaryId or videoId
  targetType: "diary" | "video"
  createdAt: Timestamp | string
}

export interface Comment {
  id: string
  userId: string
  targetId: string // Can be diaryId or videoId
  targetType: "diary" | "video"
  text: string
  createdAt: Timestamp | string
  updatedAt: Timestamp | string
}

export interface Follow {
  id: string
  followerId: string // User who is following
  followingId: string // User being followed
  createdAt: Timestamp | string
}

export interface Share {
  id: string
  userId: string
  targetId: string
  targetType: "diary" | "video"
  platform: "copy" | "twitter" | "facebook" | "whatsapp" | "email"
  createdAt: Timestamp | string
}

export interface FeedItem {
  id: string
  type: "diary" | "video"
  userId: string
  userDisplayName: string
  username: string
  userPhotoURL: string
  title: string
  description?: string
  thumbnailURL?: string
  videoURL?: string
  isPrivate: boolean
  likeCount: number
  commentCount: number
  shareCount: number
  createdAt: Timestamp | string
  userIsFollowing?: boolean
  userHasLiked?: boolean
}

export interface SearchResult {
  id: string
  type: "user" | "diary" | "video"
  title: string
  description?: string
  thumbnailURL?: string
  userId?: string
  userDisplayName?: string
  username?: string
  userPhotoURL?: string
  likeCount?: number
  commentCount?: number
  createdAt: Timestamp | string
}
