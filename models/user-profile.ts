export interface UserProfile {
  uid: string
  displayName: string
  username: string
  firstName: string
  lastName: string
  email: string
  bio: string
  photoURL: string
  coverPhotoURL: string
  phoneNumber: string
  gender: string
  birthday: string
  website: string
  education: {
    school: string
    degree: string
  }
  skills: string[]
  isPrivate: boolean
  createdAt: any
  updatedAt: any
  stats: {
    posts: number
    followers: number
    following: number
    likes: number
  }
}

export const defaultUserProfile: Partial<UserProfile> = {
  bio: "",
  photoURL: "",
  coverPhotoURL: "",
  phoneNumber: "",
  gender: "",
  birthday: "",
  website: "",
  firstName: "",
  lastName: "",
  education: {
    school: "",
    degree: "",
  },
  skills: [],
  isPrivate: false,
  stats: {
    posts: 0,
    followers: 0,
    following: 0,
    likes: 0,
  },
}
