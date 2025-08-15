export interface User {
  _id: string
  email: string
  password: string // This will be hashed
  role: "admin" | "customer"
  name: string
  phone?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserData {
  email: string
  password: string
  name: string
  phone?: string
  role: "admin" | "customer"
}

export interface LoginData {
  email: string
  password: string
}
