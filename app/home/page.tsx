"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProtectedRoute from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Feed } from "@/components/feed/feed"
import { useHomeFeed } from "@/hooks/use-home-feed"
import { useExploreFeed } from "@/hooks/use-explore-feed"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("all")
  const {
    feedItems: homeFeedItems,
    loading: homeLoading,
    error: homeError,
    hasMore: homeHasMore,
    loadMore: homeLoadMore,
    refreshFeed: homeRefresh,
  } = useHomeFeed()

  const {
    feedItems: exploreFeedItems,
    loading: exploreLoading,
    error: exploreError,
    indexError: exploreIndexError,
    hasMore: exploreHasMore,
    loadMore: exploreLoadMore,
    refreshFeed: exploreRefresh,
  } = useExploreFeed()

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-auto">
          <Header />
          <main className="flex-1 p-6">
            <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
                <TabsTrigger value="all">All Diaries</TabsTrigger>
                <TabsTrigger value="trending">Trending</TabsTrigger>
                <TabsTrigger value="following">Following</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <Feed
                  items={homeFeedItems}
                  loading={homeLoading}
                  error={homeError}
                  hasMore={homeHasMore}
                  onLoadMore={homeLoadMore}
                  onRefresh={homeRefresh}
                  emptyMessage="No diaries to show. Follow users to see their content here."
                />
              </TabsContent>

              <TabsContent value="trending" className="mt-6">
                <Feed
                  items={exploreFeedItems}
                  loading={exploreLoading}
                  error={exploreError}
                  indexError={exploreIndexError}
                  hasMore={exploreHasMore}
                  onLoadMore={exploreLoadMore}
                  onRefresh={exploreRefresh}
                  emptyMessage="No trending diaries to show."
                />
              </TabsContent>

              <TabsContent value="following" className="mt-6">
                <Feed
                  items={homeFeedItems.filter((item) => item.userIsFollowing)}
                  loading={homeLoading}
                  error={homeError}
                  hasMore={homeHasMore}
                  onLoadMore={homeLoadMore}
                  onRefresh={homeRefresh}
                  emptyMessage="No followed diaries to show. Follow users to see their content here."
                />
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
