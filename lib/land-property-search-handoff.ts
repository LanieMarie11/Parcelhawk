const STORAGE_KEY = "parcel:land-property-pending-prompt"

export function stashLandPropertySearchPrompt(prompt: string): void {
  const t = prompt.trim()
  if (!t || typeof window === "undefined") return
  try {
    sessionStorage.setItem(STORAGE_KEY, t)
  } catch {
    // private mode / quota
  }
}

/** Read trimmed prompt without removing (survives React Strict Mode remounts). */
export function peekLandPropertySearchPrompt(): string {
  if (typeof window === "undefined") return ""
  try {
    return sessionStorage.getItem(STORAGE_KEY)?.trim() ?? ""
  } catch {
    return ""
  }
}

export function clearLandPropertySearchPrompt(): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
