"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageCircle, Send, Trash2, Loader2 } from "lucide-react"
import { useSocialInteractions } from "@/hooks/use-social-interactions"
import { useAuth } from "@/contexts/auth-context"
import { formatDistanceToNow } from "date-fns"
import type { Comment } from "@/models/social"

interface CommentsModalProps {
  isOpen: boolean
  onClose: () => void
  targetId: string
  targetType: "diary" | "video"
}

export function CommentsModal({ isOpen, onClose, targetId, targetType }: CommentsModalProps) {
  const { user } = useAuth()
  const { addComment, getComments, deleteComment } = useSocialInteractions()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Load comments when modal opens
  useEffect(() => {
    if (isOpen) {
      loadComments()
    }
  }, [isOpen, targetId, targetType])

  // Load comments
  const loadComments = async () => {
    setLoading(true)
    const fetchedComments = await getComments(targetId, targetType)
    setComments(fetchedComments)
    setLoading(false)
  }

  // Submit a new comment
  const handleSubmitComment = async () => {
    if (!newComment.trim()) return

    setSubmitting(true)
    const comment = await addComment(targetId, targetType, newComment)

    if (comment) {
      setComments((prev) => [comment, ...prev])
      setNewComment("")
    }

    setSubmitting(false)
  }

  // Delete a comment
  const handleDeleteComment = async (commentId: string) => {
    const success = await deleteComment(commentId, targetId, targetType)

    if (success) {
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    }
  }

  // Format the creation date
  const formatDate = (dateString: string | any) => {
    try {
      const date = typeof dateString === "string" ? new Date(dateString) : dateString?.toDate?.() || new Date()

      return formatDistanceToNow(date, { addSuffix: true })
    } catch (err) {
      return "some time ago"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <MessageCircle className="h-5 w-5 mr-2" />
            Comments
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* New comment form */}
          <div className="flex space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User"} />
              <AvatarFallback>{user?.displayName?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>

            <div className="flex-1 flex space-x-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 resize-none"
                maxLength={500}
              />

              <Button size="icon" onClick={handleSubmitComment} disabled={!newComment.trim() || submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Comments list */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No comments yet. Be the first to comment!</div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 bg-gray-100 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-sm">User</div>
                      <div className="text-xs text-gray-500">{formatDate(comment.createdAt)}</div>
                    </div>

                    <div className="mt-1 text-sm">{comment.text}</div>
                  </div>

                  {comment.userId === user?.uid && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="h-8 w-8 text-gray-500 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
