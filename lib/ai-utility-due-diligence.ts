import { GoogleAuth } from "google-auth-library"
import {
  buildUtilityDueDiligencePrompt,
  type UtilityDueDiligencePromptParams,
} from "@/lib/prompt/utility"

export async function runUtilityDueDiligenceWithLlm(
  params: UtilityDueDiligencePromptParams
): Promise<string | null> {
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
  const prompt = buildUtilityDueDiligencePrompt(params)

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

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/${location}/publishers/google/models/${modelId}:generateContent`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
    }),
  })

  if (!res.ok) return null

  const payload = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const report = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  return report || null
}
