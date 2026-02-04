type ErrorWithResponse = {
  response?: {
    data?: { message?: string } | string
    status?: number
    headers?: unknown
  }
  request?: unknown
  message?: string
  config?: {
    url?: string
    baseURL?: string
  }
}

export default function medusaError(error: unknown): never {
  const err = error as ErrorWithResponse

  if (err.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const u = new URL(err.config?.url ?? "", err.config?.baseURL)
    console.error("Resource:", u.toString())
    console.error("Response data:", err.response.data)
    console.error("Status code:", err.response.status)
    console.error("Headers:", err.response.headers)

    // Extracting the error message from the response data
    const message =
      (typeof err.response.data === "object" && err.response.data?.message) ||
      err.response.data

    throw new Error(message.charAt(0).toUpperCase() + message.slice(1) + ".")
  } else if (err.request) {
    // The request was made but no response was received
    throw new Error("No response received: " + String(err.request))
  } else {
    // Something happened in setting up the request that triggered an Error
    throw new Error(
      "Error setting up the request: " + (err.message ?? "Unknown")
    )
  }
}
