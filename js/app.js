// ============================================================
//  APP.JS — Dashboard logic
// ============================================================

Auth.requireAuth();

// ---- State ----
let allInvoices = [];
let filteredInvoices = [];

// ---- DOM refs ----
const invoiceBody  = document.getElementById("invoiceBody");
const searchInput  = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const modalOverlay = document.getElementById("modalOverlay");
const modalTitle   = document.getElementById("modalTitle");
const modalSave    = document.getElementById("modalSave");
const toast        = document.getElementById("toast");

// ---- Formatters ----
function formatRp(num) {
  return "Rp " + Number(num).toLocaleString("id-ID");
}
function formatDate(str) {
  if (!str) return "—";
  // Accepts YYYY-MM-DD
  const [y, m, d] = str.split("-");
  if (!y || !m || !d) return str;
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

// ---- Toast ----
let toastTimer;
function showToast(msg, duration = 2800) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), duration);
}

// ---- Summary cards ----
function updateCards(data) {
  const total     = data.length;
  const tertunda  = data.filter(r => r.status === "Tertunda").length;
  const lunas     = data.filter(r => r.status === "Lunas").length;
  const revenue   = data
    .filter(r => r.status === "Lunas")
    .reduce((s, r) => s + r.jumlah, 0);

  document.getElementById("cardTotal").textContent    = total;
  document.getElementById("cardTertunda").textContent = tertunda;
  document.getElementById("cardLunas").textContent    = lunas;
  document.getElementById("cardRevenue").textContent  = formatRp(revenue);
}

// ---- Render table ----
function renderTable(data) {
  if (!data.length) {
    invoiceBody.innerHTML = `<tr><td colspan="6" class="empty-row">Belum ada data tagihan.</td></tr>`;
    return;
  }
  invoiceBody.innerHTML = data.map(inv => `
    <tr data-row="${inv.rowIndex}">
      <td><span class="no-invoice">${inv.nomor}</span></td>
      <td class="klien-name">${inv.klien}</td>
      <td>${formatDate(inv.jatuhTempo)}</td>
      <td class="text-right jumlah-cell">${formatRp(inv.jumlah)}</td>
      <td>
        <span class="badge ${inv.status === 'Lunas' ? 'badge-lunas' : 'badge-tertunda'}">
          ${inv.status}
        </span>
      </td>
      <td>
        <div class="action-cell">
          <span class="act-edit" data-row="${inv.rowIndex}">Edit</span>
          <span class="act-hapus" data-row="${inv.rowIndex}">Hapus</span>
        </div>
      </td>
    </tr>
  `).join("");
}

// ---- Filter & search ----
function applyFilter() {
  const q   = searchInput.value.toLowerCase();
  const st  = filterStatus.value;
  filteredInvoices = allInvoices.filter(inv => {
    const matchQ  = !q || inv.nomor.toLowerCase().includes(q) || inv.klien.toLowerCase().includes(q);
    const matchSt = !st || inv.status === st;
    return matchQ && matchSt;
  });
  renderTable(filteredInvoices);
}

// ---- Load data ----
async function loadData() {
  invoiceBody.innerHTML = `<tr><td colspan="6" class="loading-row">Memuat data…</td></tr>`;
  try {
    allInvoices = await Sheets.getAll();
    // Sort terbaru dulu (by rowIndex desc)
    allInvoices.sort((a, b) => b.rowIndex - a.rowIndex);
    updateCards(allInvoices);
    applyFilter();
  } catch (err) {
    invoiceBody.innerHTML = `<tr><td colspan="6" class="empty-row" style="color:#D93025">
      Gagal memuat data. Cek API Key & Spreadsheet ID di config.js.<br>
      <small>${err.message}</small>
    </td></tr>`;
    showToast("❌ Gagal memuat data", 4000);
  }
}

// ---- Modal helpers ----
function openModal() { modalOverlay.classList.add("active"); }
function closeModal() { modalOverlay.classList.remove("active"); }

function clearForm() {
  document.getElementById("editRow").value   = "";
  document.getElementById("fNomor").value    = "";
  document.getElementById("fKlien").value    = "";
  document.getElementById("fJatuhTempo").value = "";
  document.getElementById("fJumlah").value   = "";
  document.getElementById("fStatus").value   = "Tertunda";
  document.getElementById("fCatatan").value  = "";
}

async function openCreateModal() {
  clearForm();
  modalTitle.textContent = "Buat Tagihan Baru";
  // Auto-generate nomor invoice
  const nextNo = await Sheets.nextInvoiceNo();
  document.getElementById("fNomor").value = nextNo;
  // Default jatuh tempo = 14 hari dari sekarang
  const due = new Date();
  due.setDate(due.getDate() + 14);
  document.getElementById("fJatuhTempo").value = due.toISOString().split("T")[0];
  openModal();
}

function openEditModal(rowIndex) {
  const inv = allInvoices.find(r => r.rowIndex === rowIndex);
  if (!inv) return;
  clearForm();
  modalTitle.textContent = "Edit Tagihan";
  document.getElementById("editRow").value       = inv.rowIndex;
  document.getElementById("fNomor").value         = inv.nomor;
  document.getElementById("fKlien").value         = inv.klien;
  document.getElementById("fJatuhTempo").value    = inv.jatuhTempo;
  document.getElementById("fJumlah").value        = inv.jumlah;
  document.getElementById("fStatus").value        = inv.status;
  document.getElementById("fCatatan").value       = inv.catatan;
  openModal();
}

// ---- Save (create / update) ----
modalSave.addEventListener("click", async () => {
  const editRow = document.getElementById("editRow").value;
  const data = {
    nomor:      document.getElementById("fNomor").value.trim(),
    klien:      document.getElementById("fKlien").value.trim(),
    jatuhTempo: document.getElementById("fJatuhTempo").value,
    jumlah:     parseFloat(document.getElementById("fJumlah").value) || 0,
    status:     document.getElementById("fStatus").value,
    catatan:    document.getElementById("fCatatan").value.trim(),
  };

  if (!data.nomor || !data.klien || !data.jatuhTempo || !data.jumlah) {
    showToast("⚠️ Lengkapi semua field wajib");
    return;
  }

  modalSave.disabled = true;
  modalSave.textContent = "Menyimpan…";

  try {
    if (editRow) {
      await Sheets.update(parseInt(editRow), data);
      showToast("✅ Tagihan berhasil diperbarui");
    } else {
      await Sheets.append(data);
      showToast("✅ Tagihan berhasil dibuat");
    }
    closeModal();
    await loadData();
  } catch (err) {
    showToast("❌ " + err.message, 4000);
  } finally {
    modalSave.disabled = false;
    modalSave.textContent = "Simpan";
  }
});

// ---- Delete ----
async function hapusInvoice(rowIndex) {
  const inv = allInvoices.find(r => r.rowIndex === rowIndex);
  if (!inv) return;
  if (!confirm(`Hapus invoice ${inv.nomor}?\nTindakan ini tidak bisa dibatalkan.`)) return;

  try {
    await Sheets.deleteRow(rowIndex);
    showToast("🗑️ Invoice berhasil dihapus");
    await loadData();
  } catch (err) {
    showToast("❌ " + err.message, 4000);
  }
}

// ---- Event delegation for table actions ----
invoiceBody.addEventListener("click", e => {
  const row = e.target.dataset.row;
  if (!row) return;
  if (e.target.classList.contains("act-edit")) openEditModal(parseInt(row));
  if (e.target.classList.contains("act-hapus")) hapusInvoice(parseInt(row));
});

// ---- Toolbar events ----
document.getElementById("btnBuat").addEventListener("click", openCreateModal);
document.getElementById("btnLogout").addEventListener("click", () => Auth.logout());
document.getElementById("btnRefresh").addEventListener("click", loadData);
document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("modalCancel").addEventListener("click", closeModal);
modalOverlay.addEventListener("click", e => { if (e.target === modalOverlay) closeModal(); });
searchInput.addEventListener("input", applyFilter);
filterStatus.addEventListener("change", applyFilter);

// ---- Init ----
loadData();
