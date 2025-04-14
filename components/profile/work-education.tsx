"use client"

import type React from "react"

import { useState } from "react"
import { useUserProfile } from "@/hooks/use-user-profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Pencil, Check, X, Plus, GraduationCap, Briefcase } from "lucide-react"
import type { UserProfile } from "@/models/user-profile"

export function WorkEducation() {
  const { profile, updateUserProfile } = useUserProfile()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    education: profile?.education,
    skills: [...(profile?.skills || [])],
  })
  const [newSkill, setNewSkill] = useState("")

  if (!profile) return null

  const handleEditToggle = () => {
    if (isEditing) {
      // Save changes
      updateUserProfile(formData)
      setFormData({
        education: profile.education,
        skills: [...(profile.skills || [])],
      })
    }
    setIsEditing(!isEditing)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    if (name.startsWith("education.")) {
      const field = name.split(".")[1]
      setFormData((prev) => ({
        ...prev,
        education: {
          ...prev.education,
          [field]: value,
        },
      }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleAddSkill = () => {
    if (!newSkill.trim()) return

    const updatedSkills = [...(formData.skills || []), newSkill.trim()]
    setFormData((prev) => ({ ...prev, skills: updatedSkills }))
    setNewSkill("")
  }

  const handleRemoveSkill = (index: number) => {
    const updatedSkills = [...(formData.skills || [])]
    updatedSkills.splice(index, 1)
    setFormData((prev) => ({ ...prev, skills: updatedSkills }))
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Work & Education</h2>
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

      <div className="space-y-8">
        {/* Education */}
        <div>
          <div className="flex items-center mb-4">
            <GraduationCap className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-md font-medium">Education</h3>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">School/University</label>
                <Input
                  name="education.school"
                  defaultValue={profile.education?.school || ""}
                  placeholder="School/University"
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Degree/Field of Study</label>
                <Input
                  name="education.degree"
                  defaultValue={profile.education?.degree || ""}
                  placeholder="Degree/Field of Study"
                  onChange={handleInputChange}
                />
              </div>
            </div>
          ) : (
            <div>
              {profile.education?.school ? (
                <div>
                  <p className="font-medium">{profile.education.school}</p>
                  {profile.education.degree && <p className="text-sm text-gray-600">{profile.education.degree}</p>}
                </div>
              ) : (
                <p className="text-gray-500">No education information provided</p>
              )}
            </div>
          )}
        </div>

        {/* Skills */}
        <div>
          <div className="flex items-center mb-4">
            <Briefcase className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-md font-medium">Skills & Interests</h3>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  placeholder="Add a skill or interest"
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddSkill()
                    }
                  }}
                />
                <Button type="button" size="icon" onClick={handleAddSkill} className="bg-rose-500 hover:bg-rose-600">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.skills?.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">
                    {skill}
                    <button
                      type="button"
                      className="ml-2 text-gray-500 hover:text-gray-700"
                      onClick={() => handleRemoveSkill(index)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.skills && profile.skills.length > 0 ? (
                profile.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="bg-rose-100 text-rose-800 hover:bg-rose-200">
                    #{skill}
                  </Badge>
                ))
              ) : (
                <p className="text-gray-500">No skills or interests added</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
