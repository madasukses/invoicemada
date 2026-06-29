// ============================================================
//  sheets.js — Memanggil /api/sheets (proxy), bukan Google langsung
// ============================================================

const Sheets = {

  async getAll() {
    const r = await fetch("/api/sheets?action=getAll");
    if (!r.ok) {
      const e = await r.json();
      throw new Error(e.error?.message || e.error || `Error ${r.status}`);
    }
    const rows = await r.json();
    return rows.map((row, i) => ({
      rowIndex:   i + 2,
      nomor:      row[0] || "",
      klien:      row[1] || "",
      jatuhTempo: row[2] || "",
      jumlah:     parseFloat((row[3] || "0").replace(/[^\d.]/g, "")) || 0,
      status:     row[4] || "Tertunda",
      catatan:    row[5] || "",
    }));
  },

  async append(data) {
    const r = await fetch("/api/sheets?action=append", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        data.nomor, data.klien, data.jatuhTempo,
        data.jumlah, data.status, data.catatan || ""
      ]),
    });
    if (!r.ok) {
      const e = await r.json();
      throw new Error(e.error?.message || e.error || "Gagal menyimpan");
    }
  },

  async update(rowIndex, data) {
    const r = await fetch(`/api/sheets?action=update&rowIndex=${rowIndex}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        data.nomor, data.klien, data.jatuhTempo,
        data.jumlah, data.status, data.catatan || ""
      ]),
    });
    if (!r.ok) {
      const e = await r.json();
      throw new Error(e.error?.message || e.error || "Gagal mengupdate");
    }
  },

  async deleteRow(rowIndex) {
    const r = await fetch(`/api/sheets?action=delete&rowIndex=${rowIndex}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      const e = await r.json();
      throw new Error(e.error?.message || e.error || "Gagal menghapus");
    }
  },

  async nextInvoiceNo() {
    try {
      const rows  = await this.getAll();
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
