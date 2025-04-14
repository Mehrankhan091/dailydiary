"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Loader2, Check, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Username validation states
type UsernameValidationState = "idle" | "checking" | "valid" | "invalid" | "too-short" | "invalid-chars"

export default function SignupPage() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [usernameError, setUsernameError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [usernameValidation, setUsernameValidation] = useState<UsernameValidationState>("idle")

  // Cache for username availability results
  const usernameCache = useRef<Map<string, boolean>>(new Map())

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Username blur check flag
  const [hasBlurred, setHasBlurred] = useState(false)

  // Performance tracking
  const usernameCheckTimeRef = useRef<number | null>(null)

  const { signup, googleSignIn, facebookSignIn } = useAuth()

  // Debounced username check
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    // Reset validation state if empty
    if (!username) {
      setUsernameValidation("idle")
      setUsernameError("")
      return
    }

    // Check minimum length
    if (username.length < 3) {
      setUsernameValidation("too-short")
      setUsernameError("Username must be at least 3 characters")
      return
    }

    // Check valid characters
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameValidation("invalid-chars")
      setUsernameError("Username can only contain letters, numbers, and underscores")
      return
    }

    // Check cache first for immediate feedback
    if (usernameCache.current.has(username)) {
      const isAvailable = usernameCache.current.get(username)
      setUsernameValidation(isAvailable ? "valid" : "invalid")
      setUsernameError(isAvailable ? "" : "This username is already taken")
      return
    }

    // Set to checking state
    setUsernameValidation("checking")
    usernameCheckTimeRef.current = performance.now()

    // Only check with server after debounce delay
    debounceTimerRef.current = setTimeout(async () => {
      try {
        await checkUsernameAvailability(username)
      } catch (err) {
        console.error("Error in debounced username check:", err)
      }
    }, 800) // 800ms debounce
  }, [username])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    // These checks should already be handled in the effect
    if (!username || username.length < 3) {
      return false
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return false
    }

    try {
      // Check if username exists in Firestore
      const usersRef = collection(db, "userProfiles")
      const q = query(usersRef, where("username", "==", username))
      const querySnapshot = await getDocs(q)

      const isAvailable = querySnapshot.empty

      // Update validation state
      setUsernameValidation(isAvailable ? "valid" : "invalid")
      setUsernameError(isAvailable ? "" : "This username is already taken")

      // Cache the result
      usernameCache.current.set(username, isAvailable)

      // Log performance
      if (usernameCheckTimeRef.current) {
        console.log(`Username check took ${performance.now() - usernameCheckTimeRef.current}ms`)
        usernameCheckTimeRef.current = null
      }

      return isAvailable
    } catch (err) {
      console.error("Error checking username:", err)

      // Handle permission errors gracefully
      setUsernameValidation("idle")
      setUsernameError("Could not verify username availability - will check again after signup")

      // Return true to allow the signup process to continue
      return true
    }
  }

  // Handle username input change - just update the state, effect will handle debounce
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setUsername(value)
  }

  // Handle username blur - immediate check on blur for better UX
  const handleUsernameBlur = async () => {
    setHasBlurred(true)

    // If we're already checking or have a result, don't trigger another check
    if (usernameValidation === "checking" || usernameValidation === "valid" || usernameValidation === "invalid") {
      return
    }

    // If username is valid length and characters, check immediately on blur
    if (username && username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username)) {
      // Clear any existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }

      setUsernameValidation("checking")
      usernameCheckTimeRef.current = performance.now()

      try {
        await checkUsernameAvailability(username)
      } catch (err) {
        console.error("Error in blur username check:", err)
      }
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate required fields
    if (!firstName.trim()) {
      setError("First name is required")
      return
    }

    if (!lastName.trim()) {
      setError("Last name is required")
      return
    }

    if (!username.trim()) {
      setError("Username is required")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    // Check username validation state
    if (usernameValidation === "checking") {
      setError("Please wait while we verify your username")
      return
    }

    if (
      usernameValidation === "invalid" ||
      usernameValidation === "too-short" ||
      usernameValidation === "invalid-chars"
    ) {
      setError(usernameError || "Please choose a different username")
      return
    }

    setIsLoading(true)

    try {
      // Create display name from first and last name
      const displayName = `${firstName} ${lastName}`

      await signup(email, password, displayName, {
        firstName,
        lastName,
        username,
      })
    } catch (error: any) {
      setError(error.message || "Failed to create an account")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError("")
    setIsLoading(true)
    try {
      await googleSignIn()
    } catch (error: any) {
      setError(error.message || "Failed to sign in with Google")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFacebookSignIn = async () => {
    setError("")
    setIsLoading(true)
    try {
      await facebookSignIn()
    } catch (error: any) {
      setError(error.message || "Failed to sign in with Facebook")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-rose-100 to-teal-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
          <CardDescription className="text-center">Enter your information to create an account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">
                Username <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">@</span>
                <Input
                  id="username"
                  placeholder="username"
                  value={username}
                  onChange={handleUsernameChange}
                  onBlur={handleUsernameBlur}
                  className={`pl-8 ${
                    hasBlurred && usernameValidation === "invalid"
                      ? "border-rose-500 pr-10"
                      : hasBlurred && usernameValidation === "valid"
                        ? "border-green-500 pr-10"
                        : "pr-10"
                  }`}
                  required
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {usernameValidation === "checking" && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                  {usernameValidation === "valid" && <Check className="h-4 w-4 text-green-500" />}
                  {usernameValidation === "invalid" && <X className="h-4 w-4 text-rose-500" />}
                </div>
              </div>
              {usernameError && <p className="text-sm text-rose-500 mt-1">{usernameError}</p>}
              <p className="text-xs text-gray-500">Only letters, numbers, and underscores allowed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">
                Confirm Password <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-rose-500 hover:bg-rose-600" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" type="button" onClick={handleGoogleSignIn} disabled={isLoading}>
              Google
            </Button>
            <Button variant="outline" type="button" onClick={handleFacebookSignIn} disabled={isLoading}>
              Facebook
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-rose-500 hover:underline">
              Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
