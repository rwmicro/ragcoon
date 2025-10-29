import type { UserProfile } from "@/lib/user/types"
import { fetchClient } from "./fetch"
import { API_ROUTE_CREATE_GUEST, API_ROUTE_UPDATE_CHAT_MODEL } from "./routes"

/**
 * Creates a guest user record on the server
 */
export async function createGuestUser(guestId: string) {
  try {
    const res = await fetchClient(API_ROUTE_CREATE_GUEST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: guestId }),
    })
    const responseData = await res.json()
    if (!res.ok) {
      throw new Error(
        responseData.error ||
          `Failed to create guest user: ${res.status} ${res.statusText}`
      )
    }

    return responseData
  } catch (err) {
    console.error("Error creating guest user:", err)
    throw err
  }
}


/**
 * Updates the model for an existing chat
 */
export async function updateChatModel(chatId: string, model: string) {
  try {
    const res = await fetchClient(API_ROUTE_UPDATE_CHAT_MODEL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, model }),
    })
    const responseData = await res.json()

    if (!res.ok) {
      throw new Error(
        responseData.error ||
          `Failed to update chat model: ${res.status} ${res.statusText}`
      )
    }

    return responseData
  } catch (error) {
    console.error("Error updating chat model:", error)
    throw error
  }
}


export const getOrCreateGuestUserId = async (
  user: UserProfile | null
): Promise<string | null> => {
  if (user?.id) return user.id

  // Create a simple guest ID based on local storage
  let guestId = localStorage.getItem("guestUserId")
  
  if (!guestId) {
    // Generate a simple guest ID
    guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    localStorage.setItem("guestUserId", guestId)
    
    try {
      await createGuestUser(guestId)
    } catch (error) {
      console.error("Failed to create guest user:", error)
      return null
    }
  }

  return guestId
}
