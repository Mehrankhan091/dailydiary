"use client"
import Image from "next/image"
import { Pencil, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useRouter } from "next/navigation"

export function ProfileHeader() {
  const { profile } = useUserProfile()
  const router = useRouter()

  if (!profile) return null

  // Get initials from display name
  const getInitials = () => {
    if (!profile.displayName) return "U"
    return profile.displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 1)
  }

  const handleEditProfile = () => {
    router.push("/settings")
  }

  return (
    <div className="py-8 px-6">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Profile Avatar */}
        <div className="relative">
          {profile.photoURL ? (
            <div className="h-28 w-28 rounded-full overflow-hidden">
              <Image
                src={profile.photoURL || "/placeholder.svg"}
                alt={profile.displayName || "Profile"}
                width={112}
                height={112}
                className="object-cover"
              />
            </div>
          ) : (
            <div className="h-28 w-28 flex items-center justify-center rounded-full bg-orange-500 text-white text-5xl font-medium">
              {getInitials()}
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center md:text-left">
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold">{profile.displayName}</h1>
              <p className="text-gray-600">@{profile.username || `user${profile.uid.substring(0, 8)}`}</p>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <Button onClick={handleEditProfile} size="sm" className="bg-rose-500 hover:bg-rose-600">
                <Pencil className="h-4 w-4 mr-2" />
                Edit profile
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push("/settings")}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>

            <div className="flex justify-center md:justify-start space-x-6 text-sm">
              <div>
                <span className="font-semibold">{profile.stats?.following || 0}</span>{" "}
                <span className="text-gray-600">Following</span>
              </div>
              <div>
                <span className="font-semibold">{profile.stats?.followers || 0}</span>{" "}
                <span className="text-gray-600">Followers</span>
              </div>
              <div>
                <span className="font-semibold">{profile.stats?.likes || 0}</span>{" "}
                <span className="text-gray-600">Likes</span>
              </div>
            </div>

            <p className="text-gray-700">{profile.bio || "No bio yet."}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
