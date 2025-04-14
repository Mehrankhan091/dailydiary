"use client"

import { useUserProfile } from "@/hooks/use-user-profile"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export function ProfileStats() {
  const { profile, loading } = useUserProfile()
  const [stats, setStats] = useState<{ label: string; value: number; href: string }[]>([])

  useEffect(() => {
    if (profile) {
      setStats([
        { label: "Posts", value: profile.stats?.posts || 0, href: "/profile" },
        { label: "Followers", value: profile.stats?.followers || 0, href: "/profile/followers" },
        { label: "Following", value: profile.stats?.following || 0, href: "/profile/following" },
        { label: "Likes", value: profile.stats?.likes || 0, href: "/profile/likes" },
      ])
    }
  }, [profile])

  if (loading) {
    return (
      <div className="flex justify-between px-8 py-4 border-t border-b">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-6 w-12 mx-auto mb-1" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </div>
        ))}
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="flex justify-between px-8 py-4 border-t border-b">
      {stats.map((stat) => (
        <Link href={stat.href} key={stat.label} className="text-center">
          <div className="font-bold">{stat.value}</div>
          <div className="text-sm text-gray-600">{stat.label}</div>
        </Link>
      ))}
    </div>
  )
}
