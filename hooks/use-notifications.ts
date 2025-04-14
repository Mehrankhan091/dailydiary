"use client"

import { useState, useEffect } from "react"
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"

export type NotificationType = "like" | "comment" | "follow" | "share"

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  sourceUserId: string
  sourceUserName: string
  sourceUserPhoto?: string
  targetId?: string
  targetType?: "diary" | "video"
  targetTitle?: string
  read: boolean
  createdAt: any
}

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch notifications
  useEffect(() => {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create a query for the user's notifications
      const notificationsRef = collection(db, "notifications")
      const q = query(notificationsRef, where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(50))

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const notificationsList: Notification[] = []
          let unread = 0

          snapshot.forEach((doc) => {
            const notification = { id: doc.id, ...doc.data() } as Notification
            notificationsList.push(notification)

            if (!notification.read) {
              unread++
            }
          })

          setNotifications(notificationsList)
          setUnreadCount(unread)
          setLoading(false)
        },
        (err) => {
          console.error("Error fetching notifications:", err)
          setError("Failed to load notifications")
          setLoading(false)
        },
      )

      return () => unsubscribe()
    } catch (err) {
      console.error("Error setting up notifications listener:", err)
      setError("Failed to load notifications")
      setLoading(false)
    }
  }, [user])

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (!user) return false

    try {
      const notificationRef = doc(db, "notifications", notificationId)
      await updateDoc(notificationRef, {
        read: true,
      })

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification,
        ),
      )

      // Update unread count
      setUnreadCount((prev) => Math.max(0, prev - 1))

      return true
    } catch (err) {
      console.error("Error marking notification as read:", err)
      return false
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return false

    try {
      // Get all unread notifications
      const unreadNotifications = notifications.filter((notification) => !notification.read)

      // Update each notification
      const updatePromises = unreadNotifications.map((notification) => {
        const notificationRef = doc(db, "notifications", notification.id)
        return updateDoc(notificationRef, { read: true })
      })

      await Promise.all(updatePromises)

      // Update local state
      setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))

      // Reset unread count
      setUnreadCount(0)

      return true
    } catch (err) {
      console.error("Error marking all notifications as read:", err)
      return false
    }
  }

  return {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
  }
}
