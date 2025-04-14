"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ImageIcon, Loader2 } from "lucide-react"
import { useDiaries } from "@/hooks/use-diaries"

interface CreateDiaryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (diaryId: string) => void
}

export function CreateDiaryModal({ isOpen, onClose, onSuccess }: CreateDiaryModalProps) {
  const { createDiary } = useDiaries()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle("")
      setDescription("")
      setIsPrivate(false)
      setCoverImage(null)
      setCoverPreview(null)
      setIsSubmitting(false) // Reset submission state
    }
  }, [isOpen])

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0]
      if (file) {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          console.error("Selected file is not an image")
          return
        }

        setCoverImage(file)

        // Create and revoke previous URL if it exists
        if (coverPreview && coverPreview.startsWith("blob:")) {
          URL.revokeObjectURL(coverPreview)
        }

        const objectUrl = URL.createObjectURL(file)
        setCoverPreview(objectUrl)
      }
    } catch (error) {
      console.error("Error handling image selection:", error)
    }
  }

  const handleSelectCoverImage = () => {
    fileInputRef.current?.click()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) return

    setIsSubmitting(true)

    try {
      const diary = await createDiary(title, description, coverImage, isPrivate)

      if (diary) {
        onSuccess?.(diary.id)
        // Reset form
        setTitle("")
        setDescription("")
        setIsPrivate(false)
        setCoverImage(null)
        setCoverPreview(null)
        onClose()
      } else {
        // If diary creation returns null, show an error
        console.error("Failed to create diary")
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error("Error creating diary:", error)
      setIsSubmitting(false)
    }
  }

  // Handle close with cleanup
  const handleClose = () => {
    if (isSubmitting) return // Prevent closing while submitting

    // Clean up any blob URLs
    if (coverPreview && coverPreview.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreview)
    }

    onClose()
  }

  useEffect(() => {
    // Cleanup function to revoke object URLs when component unmounts
    return () => {
      if (coverPreview && coverPreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview)
      }
    }
  }, [coverPreview])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px] max-w-[90vw] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-blue-500">Create New Diary</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cover-image">Cover Image (Optional)</Label>
            <div
              className="h-40 bg-gray-100 rounded-md flex items-center justify-center cursor-pointer overflow-hidden relative"
              onClick={handleSelectCoverImage}
            >
              {coverPreview ? (
                <div className="w-full h-full">
                  <img
                    src={coverPreview || "/placeholder.svg"}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error("Error loading image preview")
                      setCoverPreview(null)
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center text-gray-500">
                  <ImageIcon className="h-8 w-8 mb-2" />
                  <span>Click to add cover image</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                id="cover-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverImageChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={30}
              required
              className="focus-visible:ring-blue-500"
            />
            <div className="text-xs text-right text-gray-500">{title.length}/30</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={150}
              className="resize-none focus-visible:ring-blue-500"
              rows={3}
            />
            <div className="text-xs text-right text-gray-500">{description.length}/150</div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="private">Private Diary</Label>
            <Switch id="private" checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isSubmitting} className="bg-blue-500 hover:bg-blue-600">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Diary"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
