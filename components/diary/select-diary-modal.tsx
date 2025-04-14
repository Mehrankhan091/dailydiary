"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useDiaries } from "@/hooks/use-diaries"
import { PlusCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface SelectDiaryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (diaryId: string) => void
  onCreateNew: () => void
}

export function SelectDiaryModal({ isOpen, onClose, onSelect, onCreateNew }: SelectDiaryModalProps) {
  const { diaries, loading } = useDiaries()
  const [selectedDiaryId, setSelectedDiaryId] = useState<string>("")

  const handleSelect = () => {
    if (selectedDiaryId) {
      onSelect(selectedDiaryId)
      onClose()
    }
  }

  // Generate random background color for diaries without cover photos
  const getRandomColor = (id: string) => {
    // Use the diary ID to generate a consistent color for each diary
    const hash = id.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)

    const colors = [
      "from-blue-400 to-blue-600",
      "from-purple-400 to-purple-600",
      "from-green-400 to-green-600",
      "from-yellow-400 to-yellow-600",
      "from-pink-400 to-pink-600",
      "from-indigo-400 to-indigo-600",
      "from-red-400 to-red-600",
      "from-teal-400 to-teal-600",
    ]

    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select a Diary</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-16 w-16 rounded-md" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : diaries.length > 0 ? (
          <RadioGroup value={selectedDiaryId} onValueChange={setSelectedDiaryId} className="space-y-4 py-4">
            {diaries.map((diary) => (
              <div key={diary.id} className="flex items-start space-x-3">
                <RadioGroupItem value={diary.id} id={diary.id} className="mt-1" />
                <div className="flex flex-1 items-center space-x-3">
                  <div className="h-16 w-16 rounded-md overflow-hidden">
                    {diary.coverImageURL ? (
                      <img
                        src={diary.coverImageURL || "/placeholder.svg"}
                        alt={diary.title}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg"
                        }}
                      />
                    ) : (
                      <div className={`h-full w-full bg-gradient-to-r ${getRandomColor(diary.id)}`} />
                    )}
                  </div>
                  <Label htmlFor={diary.id} className="flex-1 cursor-pointer">
                    <div className="font-medium">{diary.title}</div>
                    <div className="text-sm text-gray-500">
                      {diary.videoCount} {diary.videoCount === 1 ? "video" : "videos"}
                    </div>
                  </Label>
                </div>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <div className="py-6 text-center">
            <p className="text-gray-500 mb-4">You don't have any diaries yet.</p>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onCreateNew} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Diary
          </Button>
          <Button
            type="button"
            onClick={handleSelect}
            disabled={!selectedDiaryId}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600"
          >
            Select Diary
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
