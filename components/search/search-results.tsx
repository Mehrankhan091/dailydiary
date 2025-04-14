"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, UserPlus, UserCheck } from "lucide-react"
import { useSearch } from "@/hooks/use-search"
import { useSocialInteractions } from "@/hooks/use-social-interactions"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import type { SearchResult } from "@/models/social"

interface SearchResultsProps {
  initialQuery?: string
  initialType?: "all" | "users" | "diaries"
}

export function SearchResults({ initialQuery = "", initialType = "all" }: SearchResultsProps) {
  const router = useRouter()
  const { results, loading, hasMore, performSearch, loadMore } = useSearch()
  const { toggleFollow, checkFollowStatus } = useSocialInteractions()
  const [followStatus, setFollowStatus] = useState<Record<string, boolean>>({})

  // Perform initial search
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery, initialType)
    }
  }, [initialQuery, initialType])

  // Check follow status for user results
  useEffect(() => {
    const checkFollowStatuses = async () => {
      const userResults = results.filter((result) => result.type === "user")

      for (const result of userResults) {
        if (result.id && !followStatus[result.id]) {
          const isFollowing = await checkFollowStatus(result.id)
          setFollowStatus((prev) => ({ ...prev, [result.id]: isFollowing }))
        }
      }
    }

    checkFollowStatuses()
  }, [results])

  // Handle follow button click
  const handleFollow = async (userId: string) => {
    const result = await toggleFollow(userId)

    if (result !== null) {
      setFollowStatus((prev) => ({ ...prev, [userId]: result }))
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

  // Navigate to result
  const navigateToResult = (result: SearchResult) => {
    if (result.type === "user") {
      router.push(`/user/${result.id}`)
    } else if (result.type === "diary") {
      router.push(`/my-diaries/${result.id}`)
    }
  }

  if (loading && results.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <p className="text-gray-500">No results found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <Card key={result.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Thumbnail/Avatar */}
              <div className="cursor-pointer" onClick={() => navigateToResult(result)}>
                {result.type === "user" ? (
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={result.thumbnailURL || ""} alt={result.title} />
                    <AvatarFallback>{result.title.charAt(0)}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-16 w-24 bg-gray-200 rounded overflow-hidden">
                    {result.thumbnailURL ? (
                      <img
                        src={result.thumbnailURL || "/placeholder.svg"}
                        alt={result.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-purple-400 to-purple-600" />
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="cursor-pointer" onClick={() => navigateToResult(result)}>
                  <h3 className="font-medium">{result.title}</h3>

                  {result.type === "user" ? (
                    <p className="text-sm text-gray-500">User</p>
                  ) : (
                    <div className="flex items-center text-sm text-gray-500 space-x-2">
                      <span>{result.userDisplayName}</span>
                      <span>•</span>
                      <span>{formatDate(result.createdAt)}</span>
                      {result.likeCount !== undefined && (
                        <>
                          <span>•</span>
                          <span>{result.likeCount} likes</span>
                        </>
                      )}
                    </div>
                  )}

                  {result.description && <p className="text-sm mt-1 line-clamp-2">{result.description}</p>}
                </div>
              </div>

              {/* Action buttons */}
              {result.type === "user" && result.id && (
                <div>
                  {followStatus[result.id] ? (
                    <Button variant="outline" size="sm" onClick={() => handleFollow(result.id)}>
                      <UserCheck className="h-4 w-4 mr-1" />
                      Following
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => handleFollow(result.id)}>
                      <UserPlus className="h-4 w-4 mr-1" />
                      Follow
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center py-4">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
