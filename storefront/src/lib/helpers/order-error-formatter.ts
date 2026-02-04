type ErrorLike = {
  message?: unknown
}

export const orderErrorFormatter = (error: unknown) => {
  const message = (error as ErrorLike)?.message

  if (message === "NEXT_REDIRECT") {
    return null
  }

  if (
    typeof message === "string" &&
    message.includes("Not enough stock available")
  ) {
    return "Not enough stock available"
  }

  return typeof message === "string" ? message : "An unknown error occurred"
}
