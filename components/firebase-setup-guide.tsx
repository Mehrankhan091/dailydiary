import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"

export function FirebaseSetupGuide() {
  return (
    <Alert variant="warning" className="mb-6">
      <Info className="h-4 w-4" />
      <AlertTitle>Firebase Setup Required</AlertTitle>
      <AlertDescription>
        <p className="mb-2">
          To use all features of this application, you need to set up Firestore security rules in your Firebase console:
        </p>
        <ol className="list-decimal pl-5 space-y-2 text-sm">
          <li>Go to your Firebase console</li>
          <li>Navigate to Firestore Database</li>
          <li>Click on the "Rules" tab</li>
          <li>
            Replace the rules with:
            <pre className="bg-gray-100 p-2 mt-1 rounded text-xs overflow-auto">
              {`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own profile
    match /userProfiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow users to read and write their own diary entries
    match /diaryEntries/{entryId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}`}
            </pre>
          </li>
          <li>Click "Publish"</li>
        </ol>
      </AlertDescription>
    </Alert>
  )
}
