import { GoogleAuth } from "google-auth-library"
import { buildCompareListingFeaturesPrompt } from "@/lib/prompt"

export type InferredListingFeatures = {
  roadAccess: string
  floodZone: string
  utilities: string
}

const DEFAULT_INFERRED_FEATURES: InferredListingFeatures = {
  roadAccess: "Not provided",
  floodZone: "Not provided",
  utilities: "Not provided",
}

function stripMarkdownCodeFence(text: string): string {
  let value = text.trim()
  const openFence = value.match(/^```(?:json)?\s*\n?/i)
  if (openFence) value = value.slice(openFence[0].length)
  const closeFence = value.match(/\n?```\s*$/)
  if (closeFence) value = value.slice(0, -closeFence[0].length)
  return value.trim()
}

export function descriptionToText(description: unknown): string {
  if (typeof description === "string") return description.trim()
  if (Array.isArray(description)) {
    return description
      .filter((line): line is string => typeof line === "string" && line.trim().length > 0)
      .join("\n")
      .trim()
  }
  return ""
}

export async function inferFeaturesFromDescriptionWithLlm(
  descriptionText: string
): Promise<InferredListingFeatures> {
  if (!descriptionText) return DEFAULT_INFERRED_FEATURES

  const rawServiceAccount = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY
  if (!rawServiceAccount) return DEFAULT_INFERRED_FEATURES

  const serviceAccount = JSON.parse(rawServiceAccount) as {
    project_id?: string
    client_email?: string
    private_key?: string
  }
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    return DEFAULT_INFERRED_FEATURES
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
  if (!token.token) return DEFAULT_INFERRED_FEATURES

  const prompt = buildCompareListingFeaturesPrompt(descriptionText)

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/${location}/publishers/google/models/${modelId}:generateContent`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 180 },
    }),
  })

  if (!res.ok) return DEFAULT_INFERRED_FEATURES

  const payload = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const rawOutput = payload.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawOutput) return DEFAULT_INFERRED_FEATURES

  try {
    const parsed = JSON.parse(stripMarkdownCodeFence(rawOutput)) as Partial<InferredListingFeatures>
    return {
      roadAccess: parsed.roadAccess?.trim() || "Not provided",
      floodZone: parsed.floodZone?.trim() || "Not provided",
      utilities: parsed.utilities?.trim() || "Not provided",
    }
  } catch {
    return DEFAULT_INFERRED_FEATURES
  }
}
