"use client"

import { useState } from "react"
import { useUserProfile } from "@/hooks/use-user-profile"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { BookMarked, Archive, FileEdit } from "lucide-react"

export function ContentManagement() {
  const { profile } = useUserProfile()
  const [activeTab, setActiveTab] = useState("posts")

  if (!profile) return null

  // Placeholder data for demo
  const posts = []
  const archived = []
  const saved = []
  const drafts = []

  const renderEmptyState = (type: string) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="bg-gray-100 rounded-full p-4 mb-4">
        {type === "posts" && <BookMarked className="h-8 w-8 text-gray-400" />}
        {type === "archived" && <Archive className="h-8 w-8 text-gray-400" />}
        {type === "saved" && <BookMarked className="h-8 w-8 text-gray-400" />}
        {type === "drafts" && <FileEdit className="h-8 w-8 text-gray-400" />}
      </div>
      <h3 className="text-lg font-medium mb-2">No {type} yet</h3>
      <p className="text-gray-500 max-w-sm">
        {type === "posts" && "Your published posts will appear here."}
        {type === "archived" && "Your archived posts will appear here."}
        {type === "saved" && "Your saved posts will appear here."}
        {type === "drafts" && "Your draft posts will appear here."}
      </p>
    </div>
  )

  return (
    <div className="px-8 py-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Content Management</h2>
        <Button variant="outline" size="sm">
          New Post
        </Button>
      </div>

      <Tabs defaultValue="posts" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="mt-6">
          {posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">{/* Posts grid would go here */}</div>
          ) : (
            renderEmptyState("posts")
          )}
        </TabsContent>
        <TabsContent value="archived" className="mt-6">
          {archived.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">{/* Archived posts grid would go here */}</div>
          ) : (
            renderEmptyState("archived")
          )}
        </TabsContent>
        <TabsContent value="saved" className="mt-6">
          {saved.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">{/* Saved posts grid would go here */}</div>
          ) : (
            renderEmptyState("saved")
          )}
        </TabsContent>
        <TabsContent value="drafts" className="mt-6">
          {drafts.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">{/* Drafts grid would go here */}</div>
          ) : (
            renderEmptyState("drafts")
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
