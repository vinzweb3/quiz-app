# Siapa Ingin Jadi Miliarder — Kuis Online

Kuis gaya "Who Wants to Be a Millionaire". Soal diambil dari Supabase, 30 soal per sesi (random dari 600 soal), tiap soal punya batas waktu **30 detik**. Begitu salah jawab (atau waktu habis) → langsung **game over**, hadiah yang dibawa pulang sesuai milestone terakhir yang berhasil dilewati. Pemain bisa submit nama buat masuk leaderboard (tanpa perlu login), lengkap dengan "definisi" nyeleneh sesuai nominal hadiah dan tombol share ke X/WhatsApp.

## 1. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor** → New query → copy-paste isi file `supabase/schema.sql` → Run.
   - Ini bikin tabel `questions` (soal, dengan kolom `difficulty`) dan `scores` (leaderboard).
3. Buka **SQL Editor** lagi → New query → copy-paste isi file `supabase/seed_questions.sql` → Run.
   - Ini ngisi **600 soal** ke tabel `questions`: 150 soal easy, 150 medium, 150 hard, 150 very_hard. Topiknya variatif -- pop culture, gaming, musik, teknologi, olahraga kekinian, dan hiburan -- bukan soal sejarah/hafalan tanggal doang.
   - File ini agak besar (~600 baris insert), tunggu sampai selesai jalan.
4. Buka **Project Settings → API**, catat:
   - `Project URL` → ini `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → ini `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Mau tambah/edit soal sendiri? Lewat **Table Editor → questions**. Kolom:
   - `question`: teks soal
   - `choices`: array JSON 4 pilihan, contoh `["Jakarta","Bandung","Surabaya","Medan"]`
   - `correct_index`: index jawaban benar (0 = pilihan pertama, dst)
   - `difficulty`: salah satu dari `easy`, `medium`, `hard`, `very_hard`

## 2. Jalankan lokal (opsional, buat tes dulu)

```bash
npm install
cp .env.local.example .env.local
# isi .env.local dengan URL & anon key dari Supabase
npm run dev
```

Buka `http://localhost:3000`.

## 3. Push ke GitHub

```bash
git init
git add .
git commit -m "Initial commit: kuis miliarder"
gh repo create nama-repo-kamu --public --source=. --push
```

(atau bikin repo manual di github.com lalu `git remote add origin ...` & `git push`)

## 4. Deploy ke Vercel

1. Buka [vercel.com/new](https://vercel.com/new), pilih **Import Git Repository**, pilih repo yang barusan di-push.
2. Di step **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Klik **Deploy**. Selesai — tiap kali push ke `main`, Vercel auto re-deploy.

## Struktur project

```
app/
  layout.js          -> root layout
  page.js             -> halaman kuis (/)
  leaderboard/page.js  -> halaman leaderboard (/leaderboard)
components/
  QuizGame.js          -> seluruh logika & tampilan game
  Leaderboard.js        -> tampilan papan peringkat (2 bagian: top hadiah & terbaru)
lib/
  supabaseClient.js     -> koneksi Supabase
  prizeLadder.js         -> tangga hadiah 30 tingkat & fallback prize
  prizeDefinitions.js     -> teks "definisi" lucu per nominal hadiah
  questionBank.js         -> pengambilan soal RANDOM per level kesulitan
  share.js                 -> teks & link share (X, WhatsApp, copy link)
supabase/
  schema.sql              -> SQL bikin tabel (questions & scores)
  seed_questions.sql        -> SQL isi 600 soal (150 per level kesulitan)
```

## Fitur share setelah game over

Setelah nama disimpan ke leaderboard, muncul:
- Kalimat "Selamat kepada '{nama}' 🏆 kamu berhasil membawa pulang hadiah sebesar {nominal}!"
- **Definisi nyeleneh** sesuai nominal hadiah persis (30 versi berbeda, dari Rp 0 sampai jackpot Rp 2 miliar) — daftar lengkapnya di `lib/prizeDefinitions.js`
- Ajakan lucu-lucuan "klaim hadiah ke @ceritagenz" (jelas disclaimer becanda)
- Tombol bagikan ke **X**, **WhatsApp**, dan **Copy Link** — satu template teks share yang tinggal ganti nominal
- Tombol **Follow @ceritagenz di X**

Ganti akun X di `lib/share.js` (konstanta `CERITAGENZ_X_URL`) kalau mau pakai akun lain, edit teks di `buildShareText()` buat ganti gaya bahasa share, dan edit `PRIZE_DEFINITIONS` di `lib/prizeDefinitions.js` buat ganti teks definisi per nominal.

## Fitur tambahan (sound, animasi, & UX)

- **Inget nama pemain**: submit nama cuma perlu sekali. Setelah itu, nama otomatis diinget (`localStorage`) dan skor langsung ke-submit otomatis tiap game over berikutnya — gak perlu ngetik/klik apa pun lagi. Ada link "Ganti nama" kalau HP dipakai gantian sama orang lain.

- **Suara** (semua digenerate langsung pakai Web Audio API di `lib/sounds.js`, gak perlu file mp3):
  - Klik pilih jawaban, detak jam (makin intens 5 detik terakhir)
  - Jawaban benar (nada beda kalau pas di soal milestone 10/15/20/25/30 — lebih megah)
  - Jawaban salah, ketahuan pindah tab (alarm tersendiri, beda dari salah biasa)
  - Whoosh pas pindah ke soal berikutnya
  - 50:50 (efek "poof" 2x), Telepon Teman (dering), Tanya Penonton (dengung tegang lalu nada hasil)
  - Ding konfirmasi pas skor berhasil disimpan, fanfare menang / nada turun kalah
  - Tombol 🔊/🔇 di sebelah lifeline buat mute semua suara sekaligus
- **Animasi 50:50**: 2 jawaban salah "menghilang" dengan fade + grayscale, bukan langsung ilang.
- **Partikel emas**: muncul otomatis mulai soal ke-25, background kotak soal juga berubah lebih dramatis.
- **Tangga hadiah**: milestone (🚩) punya warna hijau beda dari level biasa. Defaultnya cuma nampilin 7 level di sekitar posisi sekarang (biar gak kepanjangan di HP), ada tombol "Lihat Semua Level" buat expand + auto-scroll ke posisi aktif.
- **Rank & pesan motivasi**: layar game over nampilin badge rank (Pemula/Sultan/Legenda) dan kalimat penyemangat khusus kalau hadiahnya Rp 0.
- **Telepon Teman**: jawabannya muncul huruf-demi-huruf (efek mengetik), benar 70% dari waktu (gak selalu bener), dan punya 30 variasi kalimat pembuka biar gak monoton.
- **Tanya Penonton**: bar persentase animasi ngisi dari 0% ke nilai asli.
- **Bug fix penting**: race condition di logika transisi soal yang kadang bikin hadiah kehitung salah/nol saat gagal di soal tinggi — sudah diperbaiki (pakai `useRef` biar gak baca state basi).

## Leaderboard

Halaman `/leaderboard` punya 2 bagian, keduanya sekarang dengan medali 🥇🥈🥉 (khusus top 3 di bagian hadiah tertinggi), highlight baris kamu sendiri (disimpan di `localStorage`), dan indikator "LIVE" berkedip di tab terbaru:
- **🏆 Hadiah Tertinggi** — 10 skor tertinggi sepanjang masa
- **🕐 Terbaru Submit** — 10 pemain paling baru main

## Timer per soal

Tiap soal punya batas waktu **30 detik** (badge angka + progress bar di kotak soal, berubah merah kalau tersisa ≤10 detik). Kalau waktu habis dan belum sempat jawab, jawaban benar disorot sebentar (1.5 detik) lalu **otomatis** lanjut ke layar game over — gak perlu klik tombol apa pun. Hadiahnya sesuai milestone terakhir yang dilewati, sama seperti kalau salah pilih jawaban. Durasinya bisa diubah lewat konstanta `QUESTION_TIME_LIMIT` di `components/QuizGame.js`.

## Struktur babak (30 soal per sesi, diambil random dari 600 soal)

- Soal 1-10: **easy** (gampang)
- Soal 11-15: **medium**
- Soal 16-20: **hard** (susah)
- Soal 21-30: **very_hard** (sangat susah)

Setiap kali mulai permainan baru (termasuk klik "Main Lagi"), 30 soal diambil **acak** dari pool 600 soal sesuai levelnya masing-masing — jadi tiap sesi permainan susunan soalnya beda-beda, tapi tetap makin lama makin susah.

## Tangga hadiah (30 tingkat, jackpot Rp 2 miliar)

Nilainya dirancang manual (bukan hasil pembulatan otomatis) supaya tiap soal punya nominal berbeda dan urutannya rapi menaik. Milestone (✓ = hadiah aman kalau salah jawab) ada di akhir tiap babak:

| Soal | Hadiah | | Soal | Hadiah |
|---|---|---|---|---|
| 1 | Rp 25.000 | | 16 | Rp 7.500.000 |
| 2 | Rp 50.000 | | 17 | Rp 10.000.000 |
| 3 | Rp 75.000 | | 18 | Rp 15.000.000 |
| 4 | Rp 100.000 | | 19 | Rp 20.000.000 |
| 5 | Rp 150.000 | | 20 | Rp 30.000.000 ✓ (akhir hard) |
| 6 | Rp 200.000 | | 21 | Rp 50.000.000 |
| 7 | Rp 300.000 | | 22 | Rp 75.000.000 |
| 8 | Rp 400.000 | | 23 | Rp 100.000.000 |
| 9 | Rp 500.000 | | 24 | Rp 150.000.000 |
| 10 | Rp 750.000 ✓ (akhir easy) | | 25 | Rp 200.000.000 ✓ (checkpoint) |
| 11 | Rp 1.000.000 | | 26 | Rp 300.000.000 |
| 12 | Rp 1.500.000 | | 27 | Rp 500.000.000 |
| 13 | Rp 2.000.000 | | 28 | Rp 750.000.000 |
| 14 | Rp 3.000.000 | | 29 | Rp 1.000.000.000 |
| 15 | Rp 5.000.000 ✓ (akhir medium) | | 30 | **Rp 2.000.000.000** ✓ 🏆 |

Mau ganti nilainya? Edit array `PRIZE_LADDER` di `lib/prizeLadder.js`.

## Cara kerja game over

- Tangga hadiah pakai 30 nilai manual di `PRIZE_LADDER` (lihat tabel di atas), strictly menaik tanpa ada dua soal dengan nominal sama.
- Kalau jawaban salah, hadiah yang disimpan = nilai milestone tertinggi yang **sudah dilewati** sebelumnya (kalau belum lewat milestone manapun, hadiahnya Rp 0).
- Kalau jawaban benar di soal terakhir, pemain menang jackpot penuh.
- Lifeline 50:50 / Telepon Teman / Tanya Penonton tetap bisa dipakai, masing-masing cuma sekali per permainan.

## Catatan keamanan

Tabel `questions` dan `scores` pakai Row Level Security: publik cuma bisa **baca** soal & leaderboard, dan **insert** skor baru. Publik tidak bisa edit/hapus apa pun — pengelolaan soal cuma lewat Supabase Dashboard kamu sendiri.
