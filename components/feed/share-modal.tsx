"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, Twitter, Facebook, MessageCircle, Mail, Check, Share2 } from "lucide-react"
import { useSocialInteractions } from "@/hooks/use-social-interactions"
import type { FeedItem } from "@/models/social"

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  item: FeedItem
}

export function ShareModal({ isOpen, onClose, item }: ShareModalProps) {
  const { recordShare } = useSocialInteractions()
  const [copied, setCopied] = useState(false)
  const [shareCount, setShareCount] = useState(item.shareCount || 0)

  // Generate share URL
  const getShareUrl = () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    return `${baseUrl}/${item.type === "diary" ? "diary" : "video"}/${item.id}`
  }

  // Copy link to clipboard
  const copyToClipboard = async () => {
    const url = getShareUrl()

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      // Record share
      const success = await recordShare(item.id, item.type, "copy")
      if (success) {
        setShareCount((prev) => prev + 1)
      }
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  // Share to social media
  const shareToSocial = async (platform: "twitter" | "facebook" | "whatsapp" | "email") => {
    const url = encodeURIComponent(getShareUrl())
    const title = encodeURIComponent(item.title)
    let shareUrl = ""

    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${title}&url=${url}`
        break
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`
        break
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${title}%20${url}`
        break
      case "email":
        shareUrl = `mailto:?subject=${title}&body=${url}`
        break
    }

    // Open share window
    if (shareUrl) {
      window.open(shareUrl, "_blank")

      // Record share
      const success = await recordShare(item.id, item.type, platform)
      if (success) {
        setShareCount((prev) => prev + 1)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Share2 className="h-5 w-5 mr-2" />
            Share
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Input value={getShareUrl()} readOnly className="flex-1" />
            <Button variant="outline" size="icon" onClick={copyToClipboard} className={copied ? "text-green-500" : ""}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-20 p-2"
              onClick={() => shareToSocial("twitter")}
            >
              <Twitter className="h-6 w-6 mb-1" />
              <span className="text-xs">Twitter</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-20 p-2"
              onClick={() => shareToSocial("facebook")}
            >
              <Facebook className="h-6 w-6 mb-1" />
              <span className="text-xs">Facebook</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-20 p-2"
              onClick={() => shareToSocial("whatsapp")}
            >
              <MessageCircle className="h-6 w-6 mb-1" />
              <span className="text-xs">WhatsApp</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-20 p-2"
              onClick={() => shareToSocial("email")}
            >
              <Mail className="h-6 w-6 mb-1" />
              <span className="text-xs">Email</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
