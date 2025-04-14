"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useUserProfile } from "@/hooks/use-user-profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Mail, Phone, Globe, Pencil, Check, User, Loader2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { UserProfile } from "@/models/user-profile"

export function PersonalInfo() {
  const { profile, updateUserProfile, checkUsernameAvailability, usernameError, isCheckingUsername, error } =
    useUserProfile()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfile>>({})
  const [date, setDate] = useState<Date | undefined>(profile?.birthday ? new Date(profile.birthday) : undefined)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || "",
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        displayName: profile.displayName || "",
        bio: profile.bio || "",
        phoneNumber: profile.phoneNumber || "",
        gender: profile.gender || "",
        website: profile.website || "",
      })
    }
  }, [profile])

  if (!profile) return null

  const handleEditToggle = async () => {
    if (isEditing) {
      // Validate form before saving
      const errors: Record<string, string> = {}

      if (!formData.username) {
        errors.username = "Username is required"
      }

      if (!formData.firstName) {
        errors.firstName = "First name is required"
      }

      if (!formData.lastName) {
        errors.lastName = "Last name is required"
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors)
        return
      }

      // Save changes
      setIsSubmitting(true)
      const updates = {
        ...formData,
        // Set display name to first + last name
        displayName: `${formData.firstName} ${formData.lastName}`,
      }

      if (date) {
        updates.birthday = date.toISOString()
      }

      const success = await updateUserProfile(updates)
      setIsSubmitting(false)

      if (success) {
        setIsEditing(false)
        setValidationErrors({})
      }
    } else {
      setIsEditing(true)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear validation error when user types
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleUsernameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    setFormData((prev) => ({ ...prev, username: value }))

    // Clear validation error
    if (validationErrors.username) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.username
        return newErrors
      })
    }

    // Check availability if username is valid
    if (value && value.length >= 3 && value !== profile.username) {
      await checkUsernameAvailability(value)
    }
  }

  const handleSelectChange = (value: string, name: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="p-6 border-b">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Personal Information</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEditToggle}
          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
          disabled={isSubmitting}
        >
          {isEditing ? (
            isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save
              </>
            )
          ) : (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Username */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Username <span className="text-rose-500">*</span>
          </label>
          {isEditing ? (
            <div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">@</span>
                <Input
                  name="username"
                  value={formData.username || ""}
                  placeholder="username"
                  onChange={handleUsernameChange}
                  className={`pl-8 ${validationErrors.username || usernameError ? "border-rose-500" : ""}`}
                  disabled={isCheckingUsername}
                />
                {isCheckingUsername && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
              {(validationErrors.username || usernameError) && (
                <p className="text-sm text-rose-500 mt-1">{validationErrors.username || usernameError}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Your unique username. Only letters, numbers, and underscores allowed.
              </p>
            </div>
          ) : (
            <div className="flex items-center">
              <span className="text-gray-400 mr-1">@</span>
              <span>{profile.username || `user${profile.uid.substring(0, 8)}`}</span>
            </div>
          )}
        </div>

        {/* First Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            First Name <span className="text-rose-500">*</span>
          </label>
          {isEditing ? (
            <div>
              <Input
                name="firstName"
                value={formData.firstName || ""}
                placeholder="Your first name"
                onChange={handleInputChange}
                className={validationErrors.firstName ? "border-rose-500" : ""}
              />
              {validationErrors.firstName && <p className="text-sm text-rose-500 mt-1">{validationErrors.firstName}</p>}
            </div>
          ) : (
            <div className="flex items-center">
              <User className="h-5 w-5 text-gray-400 mr-3" />
              <span>{profile.firstName || "Not provided"}</span>
            </div>
          )}
        </div>

        {/* Last Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Last Name <span className="text-rose-500">*</span>
          </label>
          {isEditing ? (
            <div>
              <Input
                name="lastName"
                value={formData.lastName || ""}
                placeholder="Your last name"
                onChange={handleInputChange}
                className={validationErrors.lastName ? "border-rose-500" : ""}
              />
              {validationErrors.lastName && <p className="text-sm text-rose-500 mt-1">{validationErrors.lastName}</p>}
            </div>
          ) : (
            <div className="flex items-center">
              <User className="h-5 w-5 text-gray-400 mr-3" />
              <span>{profile.lastName || "Not provided"}</span>
            </div>
          )}
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Bio</label>
          {isEditing ? (
            <Textarea
              name="bio"
              value={formData.bio || ""}
              placeholder="Write something about yourself..."
              onChange={handleInputChange}
              className="resize-none"
              rows={3}
              maxLength={160}
            />
          ) : (
            <p className="text-gray-700">{profile.bio || "No bio yet."}</p>
          )}
          {isEditing && <div className="text-xs text-right text-gray-500">{formData.bio?.length || 0}/160</div>}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Email <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center">
            <Mail className="h-5 w-5 text-gray-400 mr-3" />
            <span>{profile.email}</span>
          </div>
          <p className="text-xs text-gray-500">Email cannot be changed</p>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Phone</label>
          {isEditing ? (
            <Input
              name="phoneNumber"
              value={formData.phoneNumber || ""}
              placeholder="Your phone number"
              onChange={handleInputChange}
            />
          ) : (
            <div className="flex items-center">
              <Phone className="h-5 w-5 text-gray-400 mr-3" />
              <span>{profile.phoneNumber || "Not provided"}</span>
            </div>
          )}
        </div>

        {/* Gender */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Gender</label>
          {isEditing ? (
            <Select value={formData.gender || ""} onValueChange={(value) => handleSelectChange(value, "gender")}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="non-binary">Non-binary</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center">
              <div className="h-5 w-5 text-gray-400 mr-3">⚥</div>
              <span>
                {profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : "Not provided"}
              </span>
            </div>
          )}
        </div>

        {/* Birthday */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Birthday</label>
          {isEditing ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
              </PopoverContent>
            </Popover>
          ) : (
            <div className="flex items-center">
              <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
              <span>{profile.birthday ? format(new Date(profile.birthday), "PPP") : "Not provided"}</span>
            </div>
          )}
        </div>

        {/* Website */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Website</label>
          {isEditing ? (
            <Input
              name="website"
              value={formData.website || ""}
              placeholder="Your website URL"
              onChange={handleInputChange}
            />
          ) : (
            <div className="flex items-center">
              <Globe className="h-5 w-5 text-gray-400 mr-3" />
              <span>
                {profile.website ? (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-rose-500 hover:underline"
                  >
                    {profile.website}
                  </a>
                ) : (
                  "Not provided"
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
