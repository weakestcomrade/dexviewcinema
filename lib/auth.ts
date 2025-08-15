// Authentication utilities for admin users
export interface AdminUser {
  id: string
  email: string
  isAuthenticated: boolean
}

// Simulate authentication - replace with real implementation
export const authenticateAdmin = async (email: string, password: string): Promise<AdminUser | null> => {
  // Hardcoded admin credentials - in production, this should be stored securely in environment variables
  const ADMIN_EMAIL = "admin@dexviewcinema.com"
  const ADMIN_PASSWORD = "DexCinema2025!"

  // Validate credentials against hardcoded admin account
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return {
      id: "admin-1",
      email: ADMIN_EMAIL,
      isAuthenticated: true,
    }
  }

  // Return null for invalid credentials
  return null
}

// Set authentication cookie
export const setAuthCookie = (response: Response) => {
  // TODO: Generate actual JWT token
  const token = "admin-authenticated-" + Date.now()

  // Set cookie with proper security settings
  const cookie = `admin-auth-token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`
  response.headers.set("Set-Cookie", cookie)
}

// Clear authentication cookie
export const clearAuthCookie = (response: Response) => {
  const cookie = `admin-auth-token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
  response.headers.set("Set-Cookie", cookie)
}
