"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MoreVertical, Lock, Trash2, Edit, Plus, Info, Loader2, RefreshCw, Undo } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CreateDiaryModal } from "@/components/diary/create-diary-modal"
import { useDiaries } from "@/hooks/use-diaries"
import { toast } from "@/hooks/use-toast"
import type { Diary } from "@/models/diary"

export function DiaryGrid() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    diaries,
    loading,
    error,
    deleteDiary,
    isUsingFirestore,
    refreshDiaries,
    lastDeletedDiary,
    recoverLastDeletedDiary,
    isDeleting,
  } = useDiaries()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [diaryToDelete, setDiaryToDelete] = useState<Diary | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pendingDeletions, setPendingDeletions] = useState<Set<string>>(new Set())
  const [showUndoToast, setShowUndoToast] = useState(false)
  const [deletionStates, setDeletionStates] = useState<Record<string, boolean>>({})

  // Check for create=true in URL
  useEffect(() => {
    const shouldCreateDiary = searchParams.get("create") === "true"
    if (shouldCreateDiary) {
      setIsCreateModalOpen(true)
      // Remove the query parameter
      router.replace("/my-diaries")
    }
  }, [searchParams, router])

  // Refs for tracking deletion timeouts
  const deletionTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Performance monitoring
  const perfMetricsRef = useRef<Map<string, number>>(new Map())

  // Clear all timeouts on unmount
  useEffect(() => {
    return () => {
      deletionTimeoutsRef.current.forEach((timeout) => {
        clearTimeout(timeout)
      })
    }
  }, [])

  // Show undo toast when lastDeletedDiary changes
  useEffect(() => {
    if (lastDeletedDiary) {
      setShowUndoToast(true)

      // Auto-hide after 10 seconds
      const timeout = setTimeout(() => {
        setShowUndoToast(false)
      }, 10000)

      return () => clearTimeout(timeout)
    } else {
      setShowUndoToast(false)
    }
  }, [lastDeletedDiary])

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

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true)
    refreshDiaries()
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1000)
  }

  // Reset delete error when diaryToDelete changes
  useEffect(() => {
    setDeleteError(null)
  }, [diaryToDelete])

  const handleOpenDiary = (diaryId: string) => {
    // Don't navigate if this diary is being deleted
    if (pendingDeletions.has(diaryId) || deletionStates[diaryId]) return
    router.push(`/my-diaries/${diaryId}`)
  }

  const handleDeleteDiary = async () => {
    if (!diaryToDelete) return

    const diaryId = diaryToDelete.id
    const diaryTitle = diaryToDelete.title

    // Start performance tracking
    perfMetricsRef.current.set(diaryId, performance.now())

    // Immediate UI feedback without blocking
    requestAnimationFrame(() => {
      setPendingDeletions((prev) => new Set(prev).add(diaryId))
      setDeletionStates((prev) => ({ ...prev, [diaryId]: true }))
      setDiaryToDelete(null)
    })

    try {
      // Use setTimeout to break the deletion into smaller tasks
      await new Promise((resolve) => {
        setTimeout(async () => {
          try {
            const result = await deleteDiary(diaryId)

            if (result.success) {
              toast({
                title: "Diary deleted",
                description: `"${diaryTitle}" has been deleted.`,
                duration: 5000,
              })
            } else {
              throw new Error("Deletion failed")
            }
          } catch (error) {
            console.error("Error in delete handler:", error)
            setDeleteError("Deletion failed. Please try again.")

            // Rollback UI state
            setPendingDeletions((prev) => {
              const newSet = new Set(prev)
              newSet.delete(diaryId)
              return newSet
            })
            setDeletionStates((prev) => {
              const newStates = { ...prev }
              delete newStates[diaryId]
              return newStates
            })

            // Show error toast
            toast({
              title: "Error",
              description: "Failed to delete diary. Please try again.",
              variant: "destructive",
            })

            // Refresh to ensure UI is consistent
            refreshDiaries()
          } finally {
            resolve(true)
          }
        }, 0)
      })
    } finally {
      // Clean up after a delay
      setTimeout(() => {
        setPendingDeletions((prev) => {
          const newSet = new Set(prev)
          newSet.delete(diaryId)
          return newSet
        })
        setDeletionStates((prev) => {
          const newStates = { ...prev }
          delete newStates[diaryId]
          return newStates
        })

        // Log performance metrics
        const startTime = perfMetricsRef.current.get(diaryId)
        if (startTime) {
          console.log(`Total deletion UI flow for diary ${diaryId} took ${performance.now() - startTime}ms`)
          perfMetricsRef.current.delete(diaryId)
        }
      }, 1000)
    }
  }

  // Handle undo delete
  const handleUndoDelete = async () => {
    try {
      const success = await recoverLastDeletedDiary()

      if (success) {
        toast({
          title: "Diary recovered",
          description: "Your diary has been restored.",
        })

        // Refresh to show the recovered diary
        refreshDiaries()
      } else {
        toast({
          title: "Recovery failed",
          description: "Could not recover the diary. Please try again.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error recovering diary:", err)
      toast({
        title: "Recovery failed",
        description: "Could not recover the diary. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Global loading indicator for deletion operations
  const GlobalLoadingIndicator = () => {
    if (!isDeleting) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white p-4 rounded-lg flex flex-col items-center">
          <Loader2 className="animate-spin h-8 w-8 text-blue-500 mb-2" />
          <p className="text-sm">Processing deletion...</p>
        </div>
      </div>
    )
  }

  if (loading && diaries.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Global loading indicator */}
      <GlobalLoadingIndicator />

      {error && (
        <Alert variant="warning" className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Limited Functionality</AlertTitle>
          <AlertDescription>
            <p>
              {error.includes("index")
                ? "Firestore index required - Please check the instructions above to create the required index."
                : `${error} - Your diary changes will be saved locally but not to the database.`}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {deleteError && (
        <Alert variant="destructive" className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{deleteError}</AlertDescription>
        </Alert>
      )}

      {showUndoToast && lastDeletedDiary && (
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Info className="h-4 w-4" />
          <AlertTitle>Diary Deleted</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>"{lastDeletedDiary.title}" has been deleted.</span>
            <Button variant="outline" size="sm" onClick={handleUndoDelete} className="ml-4">
              <Undo className="h-4 w-4 mr-2" />
              Undo
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="text-2xl font-bold">My Diaries</h2>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing || loading} className="ml-2">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-500 hover:bg-blue-600">
          <Plus className="mr-2 h-4 w-4" />
          New Diary
        </Button>
      </div>

      {diaries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <h3 className="text-lg font-medium mb-2">No diaries yet</h3>
          <p className="text-gray-500 mb-6">Create your first diary to start recording your memories</p>
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-500 hover:bg-blue-600">
            <Plus className="mr-2 h-4 w-4" />
            Create Diary
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {diaries.map((diary) => {
            const isDiaryDeleting = pendingDeletions.has(diary.id) || deletionStates[diary.id]

            return (
              <Card
                key={diary.id}
                className={`overflow-hidden ${isDiaryDeleting ? "opacity-50 pointer-events-none" : ""}`}
              >
                <div className="h-40 bg-gray-200 cursor-pointer" onClick={() => handleOpenDiary(diary.id)}>
                  {diary.coverImageURL ? (
                    <img
                      src={diary.coverImageURL || "/placeholder.svg"}
                      alt={diary.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg"
                      }}
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-r ${getRandomColor(diary.id)}`} />
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3
                        className="font-semibold text-lg truncate cursor-pointer"
                        onClick={() => handleOpenDiary(diary.id)}
                      >
                        {diary.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {diary.videoCount} {diary.videoCount === 1 ? "video" : "videos"}
                      </p>
                    </div>
                    <div className="flex items-center">
                      {diary.isPrivate && <Lock className="h-4 w-4 text-gray-500 mr-2" />}
                      {isDiaryDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/my-diaries/${diary.id}/edit`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => setDiaryToDelete(diary)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleOpenDiary(diary.id)}
                    disabled={isDiaryDeleting}
                  >
                    Open Diary
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <CreateDiaryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(diaryId) => {
          refreshDiaries()
          router.push(`/my-diaries/${diaryId}`)
        }}
      />

      <AlertDialog
        open={!!diaryToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setDiaryToDelete(null)
            setDeleteError(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Diary</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{diaryToDelete?.title}" and all videos in it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-blue-600 hover:bg-blue-700" onClick={handleDeleteDiary}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
