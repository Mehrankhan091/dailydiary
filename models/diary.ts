export interface Diary {
  id: string
  userId: string
  title: string
  description: string
  coverImageURL: string
  isPrivate: boolean
  videoCount: number
  isDeleted?: boolean // Add soft delete flag
  createdAt: any
  updatedAt: any
}

export interface DiaryVideo {
  id: string
  diaryId: string
  userId: string
  videoURL: string
  thumbnailURL: string
  duration: number
  orderIndex: number
  createdAt: any
}
