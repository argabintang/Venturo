// app.js
const API_URL = 'api.php'; 
let dataTransaksi = [];
let currentUser = null; 

// Format Uang Rupiah Otomatis
const formatRp = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

// ==========================================
// 1. OTENTIKASI (LOGIN & REGISTER)
// ==========================================
let isLoginMode = true;
document.getElementById('toggle-auth').addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? "Login Venturo" : "Daftar Akun Baru";
    document.getElementById('auth-btn').innerText = isLoginMode ? "Masuk" : "Daftar Sekarang";
    document.getElementById('toggle-auth').innerText = isLoginMode ? "Daftar di sini" : "Login di sini";
});

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = { username: document.getElementById('auth-username').value, password: document.getElementById('auth-password').value };
    try {
        const res = await fetch(`${API_URL}?action=${isLoginMode ? 'login' : 'register'}`, { method: 'POST', body: JSON.stringify(payload) });
        const data = await res.json();
        
        if (data.status === 'success') {
            if (isLoginMode) {
                // Simpan Sesi Login di Browser
                localStorage.setItem('venturo_user', JSON.stringify({ id: data.user_id, username: data.username }));
                checkAuth();
            } else { 
                alert(data.message); 
                document.getElementById('toggle-auth').click(); 
            }
        } else { alert(data.message); }
    } catch (err) { alert("Server Error: Pastikan Laragon / Database aktif."); }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('venturo_user');
    checkAuth();
});

function checkAuth() {
    const userSession = localStorage.getItem('venturo_user');
    if (userSession) {
        currentUser = JSON.parse(userSession);
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        document.getElementById('user-greeting').innerText = `Halo, ${currentUser.username}!`;
        
        // Atur input penanggalan ke hari ini
        document.getElementById('tanggal').value = new Date().toISOString().split('T')[0];
        document.getElementById('filter-bulan').value = new Date().toISOString().slice(0, 7);
        
        loadSettings(); // Terapkan tema
        loadData();     // Tarik data
    } else {
        currentUser = null;
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display = 'none';
    }
}

// ==========================================
// 2. NAVIGASI TAB MENU PISAH
// ==========================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll(`button[onclick="switchTab('${tabId}')"]`).forEach(btn => btn.classList.add('active'));
}

// ==========================================
// 3. FITUR UTAMA (CRUD & DASHBOARD)
// ==========================================
async function loadData() {
    if (!currentUser) return;
    try {
        const response = await fetch(`${API_URL}?action=get_transaksi&user_id=${currentUser.id}`);
        dataTransaksi = await response.json();
        renderUI();
    } catch (e) { console.error("Error loading data", e); }
}

function renderUI() {
    const bulanDipilih = document.getElementById('filter-bulan').value;
    const tbody = document.getElementById('tabel-data');
    tbody.innerHTML = '';
    
    let tPengeluaran = 0, tPendapatan = 0;

    dataTransaksi.forEach(row => {
        // Filter berdasarkan bulan
        if (!bulanDipilih || row.tanggal.substring(0, 7) === bulanDipilih) {
            const total = row.jumlah * row.harga;
            
            // Hitung Dashboard
            if (row.tipe === 'masuk') tPengeluaran += total;
            else tPendapatan += total;

            // Cetak Baris Tabel
            tbody.innerHTML += `
                <tr>
                    <td>${row.tanggal}</td>
                    <td><strong>${row.nama_barang}</strong></td>
                    <td style="text-align: center;"><span class="badge ${row.tipe}">${row.tipe === 'masuk' ? 'Masuk' : 'Terjual'}</span></td>
                    <td style="text-align: right;"><strong>${formatRp(total)}</strong><br><small style="color:var(--text-muted)">${row.jumlah} x ${formatRp(row.harga)}</small></td>
                    <td style="text-align: center;">
                        <button class="btn-action btn-edit" onclick="openEditModal(${row.id})" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn-action btn-delete" onclick="deleteData(${row.id})" title="Hapus"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
        }
    });

    document.getElementById('dash-pengeluaran').innerText = formatRp(tPengeluaran);
    document.getElementById('dash-pendapatan').innerText = formatRp(tPendapatan);
    document.getElementById('dash-laba').innerText = formatRp(tPendapatan - tPengeluaran);
}

// Otomatis refresh jika filter bulan diganti
document.getElementById('filter-bulan').addEventListener('change', renderUI);

// TAMBAH DATA BARU
document.getElementById('form-transaksi').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        user_id: currentUser.id,
        tanggal: document.getElementById('tanggal').value,
        tipe: document.getElementById('tipe').value,
        nama_barang: document.getElementById('nama_barang').value,
        jumlah: document.getElementById('jumlah').value,
        harga: document.getElementById('harga').value,
    };
    await fetch(`${API_URL}?action=add_transaksi`, { method: 'POST', body: JSON.stringify(payload) });
    document.getElementById('form-transaksi').reset();
    document.getElementById('tanggal').value = new Date().toISOString().split('T')[0];
    alert('Sukses! Data telah disimpan.');
    switchTab('data'); // Otomatis pindah ke halaman data
    loadData();
});

// HAPUS DATA
async function deleteData(id) {
    if(confirm("Apakah Anda yakin ingin menghapus catatan transaksi ini? Data tidak dapat dikembalikan!")) {
        await fetch(`${API_URL}?action=delete_transaksi`, { method: 'POST', body: JSON.stringify({ id, user_id: currentUser.id }) });
        loadData();
    }
}

// EDIT DATA (Buka Modal & Tarik Data Lama)
function openEditModal(id) {
    const row = dataTransaksi.find(d => d.id == id);
    if(row) {
        document.getElementById('edit-id').value = row.id;
        document.getElementById('edit-tanggal').value = row.tanggal;
        document.getElementById('edit-tipe').value = row.tipe;
        document.getElementById('edit-nama_barang').value = row.nama_barang;
        document.getElementById('edit-jumlah').value = row.jumlah;
        document.getElementById('edit-harga').value = row.harga;
        document.getElementById('edit-modal').style.display = 'flex';
    }
}

function closeEditModal() { 
    document.getElementById('edit-modal').style.display = 'none'; 
}

// UPDATE DATA 
document.getElementById('form-edit').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        id: document.getElementById('edit-id').value,
        user_id: currentUser.id,
        tanggal: document.getElementById('edit-tanggal').value,
        tipe: document.getElementById('edit-tipe').value,
        nama_barang: document.getElementById('edit-nama_barang').value,
        jumlah: document.getElementById('edit-jumlah').value,
        harga: document.getElementById('edit-harga').value,
    };
    await fetch(`${API_URL}?action=update_transaksi`, { method: 'POST', body: JSON.stringify(payload) });
    closeEditModal();
    alert("Data berhasil diperbarui!");
    loadData();
});

// ==========================================
// 4. BACKUP DATA & EXCEL EXPORT
// ==========================================
document.getElementById('btn-export-csv').addEventListener('click', () => {
    if(dataTransaksi.length === 0) return alert("Belum ada data untuk diekspor!");
    let csv = "Tanggal,Jenis,Nama Barang,Jumlah,Harga Satuan,Total Pembayaran\n";
    dataTransaksi.forEach(row => {
        csv += `${row.tanggal},${row.tipe === 'masuk'?'Barang Masuk':'Terjual'},"${row.nama_barang}",${row.jumlah},${row.harga},${row.jumlah*row.harga}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Laporan_Venturo_${currentUser.username}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
});

document.getElementById('btn-backup-db').addEventListener('click', async () => {
    try {
        const res = await fetch(`${API_URL}?action=get_backup&user_id=${currentUser.id}`);
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Backup_Database_Full_${currentUser.username}_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    } catch(err) { alert("Gagal mengambil backup dari database server."); }
});

// ==========================================
// 5. PENGATURAN TEMA APLIKASI
// ==========================================
const modalSet = document.getElementById('settings-modal');
document.getElementById('btn-settings').onclick = () => modalSet.style.display = 'flex';
document.getElementById('close-settings').onclick = () => modalSet.style.display = 'none';
window.onclick = (e) => { if (e.target === modalSet) modalSet.style.display = 'none'; }

function saveSettings(key, value) {
    let s = JSON.parse(localStorage.getItem(`venturo_settings_${currentUser.id}`)) || {};
    s[key] = value;
    localStorage.setItem(`venturo_settings_${currentUser.id}`, JSON.stringify(s));
}

function loadSettings() {
    let s = JSON.parse(localStorage.getItem(`venturo_settings_${currentUser.id}`)) || { theme: 'light', color: '#1e40af' };
    
    document.getElementById('toggle-dark-mode').checked = (s.theme === 'dark');
    if(s.theme === 'dark') document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    
    document.documentElement.style.setProperty("--primary-color", s.color);
}

document.getElementById('toggle-dark-mode').onchange = (e) => {
    const theme = e.target.checked ? 'dark' : 'light';
    theme === 'dark' ? document.documentElement.setAttribute("data-theme", "dark") : document.documentElement.removeAttribute("data-theme");
    saveSettings('theme', theme);
};

document.querySelectorAll('.color-circle').forEach(circle => {
    circle.onclick = (e) => {
        const color = e.target.getAttribute('data-color');
        document.documentElement.style.setProperty("--primary-color", color);
        saveSettings('color', color);
    }
});

// Eksekusi Pengecekan Awal
checkAuth();