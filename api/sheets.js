// api/sheets.js — Vercel Serverless Function
// API Key tersimpan di environment variable, tidak kelihatan di browser

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const API_KEY        = process.env.GOOGLE_API_KEY;
const SHEET_NAME     = process.env.SHEET_NAME || "Sheet1";
const BASE           = "https://sheets.googleapis.com/v4/spreadsheets";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action } = req.query;

  try {
    // ── GET ALL ──────────────────────────────────────────────
    if (req.method === "GET" && action === "getAll") {
      const range = encodeURIComponent(`${SHEET_NAME}!A2:F1000`);
      const url   = `${BASE}/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;
      const r     = await fetch(url);
      const data  = await r.json();
      if (!r.ok) return res.status(r.status).json(data);
      return res.status(200).json(data.values || []);
    }

    // ── APPEND ───────────────────────────────────────────────
    if (req.method === "POST" && action === "append") {
      const range = encodeURIComponent(`${SHEET_NAME}!A:F`);
      const url   = `${BASE}/${SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED&key=${API_KEY}`;
      const r     = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: [req.body] }),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);
      return res.status(200).json({ ok: true });
    }

    // ── UPDATE ───────────────────────────────────────────────
    if (req.method === "PUT" && action === "update") {
      const { rowIndex } = req.query;
      const range = encodeURIComponent(`${SHEET_NAME}!A${rowIndex}:F${rowIndex}`);
      const url   = `${BASE}/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED&key=${API_KEY}`;
      const r     = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: [req.body] }),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);
      return res.status(200).json({ ok: true });
    }

    // ── DELETE ───────────────────────────────────────────────
    if (req.method === "DELETE" && action === "delete") {
      const { rowIndex } = req.query;

      // Ambil numeric sheetId
      const metaUrl = `${BASE}/${SPREADSHEET_ID}?key=${API_KEY}`;
      const metaR   = await fetch(metaUrl);
      const meta    = await metaR.json();
      if (!metaR.ok) return res.status(metaR.status).json(meta);

      const sheetObj = meta.sheets.find(s => s.properties.title === SHEET_NAME);
      if (!sheetObj) return res.status(404).json({ error: `Tab "${SHEET_NAME}" tidak ditemukan` });

      const url = `${BASE}/${SPREADSHEET_ID}:batchUpdate?key=${API_KEY}`;
      const r   = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{
            deleteDimension: {
              range: {
                sheetId:    sheetObj.properties.sheetId,
                dimension:  "ROWS",
                startIndex: parseInt(rowIndex) - 1,
                endIndex:   parseInt(rowIndex),
              }
            }
          }]
        }),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action" });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
