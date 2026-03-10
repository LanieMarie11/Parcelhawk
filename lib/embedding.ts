/**
 * Vertex AI text embedding (768 dimensions) for semantic search.
 * Uses text-embedding-005 to match land_listing_embeddings schema.
 * Auth: GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY (one-line JSON service account).
 */
import { GoogleAuth } from "google-auth-library";

const EMBEDDING_DIMENSIONS = 768;
const MODEL_ID = "text-embedding-005";
const TASK_TYPE = "RETRIEVAL_QUERY";

const rawServiceAccount = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY;
if (!rawServiceAccount) {
  throw new Error("GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY is not set");
}

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  [key: string]: unknown;
};

const serviceAccount = JSON.parse(rawServiceAccount) as ServiceAccount;
const projectId = serviceAccount.project_id;

/**
 * Returns a 768-dimensional embedding vector for the given text.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Text cannot be empty");

  const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";

  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    projectId,
    credentials: {
      client_email: serviceAccount.client_email,
      private_key: serviceAccount.private_key,
    },
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Failed to get Vertex AI access token");

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${MODEL_ID}:predict`;
  const body = {
    instances: [{ content: trimmed, task_type: TASK_TYPE }],
    parameters: { outputDimensionality: EMBEDDING_DIMENSIONS },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Vertex AI embedding failed: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as {
    predictions?: Array<{
      embeddings?: { values?: number[] };
    }>;
  };
  const values = data.predictions?.[0]?.embeddings?.values;
  if (!values || !Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${values?.length ?? 0}`);
  }
  return values;
}
