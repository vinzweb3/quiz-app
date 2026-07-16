// Struktur babak: makin tinggi nomor soal, makin susah.
// Soal 1-10 easy, 11-15 medium, 16-20 hard, 21-30 very_hard. Total 30 soal.
export const DIFFICULTY_PLAN = [
  { difficulty: "easy", count: 10 },
  { difficulty: "medium", count: 5 },
  { difficulty: "hard", count: 5 },
  { difficulty: "very_hard", count: 10 },
];

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Berapa banyak ID soal terakhir yang diinget (per browser, lewat localStorage)
// biar soal yang BARU AJA muncul gak gampang nongol lagi di game berikutnya.
// 90 dipilih karena itu 3x jumlah soal per game (30) -- cukup buat bikin
// beberapa game berturut-turut kerasa beda, tapi gak sampai "menghabiskan"
// bank soal kalau salah satu level cuma punya sedikit soal.
export const RECENT_HISTORY_MAX = 90;

// `allQuestions` = semua baris dari tabel `questions` (apa adanya, urutan bebas).
// `recentIds` = Set berisi ID soal yang baru2 ini muncul (opsional -- lihat
// getRecentQuestionIds/saveRecentQuestionIds di bawah).
//
// Mengembalikan array sepanjang total DIFFICULTY_PLAN. Di tiap level, urutan
// pemilihannya:
//   1. Acak SELURUH pool soal level itu (Fisher-Yates, unbiased).
//   2. Pisahin jadi dua kelompok: "belum pernah muncul baru-baru ini" vs
//      "pernah muncul baru-baru ini" (berdasarkan recentIds).
//   3. Ambil duluan dari kelompok "belum pernah muncul", baru tambal dari
//      kelompok "pernah muncul" kalau kelompok pertama kurang.
// Ini yang bikin soal kerasa BENERAN variatif antar sesi main, bukan cuma
// acak dalam satu sesi doang. Kalau recentIds gak dikasih (default kosong),
// fungsi ini tetap murni random seperti sebelumnya.
//
// Setelah soal per level dipilih, urutan gabungan semua level DIACAK LAGI
// (lintas level) supaya soal mudah/sedang/sulit/sangat sulit bisa muncul
// silih berganti di posisi mana saja -- gak dikelompokkan blok per level.
// Posisi soal ke-n tetap dipakai buat hadiah di prizeLadder.js (posisi, bukan
// levelnya, yang menentukan nominal hadiah).
export function pickGameQuestions(allQuestions, plan = DIFFICULTY_PLAN, recentIds = new Set()) {
  const byDifficulty = {};
  for (const q of allQuestions) {
    if (!byDifficulty[q.difficulty]) byDifficulty[q.difficulty] = [];
    byDifficulty[q.difficulty].push(q);
  }

  const picked = [];
  const warnings = [];
  for (const { difficulty, count } of plan) {
    const pool = byDifficulty[difficulty] || [];
    if (pool.length < count) {
      warnings.push(
        `Soal level '${difficulty}' cuma ada ${pool.length}, butuh ${count}. Tambahkan lebih banyak soal di Supabase.`
      );
    }

    const notRecentlySeen = shuffle(pool.filter((q) => !recentIds.has(q.id)));
    const recentlySeen = shuffle(pool.filter((q) => recentIds.has(q.id)));
    const combined = [...notRecentlySeen, ...recentlySeen];

    picked.push(...combined.slice(0, count));
  }

  // Acak urutan gabungan semua level, biar susunannya beneran random lintas
  // tingkatan (bukan sekadar random di dalam masing-masing level).
  return { questions: shuffle(picked), warnings };
}

// Baca daftar ID soal yang baru2 ini muncul dari localStorage. Aman dipanggil
// di server (SSR) atau kalau localStorage gak tersedia -- balikin Set kosong.
export function getRecentQuestionIds(storageKey = "quiz-recent-question-ids") {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    return new Set();
  }
}

// Simpan ID soal yang baru dipakai di game ini, digabung sama histori lama,
// lalu dipotong ke RECENT_HISTORY_MAX entri paling baru (biar gak numpuk terus
// di localStorage dan biar entri paling lama otomatis "boleh muncul lagi").
export function saveRecentQuestionIds(newIds, previousIds, storageKey = "quiz-recent-question-ids") {
  if (typeof window === "undefined") return;
  try {
    const merged = [...previousIds, ...newIds].slice(-RECENT_HISTORY_MAX);
    window.localStorage.setItem(storageKey, JSON.stringify(merged));
  } catch (e) {
    // localStorage bisa gagal (mode private/disabled) -- abaikan diam-diam,
    // game tetap jalan cuma tanpa "ingatan" anti-repeat antar sesi.
  }
}
