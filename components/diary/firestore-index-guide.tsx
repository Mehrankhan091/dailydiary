"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ExternalLink, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FirestoreIndexGuide() {
  return (
    <Alert variant="warning" className="mb-6">
      <Info className="h-4 w-4" />
      <AlertTitle>Firestore Index Required</AlertTitle>
      <AlertDescription className="space-y-4">
        <p>
          Firestore requires an index to be created for the queries used in this application. This is a one-time setup:
        </p>
        <ol className="list-decimal pl-5 space-y-2 text-sm">
          <li>Look for a link in your browser console that starts with "https://console.firebase.google.com/..."</li>
          <li>Click that link to open the Firebase console</li>
          <li>Click the "Create index" button on the page that opens</li>
          <li>Wait for the index to be created (this may take a few minutes)</li>
          <li>Refresh this page after the index is created</li>
        </ol>
        <Button variant="outline" className="flex items-center gap-2" onClick={() => window.location.reload()}>
          Refresh Page
          <ExternalLink className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  )
}
