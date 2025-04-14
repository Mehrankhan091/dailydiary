"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, X, Loader2 } from "lucide-react"
import { useSearch } from "@/hooks/use-search"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/hooks/use-debounce"

export function SearchBar() {
  const router = useRouter()
  const { performSearch, clearSearch, loading } = useSearch()
  const [searchTerm, setSearchTerm] = useState("")
  const [searchType, setSearchType] = useState<"all" | "users" | "diaries">("all")
  const [isExpanded, setIsExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Perform search when debounced term changes
  useEffect(() => {
    if (debouncedSearchTerm && debouncedSearchTerm.length >= 2) {
      try {
        performSearch(debouncedSearchTerm, searchType)
      } catch (err) {
        console.error("Search error:", err)
        // Silently fail - the error will be handled in the performSearch function
      }
    } else if (debouncedSearchTerm === "") {
      clearSearch()
    }
  }, [debouncedSearchTerm, searchType])

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  // Handle search type change
  const handleSearchTypeChange = (value: string) => {
    setSearchType(value as "all" | "users" | "diaries")
  }

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm)}&type=${searchType}`)
      setIsExpanded(false)
    }
  }

  // Toggle expanded state
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)

    if (!isExpanded) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm("")
    clearSearch()
  }

  return (
    <div className={`transition-all duration-200 ${isExpanded ? "w-full" : "w-auto"}`}>
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="flex items-center">
          {!isExpanded ? (
            <Button type="button" variant="ghost" size="icon" onClick={toggleExpanded} className="relative">
              <Search className="h-5 w-5" />
            </Button>
          ) : (
            <div className="flex items-center w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  ref={inputRef}
                  type="search"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                    ) : (
                      <X className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                )}
              </div>

              <Button type="button" variant="ghost" size="icon" onClick={toggleExpanded} className="ml-2">
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="mt-2">
            <Tabs defaultValue="all" onValueChange={handleSearchTypeChange}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="diaries">Diaries</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </form>
    </div>
  )
}
