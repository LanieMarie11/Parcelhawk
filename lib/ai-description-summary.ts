import { GoogleAuth } from "google-auth-library"
import { buildCompareAllListingsSummaryPrompt } from "@/lib/prompt"
import type { CompareAllListingsSummaryItem } from "@/lib/prompt"

const DEFAULT_SUMMARY = "No summary available."

function compactText(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

export async function summarizeComparedListingsWithLlm(
  items: CompareAllListingsSummaryItem[]
): Promise<string> {
  if (items.length === 0) return DEFAULT_SUMMARY

  const allEmpty = items.every((item) => !item.description.trim())
  if (allEmpty) return DEFAULT_SUMMARY

  const rawServiceAccount = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY
  if (!rawServiceAccount) return DEFAULT_SUMMARY

  const serviceAccount = JSON.parse(rawServiceAccount) as {
    project_id?: string
    client_email?: string
    private_key?: string
  }

  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    return DEFAULT_SUMMARY
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
  if (!token.token) return DEFAULT_SUMMARY

  const prompt = buildCompareAllListingsSummaryPrompt(items)

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/${location}/publishers/google/models/${modelId}:generateContent`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
    }),
  })

  if (!res.ok) return DEFAULT_SUMMARY

  const payload = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const rawOutput = payload.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawOutput) return DEFAULT_SUMMARY

  const summary = compactText(rawOutput)
  return summary || DEFAULT_SUMMARY
}
