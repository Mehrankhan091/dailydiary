"use client"

import ProtectedRoute from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Feed } from "@/components/feed/feed"
import { useExploreFeed } from "@/hooks/use-explore-feed"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ExternalLink, Info } from "lucide-react"

export default function ExplorePage() {
  const { feedItems, loading, error, indexError, hasMore, loadMore, refreshFeed } = useExploreFeed()

  // Extract index URL from error message
  const getIndexUrl = (errorMessage: string | null) => {
    if (!errorMessage) return null
    const match = errorMessage?.match(/https:\/\/console\.firebase\.google\.com[^\s]+/)
    return match ? match[0] : null
  }

  const indexUrl = getIndexUrl(indexError || error)

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-auto">
          <Header />
          <main className="flex-1 p-6">
            <h1 className="text-2xl font-bold mb-6">Explore</h1>

            {indexUrl && (
              <Alert variant="warning" className="mb-6">
                <Info className="h-4 w-4" />
                <AlertTitle>Firestore Index Required</AlertTitle>
                <AlertDescription className="space-y-4">
                  <p>
                    This is a one-time setup needed for complex queries. Your feed is still working with limited
                    functionality.
                  </p>
                  <div className="flex flex-col space-y-2">
                    <p>Click the button below to create the required index:</p>
                    <Button
                      variant="outline"
                      className="flex items-center w-fit"
                      onClick={() => window.open(indexUrl, "_blank")}
                    >
                      Create Index
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Feed
              items={feedItems}
              loading={loading}
              error={error}
              indexError={indexError}
              hasMore={hasMore}
              onLoadMore={loadMore}
              onRefresh={refreshFeed}
              emptyMessage="No trending content to show."
            />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
