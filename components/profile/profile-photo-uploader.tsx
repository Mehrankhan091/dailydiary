"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import { Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUserProfile } from "@/hooks/use-user-profile"

export function ProfilePhotoUploader() {
  const { profile, uploadProfileImage } = useUserProfile()
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!profile) return null

  // Get initials from display name
  const getInitials = () => {
    if (!profile.displayName) return "U"
    return profile.displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 1)
  }

  const handleProfileImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      await uploadProfileImage(file, "profile")
    } catch (error) {
      console.error("Error uploading profile image:", error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="p-6 border-b">
      <h2 className="text-lg font-semibold mb-6">Profile Photo</h2>

      <div className="flex items-center">
        <div className="relative cursor-pointer group" onClick={handleProfileImageClick}>
          {profile.photoURL ? (
            <div className="h-24 w-24 rounded-full overflow-hidden">
              <Image
                src={profile.photoURL || "/placeholder.svg"}
                alt={profile.displayName || "Profile"}
                width={96}
                height={96}
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>
          ) : (
            <div className="h-24 w-24 flex items-center justify-center rounded-full bg-orange-500 text-white text-4xl font-medium group-hover:bg-orange-600 transition-colors">
              {getInitials()}
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            disabled={isUploading}
          />
        </div>

        <div className="ml-6">
          <h3 className="font-medium mb-1">Profile Photo</h3>
          <p className="text-sm text-gray-500 mb-3">Click on the avatar to upload a custom photo</p>
          <Button variant="outline" size="sm" onClick={handleProfileImageClick} disabled={isUploading}>
            {isUploading ? "Uploading..." : "Change Photo"}
          </Button>
        </div>
      </div>
    </div>
  )
}
