"use server"

import "server-only" // Ensure this module only runs on the server [^1][^2][^4]

export async function getMonnifyKeys() {
  const publicKey = process.env.MONNIFY_PUBLIC_KEY
  const contractCode = process.env.MONNIFY_CONTRACT_CODE

  if (!publicKey || !contractCode) {
    throw new Error("Monnify public key or contract code not configured.")
  }

  return { publicKey, contractCode }
}
