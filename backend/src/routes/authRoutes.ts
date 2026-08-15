import { Router } from "express";
import { OAuth2Client } from "google-auth-library";

const router = Router();

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

// Start Google Login
router.get("/google", (_req, res) => {
  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "openid",
      "email",
      "profile",
    ],
    prompt: "select_account",
  });

  res.redirect(url);
});

// Google callback
router.get("/google/callback", async (req, res) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        message: "Google authorization code missing",
      });
    }

    const { tokens } = await client.getToken(code);

    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(401).json({
        message: "Unable to get Google user information",
      });
    }

    const user = {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
    };

    console.log("✅ Google user:", user);

    // Temporary: redirect with user data.
    // We'll replace this with proper session/JWT handling next.
    const params = new URLSearchParams({
      name: user.name || "",
      email: user.email || "",
      picture: user.picture || "",
    });

    res.redirect(
      `${process.env.FRONTEND_URL}/dashboard?${params.toString()}`
    );
  } catch (error) {
    console.error("❌ Google OAuth error:", error);

    res.status(500).json({
      message: "Google authentication failed",
    });
  }
});

export default router;