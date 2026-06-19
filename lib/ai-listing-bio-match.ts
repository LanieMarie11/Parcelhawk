import { GoogleAuth } from "google-auth-library"
import { descriptionToText } from "@/lib/ai-compare"
import { buildListingBioMatchPrompt } from "@/lib/prompt"

function stripMarkdownCodeFence(text: string): string {
  let value = text.trim()
  const openFence = value.match(/^```(?:json)?\s*\n?/i)
  if (openFence) value = value.slice(openFence[0].length)
  const closeFence = value.match(/\n?```\s*$/)
  if (closeFence) value = value.slice(0, -closeFence[0].length)
  return value.trim()
}

/** Plain text for LLM prompts (buyer profile bio may contain simple HTML). */
export function userBioToText(value: string | null | undefined): string {
  if (!value?.trim()) return ""
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function clampScore(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(num)) return null
  return Math.min(100, Math.max(0, Math.round(num)))
}

/**
 * 0–100 AI score for listing description vs buyer profile bio (`users.about`).
 * Returns null when bio or description is empty, or Vertex is unavailable.
 */
export async function scoreListingBioMatchWithLlm(
  userBio: string | null | undefined,
  listingDescription: unknown,
): Promise<number | null> {
  const bioText = userBioToText(userBio)
  const descriptionText = descriptionToText(listingDescription)

  if (!bioText || !descriptionText) return null

  const rawServiceAccount = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY
  if (!rawServiceAccount) return null

  const serviceAccount = JSON.parse(rawServiceAccount) as {
    project_id?: string
    client_email?: string
    private_key?: string
  }
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    return null
  }

  const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1"
  const modelId = process.env.VERTEX_LLM_MODEL_ID ?? "gemini-2.0-flash-001"

  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    projectId: serviceAccount.project_id,
    credentials: {
      client_email: serviceAccount.client_email,
      private_key: serviceAccount.private_key,
    },
  })
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  if (!token.token) return null

  const prompt = buildListingBioMatchPrompt(bioText, descriptionText)

  const generationConfig: Record<string, unknown> = {
    temperature: 0,
    maxOutputTokens: 128,
    responseMimeType: "application/json",
  }
  if (modelId.includes("2.5")) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 }
  }

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/${location}/publishers/google/models/${modelId}:generateContent`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    }),
  })

  if (!res.ok) return null

  const payload = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const rawOutput = payload.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawOutput) return null

  try {
    const parsed = JSON.parse(stripMarkdownCodeFence(rawOutput)) as { matchScore?: unknown }
    return clampScore(parsed.matchScore)
  } catch {
    return null
  }
}
