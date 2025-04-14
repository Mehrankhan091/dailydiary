"use client"

import { useSearchParams } from "next/navigation"
import ProtectedRoute from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { SearchResults } from "@/components/search/search-results"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useEffect } from "react"

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""
  const initialType = (searchParams.get("type") || "all") as "all" | "users" | "diaries"
  const [activeTab, setActiveTab] = useState(initialType)

  // Update active tab when URL params change
  useEffect(() => {
    setActiveTab(initialType)
  }, [initialType])

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-auto">
          <Header />
          <main className="flex-1 p-6">
            <h1 className="text-2xl font-bold mb-2">Search Results</h1>
            <p className="text-gray-500 mb-6">
              {query ? `Showing results for "${query}"` : "Enter a search term to find users and diaries"}
            </p>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="diaries">Diaries</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <SearchResults initialQuery={query} initialType="all" />
              </TabsContent>

              <TabsContent value="users" className="mt-6">
                <SearchResults initialQuery={query} initialType="users" />
              </TabsContent>

              <TabsContent value="diaries" className="mt-6">
                <SearchResults initialQuery={query} initialType="diaries" />
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
