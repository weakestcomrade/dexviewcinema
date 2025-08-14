// Simple environment variable-based authentication
export const ADMIN_CREDENTIALS = {
  email: "admin@dexcinema.com",
  password: "admin123",
}

export function validateAdminCredentials(email: string, password: string): boolean {
  return email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password
}
