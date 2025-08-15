export interface Admin {
  _id: string
  name: string
  email: string
  password: string
  role: "admin" | "super_admin"
  isActive?: boolean
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date | null
}

export interface CreateAdminRequest {
  name: string
  email: string
  password: string
}

export interface AdminSession {
  id: string
  email: string
  name: string
  role: string
}
