// pages/api/verify.ts
import { SiweMessage } from "siwe";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, signature } = req.body;
    const siweMessage = new SiweMessage(message);
    const fields = await siweMessage.validate(signature);

    // Here you would typically create a session or JWT for the user
    // For this example, we'll just send back a success response
    res.json({ ok: true, fields });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
}
