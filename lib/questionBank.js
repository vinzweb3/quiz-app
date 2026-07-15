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

// `allQuestions` = semua baris dari tabel `questions` (apa adanya, urutan bebas).
// Mengembalikan array sepanjang total DIFFICULTY_PLAN (default 50), tersusun
// dari level termudah ke tersulit, dengan soal yang dipilih RANDOM di setiap
// levelnya setiap kali fungsi ini dipanggil (yaitu setiap mulai permainan baru).
export function pickGameQuestions(allQuestions, plan = DIFFICULTY_PLAN) {
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
    const shuffled = shuffle(pool);
    picked.push(...shuffled.slice(0, count));
  }

  return { questions: picked, warnings };
}
