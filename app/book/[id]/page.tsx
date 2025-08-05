"use client"

import { useRouter } from "next/router"
import { useEffect } from "react"

const BookPage = () => {
  const router = useRouter()
  const { id } = router.query

  useEffect(() => {
    if (!id) {
      router.push("/")
    }
  }, [id, router])

  return (
    <div>
      <h1>Book Page for ID: {id}</h1>
      {/* rest of code here */}
      <footer>© 2025 Dex View Cinema. All rights reserved.</footer>
    </div>
  )
}

export default BookPage
