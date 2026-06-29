# Tagihan App

Web app manajemen invoice sederhana. Login → Google Sheets sebagai database → deploy ke Vercel.

---

## Struktur File

```
tagihan/
├── index.html          ← Halaman login
├── dashboard.html      ← Halaman utama
├── vercel.json         ← Konfigurasi Vercel
├── css/
│   └── style.css
└── js/
    ├── config.js       ← ⚠️ Edit ini dulu!
    ├── auth.js
    ├── sheets.js
    └── app.js
```

---

## Setup: 3 Langkah

### 1. Siapkan Google Sheet

1. Buka [Google Sheets](https://sheets.google.com), buat spreadsheet baru
2. Beri nama tab sheet: **Tagihan** (atau sesuaikan di `config.js`)
3. Buat header di **Row 1**:

   | A | B | C | D | E | F |
   |---|---|---|---|---|---|
   | No Invoice | Klien | Jatuh Tempo | Jumlah | Status | Catatan |

4. Salin **Spreadsheet ID** dari URL:
   ```
   https://docs.google.com/spreadsheets/d/[INI_SPREADSHEET_ID]/edit
   ```

### 2. Buat Google API Key

1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Buat project baru (atau pakai yang ada)
3. Aktifkan **Google Sheets API**: APIs & Services → Enable APIs → cari "Sheets"
4. Buat API Key: APIs & Services → Credentials → Create Credentials → API Key
5. (Opsional tapi disarankan) Batasi key: Application restrictions → HTTP referrers → tambah domain Vercel kamu
6. **Penting:** Agar bisa write (tambah/edit/hapus), sheet harus **publik** atau share ke "Anyone with the link" dengan akses **Editor**
   - Buka Google Sheet → Share → Change to Anyone with the link → **Editor**

### 3. Edit `config.js`

```js
const CONFIG = {
  USERNAME:       "admin",          // ganti username
  PASSWORD:       "passwordkamu",   // ganti password

  SPREADSHEET_ID: "abc123...",      // dari URL Google Sheet
  API_KEY:        "AIza...",        // dari Google Cloud

  SHEET_NAME:     "Tagihan",        // nama tab sheet
  INVOICE_PREFIX: "SA-INV",         // prefix nomor invoice
};
```

---

## Deploy ke Vercel

```bash
# Install Vercel CLI (sekali saja)
npm i -g vercel

# Masuk ke folder project
cd tagihan

# Deploy
vercel

# Ikuti langkah di terminal, pilih "No" untuk existing project
```

Atau: drag & drop folder ke [vercel.com/new](https://vercel.com/new)

---

## Catatan Keamanan

- Login ini **frontend-only** — cocok untuk penggunaan pribadi
- Jangan share link app ke publik kalau data invoice bersifat sensitif
- Untuk keamanan lebih, pertimbangkan Supabase Auth di versi berikutnya

---

## Troubleshooting

| Error | Solusi |
|-------|--------|
| "Gagal memuat data" | Cek API Key dan Spreadsheet ID di config.js |
| Data muncul tapi tidak bisa edit/hapus | Pastikan sharing Google Sheet di-set ke Editor |
| 403 Forbidden | API Key belum diaktifkan atau Sheets API belum di-enable |
| Data tidak muncul setelah tambah | Refresh manual (tombol ↻) atau tunggu beberapa detik |
