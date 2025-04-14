"use client"

import { useState } from "react"
import { Bell, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { SearchBar } from "@/components/search/search-bar"
import Link from "next/link"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useNotifications, type Notification } from "@/hooks/use-notifications"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"

export function Header() {
  const { user } = useAuth()
  const { notifications, loading: notificationsLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  // Get initials from user's display name or use "US" as default
  const getInitials = () => {
    if (!user?.displayName) return "US"
    return user.displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  // Format notification time
  const formatTime = (time: any) => {
    try {
      const date = typeof time === "string" ? new Date(time) : time?.toDate?.() || new Date()
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (err) {
      return "some time ago"
    }
  }

  // Get notification icon and text
  const getNotificationContent = (notification: Notification) => {
    switch (notification.type) {
      case "like":
        return {
          icon: "❤️",
          text: `${notification.sourceUserName} liked your ${notification.targetType || "post"}`,
        }
      case "comment":
        return {
          icon: "💬",
          text: `${notification.sourceUserName} commented on your ${notification.targetType || "post"}`,
        }
      case "follow":
        return {
          icon: "👤",
          text: `${notification.sourceUserName} started following you`,
        }
      case "share":
        return {
          icon: "🔄",
          text: `${notification.sourceUserName} shared your ${notification.targetType || "post"}`,
        }
      default:
        return {
          icon: "📣",
          text: `New notification from ${notification.sourceUserName}`,
        }
    }
  }

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    await markAsRead(notification.id)

    // Navigate based on notification type
    if (notification.targetId && notification.targetType === "diary") {
      window.location.href = `/my-diaries/${notification.targetId}`
    } else if (notification.targetId && notification.targetType === "video") {
      window.location.href = `/my-diaries/${notification.targetId}`
    } else if (notification.type === "follow") {
      window.location.href = `/profile`
    }
  }

  return (
    <header className="border-b bg-white">
      <div className="flex items-center justify-between p-4">
        <h1 className="text-xl font-semibold">Home</h1>
        <div className="flex items-center gap-4">
          {/* Wrap SearchBar in an error boundary or try-catch */}
          <div>
            <SearchBar />
          </div>

          {/* Notifications */}
          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 max-h-[70vh] overflow-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-medium">Notifications</h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllAsRead()}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Mark all as read
                  </Button>
                )}
              </div>

              <div className="py-2">
                {notificationsLoading ? (
                  // Loading skeletons
                  Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 hover:bg-gray-50">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-full mb-2" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    ))
                ) : notifications.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const { icon, text } = getNotificationContent(notification)

                    return (
                      <div
                        key={notification.id}
                        className={`flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer ${
                          !notification.read ? "bg-blue-50" : ""
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={notification.sourceUserPhoto || "/placeholder.svg"} />
                          <AvatarFallback>{icon}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className={`text-sm ${!notification.read ? "font-medium" : ""}`}>{text}</p>
                          <p className="text-xs text-gray-500">{formatTime(notification.createdAt)}</p>
                        </div>
                        {!notification.read && <div className="h-2 w-2 rounded-full bg-blue-500 mt-1"></div>}
                      </div>
                    )
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Link href="/profile">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium cursor-pointer">
              {getInitials()}
            </div>
          </Link>
        </div>
      </div>
    </header>
  )
}
