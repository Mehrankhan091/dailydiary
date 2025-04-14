"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FeedItem } from "@/components/feed/feed-item"
import { Loader2, RefreshCw, ExternalLink } from "lucide-react"
import { useInView } from "react-intersection-observer"
import type { FeedItem as FeedItemType } from "@/models/social"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface FeedProps {
  items: FeedItemType[]
  loading: boolean
  error: string | null
  indexError?: string | null
  hasMore: boolean
  onLoadMore: () => void
  onRefresh: () => void
  emptyMessage?: string
}

export function Feed({
  items,
  loading,
  error,
  indexError,
  hasMore,
  onLoadMore,
  onRefresh,
  emptyMessage = "No items to display",
}: FeedProps) {
  const [feedItems, setFeedItems] = useState<FeedItemType[]>(items)
  const { ref, inView } = useInView()

  // Update local state when props change
  useEffect(() => {
    setFeedItems(items)
  }, [items])

  // Load more when bottom is visible
  useEffect(() => {
    if (inView && hasMore && !loading) {
      onLoadMore()
    }
  }, [inView, hasMore, loading, onLoadMore])

  // Handle feed item update
  const handleItemUpdate = (updatedItem: FeedItemType) => {
    setFeedItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)))
  }

  // Extract index URL from error message
  const getIndexUrl = (errorMessage: string | null) => {
    if (!errorMessage) return null
    const match = errorMessage.match(/https:\/\/console\.firebase\.google\.com[^\s]+/)
    return match ? match[0] : null
  }

  const indexUrl = getIndexUrl(indexError || error)

  return (
    <div className="space-y-4">
      {/* Refresh button */}
      <div className="flex justify-center mb-4">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="flex items-center">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Index error alert */}
      {indexError && (
        <Alert variant="warning" className="mb-4">
          <AlertTitle>Firestore Index Required</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              This is a one-time setup needed for complex queries. Your feed is still working with limited
              functionality.
            </p>
            {indexUrl && (
              <div className="flex flex-col space-y-2">
                <p>Click the button below to create the required index:</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center w-fit"
                  onClick={() => window.open(indexUrl, "_blank")}
                >
                  Create Index
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Feed items */}
      {feedItems.length === 0 && !loading ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedItems.map((item) => (
            <FeedItem key={item.id} item={item} onUpdate={handleItemUpdate} />
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Load more trigger */}
      {hasMore && !loading && <div ref={ref} className="h-10" />}

      {/* Error message */}
      {error && !indexError && (
        <div className="text-center py-4 text-rose-500">
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}
