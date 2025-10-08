import type { NextApiRequest, NextApiResponse } from "next";

type Data = { token?: string; error?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
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
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expires_in: 3600 }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({ error: `Token request failed: ${text}` });
    }

    const json = (await response.json()) as { token: string };
    return res.status(200).json({ token: json.token });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}


