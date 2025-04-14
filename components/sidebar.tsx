"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Compass, Bell, Book, LogIn, LogOut, User, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { CreateDiaryModal } from "@/components/diary/create-diary-modal"

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const navItems = [
    {
      name: "Home",
      href: "/home",
      icon: Home,
    },
    {
      name: "Explore",
      href: "/explore",
      icon: Compass,
    },
    {
      name: "Notifications",
      href: "/notifications",
      icon: Bell,
    },
  ]

  const handleCreateDiary = () => {
    setIsCreateModalOpen(true)
  }

  return (
    <div className="w-64 h-screen border-r bg-white flex flex-col">
      <div className="p-4">
        <Link href="/home" className="text-2xl font-bold text-blue-500">
          DiaryShare
        </Link>
      </div>
      <nav className="flex-1">
        <ul className="space-y-1 p-2">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100",
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "bg-gray-100 text-blue-500"
                    : "text-gray-700",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            </li>
          ))}

          {/* Create Diary Button */}
          <li className="mt-4">
            <Button onClick={handleCreateDiary} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
              <PlusCircle className="h-5 w-5 mr-2" />
              Create Diary
            </Button>
          </li>

          {!user ? (
            <li>
              <Link
                href="/login"
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100",
                  pathname === "/login" ? "bg-gray-100 text-blue-500" : "text-gray-700",
                )}
              >
                <LogIn className="h-5 w-5" />
                Login
              </Link>
            </li>
          ) : (
            <>
              <li>
                <Link
                  href="/profile"
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100",
                    pathname === "/profile" ? "bg-gray-100 text-blue-500" : "text-gray-700",
                  )}
                >
                  <User className="h-5 w-5" />
                  Profile
                </Link>
              </li>
              <li>
                <Link
                  href="/my-diaries"
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 ml-6",
                    pathname === "/my-diaries" || pathname.startsWith("/my-diaries/")
                      ? "bg-gray-100 text-blue-500"
                      : "text-gray-700",
                  )}
                >
                  <Book className="h-5 w-5" />
                  My Diaries
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>
      {user && (
        <div className="p-4 border-t">
          <button
            onClick={logout}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 w-full"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      )}

      {/* Create Diary Modal */}
      <CreateDiaryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(diaryId) => router.push(`/my-diaries/${diaryId}`)}
      />
    </div>
  )
}
