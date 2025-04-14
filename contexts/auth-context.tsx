"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  FacebookAuthProvider,
  updateProfile,
} from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, displayName: string, additionalInfo?: Record<string, any>) => Promise<void>
  logout: () => Promise<void>
  googleSignIn: () => Promise<void>
  facebookSignIn: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push("/home")
    } catch (error) {
      throw error
    }
  }

  const signup = async (email: string, password: string, displayName: string, additionalInfo?: Record<string, any>) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: displayName,
        })

        // Create user profile in Firestore
        const userProfileRef = doc(db, "userProfiles", userCredential.user.uid)
        await setDoc(userProfileRef, {
          uid: userCredential.user.uid,
          displayName: displayName,
          email: userCredential.user.email,
          photoURL: userCredential.user.photoURL || "",
          username: additionalInfo?.username || `user${userCredential.user.uid.substring(0, 5)}`,
          firstName: additionalInfo?.firstName || "",
          lastName: additionalInfo?.lastName || "",
          bio: "",
          phoneNumber: "",
          gender: "",
          birthday: "",
          website: "",
          education: {
            school: "",
            degree: "",
          },
          skills: [],
          isPrivate: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          stats: {
            posts: 0,
            followers: 0,
            following: 0,
            likes: 0,
          },
        })
      }
      router.push("/home")
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      throw error
    }
  }

  const googleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)

      // Create or update user profile in Firestore
      if (result.user) {
        const userProfileRef = doc(db, "userProfiles", result.user.uid)

        // Extract first and last name from display name
        const nameParts = result.user.displayName?.split(" ") || ["", ""]
        const firstName = nameParts[0] || ""
        const lastName = nameParts.slice(1).join(" ") || ""

        await setDoc(
          userProfileRef,
          {
            uid: result.user.uid,
            displayName: result.user.displayName,
            email: result.user.email,
            photoURL: result.user.photoURL,
            username: `user${result.user.uid.substring(0, 5)}`,
            firstName,
            lastName,
            bio: "",
            phoneNumber: "",
            gender: "",
            birthday: "",
            website: "",
            education: {
              school: "",
              degree: "",
            },
            skills: [],
            isPrivate: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            stats: {
              posts: 0,
              followers: 0,
              following: 0,
              likes: 0,
            },
          },
          { merge: true },
        )
      }

      router.push("/home")
    } catch (error) {
      throw error
    }
  }

  const facebookSignIn = async () => {
    try {
      const provider = new FacebookAuthProvider()
      const result = await signInWithPopup(auth, provider)

      // Create or update user profile in Firestore
      if (result.user) {
        const userProfileRef = doc(db, "userProfiles", result.user.uid)

        // Extract first and last name from display name
        const nameParts = result.user.displayName?.split(" ") || ["", ""]
        const firstName = nameParts[0] || ""
        const lastName = nameParts.slice(1).join(" ") || ""

        await setDoc(
          userProfileRef,
          {
            uid: result.user.uid,
            displayName: result.user.displayName,
            email: result.user.email,
            photoURL: result.user.photoURL,
            username: `user${result.user.uid.substring(0, 5)}`,
            firstName,
            lastName,
            bio: "",
            phoneNumber: "",
            gender: "",
            birthday: "",
            website: "",
            education: {
              school: "",
              degree: "",
            },
            skills: [],
            isPrivate: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            stats: {
              posts: 0,
              followers: 0,
              following: 0,
              likes: 0,
            },
          },
          { merge: true },
        )
      }

      router.push("/home")
    } catch (error) {
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, googleSignIn, facebookSignIn }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
