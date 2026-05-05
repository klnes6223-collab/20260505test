import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL || "http://localhost:3000"}/auth/callback`
  );

  // Auth URL Generation
  app.get("/api/auth/google/url", (req, res) => {
    const scopes = [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
      "profile",
      "email"
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent"
    });

    res.json({ url });
  });

  // OAuth Callback
  app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send("No code provided");
    }

    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      
      // We store the refresh token in a cookie. 
      // In a real app, you'd store this in a database linked to a local user session.
      res.cookie("google_tokens", JSON.stringify(tokens), {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      res.send(`
        <html>
          <body style="background: #0a0a0c; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
            <div style="text-align: center;">
              <h2 style="color: #6366f1;">連結成功！</h2>
              <p>正在返回工具...</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("OAuth Error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // Check auth status
  app.get("/api/auth/google/status", (req, res) => {
    const tokens = req.cookies.google_tokens;
    res.json({ isAuthenticated: !!tokens });
  });

  // Logout
  app.post("/api/auth/google/logout", (req, res) => {
    res.clearCookie("google_tokens", {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });
    res.json({ success: true });
  });

  // Export to Sheets
  app.post("/api/export/google-sheets", async (req, res) => {
    const tokensStr = req.cookies.google_tokens;
    if (!tokensStr) {
      return res.status(401).json({ error: "Not authenticated with Google" });
    }

    try {
      const tokens = JSON.parse(tokensStr);
      oauth2Client.setCredentials(tokens);

      const sheets = google.sheets({ version: "v4", auth: oauth2Client });
      const { title, data } = req.body; // data: string[][] representing groups

      // 1. Create a new Spreadsheet
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: title || `分組結果_${new Date().toLocaleString()}`
          }
        }
      });

      const spreadsheetId = spreadsheet.data.spreadsheetId;
      if (!spreadsheetId) throw new Error("Failed to create spreadsheet");

      // 2. Format data for sheet
      // Expected structure: [["組別", "成員"]]
      const values = [["組別", "成員"]];
      (data as string[][]).forEach((group, i) => {
        group.forEach(name => {
          values.push([`第 ${i + 1} 組`, name]);
        });
      });

      // 3. Update the sheet content
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Sheet1!A1",
        valueInputOption: "RAW",
        requestBody: {
          values
        }
      });

      res.json({ 
        success: true, 
        spreadsheetId, 
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}` 
      });
    } catch (error) {
      console.error("Sheets Export Error:", error);
      res.status(500).json({ error: "Failed to export to Google Sheets" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
