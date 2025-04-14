"use client"

import { useState } from "react"
import { useUserProfile } from "@/hooks/use-user-profile"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Pencil, Check, Shield, Users, LogOut } from "lucide-react"
import type { UserProfile } from "@/models/user-profile"
import { useAuth } from "@/contexts/auth-context"

export function PrivacySettings() {
  const { profile, updateUserProfile } = useUserProfile()
  const { logout } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    isPrivate: profile?.isPrivate,
  })

  if (!profile) return null

  const handleEditToggle = () => {
    if (isEditing) {
      // Save changes
      updateUserProfile(formData)
      setFormData({
        isPrivate: profile.isPrivate,
      })
    }
    setIsEditing(!isEditing)
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isPrivate: checked }))
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Privacy & Account</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEditToggle}
          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
        >
          {isEditing ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Save
            </>
          ) : (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </>
          )}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Private Account Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-gray-500 mr-3" />
            <div>
              <span className="font-medium">Private Account</span>
              <p className="text-sm text-gray-500 mt-1">
                When your account is private, only people you approve can see your content
              </p>
            </div>
          </div>
          <Switch checked={formData.isPrivate || false} onCheckedChange={handleSwitchChange} disabled={!isEditing} />
        </div>

        {/* Blocked Users */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-gray-500 mr-3" />
            <div>
              <span className="font-medium">Blocked Users</span>
              <p className="text-sm text-gray-500 mt-1">Manage the list of users you've blocked</p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled={!isEditing}>
            Manage
          </Button>
        </div>

        {/* Logout */}
        <div className="pt-6 border-t">
          <Button variant="destructive" className="w-full" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
        </div>
      </div>
    </div>
  )
}
