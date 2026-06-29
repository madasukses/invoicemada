// ============================================================
//  SHEETS.JS — Google Sheets API v4 wrapper
//
//  Struktur kolom di Sheet (Row 1 = header):
//  A: No Invoice | B: Klien | C: Jatuh Tempo | D: Jumlah | E: Status | F: Catatan
// ============================================================

const Sheets = {
  BASE: "https://sheets.googleapis.com/v4/spreadsheets",

  get sheetId()  { return CONFIG.SPREADSHEET_ID; },
  get apiKey()   { return CONFIG.API_KEY; },
  get sheet()    { return CONFIG.SHEET_NAME; },

  // Baca semua data (skip row header)
  async getAll() {
    const range = encodeURIComponent(`${this.sheet}!A2:F1000`);
    const url = `${this.BASE}/${this.sheetId}/values/${range}?key=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
    const data = await res.json();
    const rows = data.values || [];
    return rows.map((r, i) => ({
      rowIndex: i + 2, // 1-based, +1 for header
      nomor:      r[0] || "",
      klien:      r[1] || "",
      jatuhTempo: r[2] || "",
      jumlah:     parseFloat((r[3] || "0").replace(/[^\d.]/g, "")) || 0,
      status:     r[4] || "Tertunda",
      catatan:    r[5] || "",
    }));
  },

  // Tambah baris baru
  async append(data) {
    const range = encodeURIComponent(`${this.sheet}!A:F`);
    const url = `${this.BASE}/${this.sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&key=${this.apiKey}`;
    const body = {
      values: [[
        data.nomor,
        data.klien,
        data.jatuhTempo,
        data.jumlah,
        data.status,
        data.catatan || ""
      ]]
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Gagal menyimpan data");
    }
    return await res.json();
  },

  // Update baris berdasarkan rowIndex (1-based)
  async update(rowIndex, data) {
    const range = encodeURIComponent(`${this.sheet}!A${rowIndex}:F${rowIndex}`);
    const url = `${this.BASE}/${this.sheetId}/values/${range}?valueInputOption=USER_ENTERED&key=${this.apiKey}`;
    const body = {
      values: [[
        data.nomor,
        data.klien,
        data.jatuhTempo,
        data.jumlah,
        data.status,
        data.catatan || ""
      ]]
    };
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Gagal mengupdate data");
    }
    return await res.json();
  },

  // Hapus baris dengan mengosongkan isinya, lalu shift up pakai batchUpdate
  async deleteRow(rowIndex) {
    // Perlu spreadsheetId numeric untuk batchUpdate — ambil dulu
    const metaUrl = `${this.BASE}/${this.sheetId}?key=${this.apiKey}`;
    const metaRes = await fetch(metaUrl);
    if (!metaRes.ok) throw new Error("Gagal ambil metadata sheet");
    const meta = await metaRes.json();

    // Cari sheetId (numeric) berdasarkan nama tab
    const sheetObj = meta.sheets.find(
      s => s.properties.title === this.sheet
    );
    if (!sheetObj) throw new Error(`Tab "${this.sheet}" tidak ditemukan`);
    const numericSheetId = sheetObj.properties.sheetId;

    const url = `${this.BASE}/${this.sheetId}:batchUpdate?key=${this.apiKey}`;
    const body = {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: numericSheetId,
            dimension: "ROWS",
            startIndex: rowIndex - 1, // 0-based
            endIndex: rowIndex        // exclusive
          }
        }
      }]
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Gagal menghapus baris");
    }
    return await res.json();
  },

  // Generate nomor invoice berikutnya
  async nextInvoiceNo() {
    try {
      const rows = await this.getAll();
      const year  = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, "0");
      const prefix = `${CONFIG.INVOICE_PREFIX}-${year}-${month}-`;
      const nums = rows
        .map(r => r.nomor)
        .filter(n => n.startsWith(prefix))
        .map(n => parseInt(n.replace(prefix, "")) || 0);
      const next = nums.length ? Math.max(...nums) + 1 : 1;
      return `${prefix}${String(next).padStart(4, "0")}`;
    } catch {
      return `${CONFIG.INVOICE_PREFIX}-${new Date().getFullYear()}-01-0001`;
    }
  }
};
