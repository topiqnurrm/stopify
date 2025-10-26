# 🖼️ Supabase Image Repository

Repositori ini berfungsi sebagai **penyimpanan referensi gambar (image storage)** yang digunakan dalam project utama berbasis **Supabase**.  
Semua gambar disimpan melalui **fitur *Issues* GitHub**, bukan di dalam folder repo, agar lebih ringan dan mudah diatur.

---

## 📦 Tujuan
Repository ini dibuat untuk:
- Menyimpan dan mengelola **URL publik gambar** yang dibutuhkan aplikasi Supabase (seperti gambar destinasi, profil, ikon, dan konten visual lain).  
- Memanfaatkan **GitHub Issue Attachment** sebagai sumber URL permanen (CDN sederhana).  
- Menjaga agar **kode utama** di repository utama tetap bersih dari file media.  
- Mendukung dokumentasi visual dan integrasi otomatis dengan database Supabase.

---

## 🧩 Struktur Isi
Setiap *issue* berisi sekumpulan gambar yang mewakili kategori atau wilayah tertentu, misalnya:
- **Issue: Banten** → Gambar destinasi wisata di Provinsi Banten  
- **Issue: Jawa Timur** → Gambar wisata di Jawa Timur  
- **Issue: Sumatera Utara** → Gambar wisata di Sumatera Utara  
- **Issue: Nusa Tenggara Timur** → Gambar wisata di NTT  
- dan seterusnya.

---

## 🔗 Cara Menggunakan
1. Buka tab **Issues** pada repository ini.  
2. Pilih *issue* sesuai kategori (misalnya *Jawa Timur*).  
3. Klik kanan pada gambar → **Copy image address**.  
4. Gunakan URL tersebut di project Supabase kamu, misalnya:

   ```sql
   INSERT INTO destinations (name, image_url)
   VALUES ('Danau Toba', 'https://github.com/user-attachments/assets/xxxxxx.../image.jpg');
