"use client"

import { useState, useEffect } from "react"
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { type UserProfile, defaultUserProfile } from "@/models/user-profile"
import { updateProfile } from "firebase/auth"

export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Partial<UserProfile> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useFirestore, setUseFirestore] = useState(true)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)

  // Create a memory-only profile from auth user
  const createMemoryProfile = () => {
    if (!user) return null

    return {
      ...defaultUserProfile,
      uid: user.uid,
      displayName: user.displayName || "",
      username: `user${user.uid.substring(0, 5)}`,
      email: user.email || "",
      photoURL: user.photoURL || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  useEffect(() => {
    async function fetchUserProfile() {
      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      // Create memory profile as fallback
      const memoryProfile = createMemoryProfile()

      // If we've already determined Firestore isn't available, use memory profile
      if (!useFirestore) {
        setProfile(memoryProfile)
        setLoading(false)
        return
      }

      try {
        const userDocRef = doc(db, "userProfiles", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile)
        } else {
          // Create a new profile if it doesn't exist
          const newProfile = {
            ...defaultUserProfile,
            uid: user.uid,
            displayName: user.displayName || "",
            username: `user${user.uid.substring(0, 5)}`,
            firstName: "",
            lastName: "",
            email: user.email || "",
            photoURL: user.photoURL || "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }

          try {
            await setDoc(userDocRef, newProfile)
            setProfile(newProfile)
          } catch (writeError) {
            console.error("Error creating user profile:", writeError)
            // Fall back to memory profile
            setUseFirestore(false)
            setProfile(memoryProfile)
            setError("Permission error - using local profile")
          }
        }
      } catch (err) {
        console.error("Error fetching user profile:", err)
        setError("Permission error - using local profile")

        // Disable Firestore for future operations
        setUseFirestore(false)

        // Use memory profile
        setProfile(memoryProfile)
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [user, useFirestore])

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return false

    // Validate required fields
    if (updates.username !== undefined && !updates.username) {
      setUsernameError("Username is required")
      return false
    }

    if (updates.firstName !== undefined && !updates.firstName) {
      setError("First name is required")
      return false
    }

    if (updates.lastName !== undefined && !updates.lastName) {
      setError("Last name is required")
      return false
    }

    // Check username uniqueness if it's being updated
    if (updates.username && updates.username !== profile.username) {
      try {
        const isAvailable = await checkUsernameAvailability(updates.username)
        if (!isAvailable) {
          setUsernameError("This username is already taken")
          return false
        }
      } catch (err) {
        console.error("Error checking username availability:", err)
        // If we can't check, we'll assume it's available since the user is authenticated
      }
    }

    try {
      // Update local state first for immediate UI feedback
      const updatedProfile = { ...profile, ...updates, updatedAt: new Date().toISOString() }
      setProfile(updatedProfile)

      // If we're using Firestore, try to update there too
      if (useFirestore) {
        try {
          const userDocRef = doc(db, "userProfiles", user.uid)
          await updateDoc(userDocRef, {
            ...updates,
            updatedAt: serverTimestamp(),
          })
        } catch (firestoreError) {
          console.error("Error updating profile in Firestore:", firestoreError)
          // Disable Firestore for future operations
          setUseFirestore(false)
          setError("Permission error - using local profile")
        }
      }

      // Update auth profile if display name or photo URL changes
      if (updates.displayName || updates.photoURL) {
        try {
          await updateProfile(user, {
            displayName: updates.displayName || user.displayName,
            photoURL: updates.photoURL || user.photoURL,
          })
        } catch (authError) {
          console.error("Error updating auth profile:", authError)
        }
      }

      return true
    } catch (err) {
      console.error("Error updating profile:", err)
      setError("Failed to update profile")
      return false
    }
  }

  const uploadProfileImage = async (file: File, type: "profile" | "cover") => {
    if (!user) return null

    try {
      // Create a local object URL for immediate preview
      const localUrl = URL.createObjectURL(file)

      // Update local state first for immediate UI feedback
      if (type === "profile") {
        setProfile((prev) => (prev ? { ...prev, photoURL: localUrl } : null))
      } else {
        setProfile((prev) => (prev ? { ...prev, coverPhotoURL: localUrl } : null))
      }

      // Try to upload to Firebase Storage
      try {
        const storageRef = ref(storage, `users/${user.uid}/${type}_${Date.now()}`)
        await uploadBytes(storageRef, file)
        const downloadURL = await getDownloadURL(storageRef)

        // Update the profile with the real URL
        if (type === "profile") {
          await updateUserProfile({ photoURL: downloadURL })

          // Also update auth profile
          try {
            await updateProfile(user, { photoURL: downloadURL })
          } catch (authError) {
            console.error("Error updating auth profile photo:", authError)
          }
        } else {
          await updateUserProfile({ coverPhotoURL: downloadURL })
        }

        return downloadURL
      } catch (storageError) {
        console.error("Error uploading to Firebase Storage:", storageError)
        // Keep using the local URL even if Firebase Storage fails
        return localUrl
      }
    } catch (err) {
      console.error("Error in image upload process:", err)
      setError("Failed to upload image")
      return null
    }
  }

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (!username || username.length < 3) {
      setUsernameError("Username must be at least 3 characters")
      return false
    }

    // Check if username contains only allowed characters
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameError("Username can only contain letters, numbers, and underscores")
      return false
    }

    setIsCheckingUsername(true)
    setUsernameError(null)

    try {
      if (useFirestore) {
        // Check if username exists in Firestore
        const usersRef = collection(db, "userProfiles")
        const q = query(usersRef, where("username", "==", username))
        const querySnapshot = await getDocs(q)

        // If we found any documents with this username that aren't the current user
        const isAvailable = querySnapshot.empty || (querySnapshot.size === 1 && querySnapshot.docs[0].id === user?.uid)

        if (!isAvailable) {
          setUsernameError("This username is already taken")
        }

        setIsCheckingUsername(false)
        return isAvailable
      }

      // For local storage mode, just return true
      setIsCheckingUsername(false)
      return true
    } catch (err) {
      console.error("Error checking username:", err)
      setUsernameError("Error checking username availability")
      setIsCheckingUsername(false)

      // If the user is already authenticated, we'll assume the username is available
      // since they'll be able to update it later
      return user != null
    }
  }

  return {
    profile,
    loading,
    error,
    usernameError,
    isCheckingUsername,
    updateUserProfile,
    uploadProfileImage,
    checkUsernameAvailability,
    isUsingFirestore: useFirestore,
  }
}
