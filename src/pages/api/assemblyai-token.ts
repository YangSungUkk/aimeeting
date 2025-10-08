import type { NextApiRequest, NextApiResponse } from "next";

type Data = { token?: string; error?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    // 간단한 진단용: GET /api/assemblyai-token?debug=1 → { token?: undefined, error?: undefined } + 200/500
    if (req.method === "GET" && req.query?.debug === "1") {
      const hasEnv = !!process.env.ASSEMBLYAI_API_KEY;
      // 민감 값은 절대 노출하지 않음
      return res.status(hasEnv ? 200 : 500).json({ error: hasEnv ? undefined : "Missing ASSEMBLYAI_API_KEY" });
    }
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing ASSEMBLYAI_API_KEY" });
  }

  try {
    const response = await fetch("https://api.assemblyai.com/v2/realtime/token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expires_in: 3600 }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({ error: `Token request failed (${response.status}): ${text.slice(0, 160)}` });
    }

    const json = (await response.json()) as { token: string };
    return res.status(200).json({ token: json.token });
  } catch (e) {
    const message = (e as { message?: string })?.message || "Unknown error";
    return res.status(500).json({ error: message });
  }
}


