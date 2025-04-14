"use client"

import ProtectedRoute from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { useNotifications, type Notification } from "@/hooks/use-notifications"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"

export default function NotificationsPage() {
  const { notifications, loading, error, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const router = useRouter()

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
      router.push(`/my-diaries/${notification.targetId}`)
    } else if (notification.targetId && notification.targetType === "video") {
      router.push(`/my-diaries/${notification.targetId}`)
    } else if (notification.type === "follow") {
      router.push(`/profile`)
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Notifications</h1>
                {unreadCount > 0 && (
                  <Button onClick={() => markAllAsRead()} className="bg-blue-500 hover:bg-blue-600">
                    <Check className="h-4 w-4 mr-2" />
                    Mark all as read
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="space-y-4">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="bg-white p-4 rounded-lg border flex items-start gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                      </div>
                    ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border">
                  <h3 className="text-lg font-medium mb-2">No notifications yet</h3>
                  <p className="text-gray-500">When you receive notifications, they'll appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => {
                    const { icon, text } = getNotificationContent(notification)

                    return (
                      <div
                        key={notification.id}
                        className={`flex items-start gap-4 p-4 rounded-lg border bg-white hover:bg-gray-50 cursor-pointer transition-colors ${
                          !notification.read ? "border-blue-200 bg-blue-50" : ""
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={notification.sourceUserPhoto || "/placeholder.svg"} />
                          <AvatarFallback>{icon}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className={`${!notification.read ? "font-medium" : ""}`}>{text}</p>
                          <p className="text-sm text-gray-500 mt-1">{formatTime(notification.createdAt)}</p>
                          {notification.targetTitle && (
                            <p className="text-sm text-gray-700 mt-1 italic">"{notification.targetTitle}"</p>
                          )}
                        </div>
                        {!notification.read && <div className="h-3 w-3 rounded-full bg-blue-500 mt-1"></div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
