// Tangga hadiah untuk 30 soal (10 easy, 5 medium, 5 hard, 10 very_hard).
// Nilainya dirancang manual (bukan hasil pembulatan otomatis) supaya setiap
// soal punya nominal berbeda dan urutannya rapi menaik dari kecil ke besar.
// Milestone (soal aman -- kalau salah jawab, hadiah gak turun di bawah ini)
// ada di soal ke-10 (akhir easy), ke-15 (akhir medium), ke-20 (akhir hard),
// ke-25 (checkpoint tambahan di tengah babak very_hard), dan ke-30 (jackpot).
export const PRIZE_LADDER = [
  { n: 1, value: 25000 },
  { n: 2, value: 50000 },
  { n: 3, value: 75000 },
  { n: 4, value: 100000 },
  { n: 5, value: 150000 },
  { n: 6, value: 200000 },
  { n: 7, value: 300000 },
  { n: 8, value: 400000 },
  { n: 9, value: 500000 },
  { n: 10, value: 750000, milestone: true },
  { n: 11, value: 1000000 },
  { n: 12, value: 1500000 },
  { n: 13, value: 2000000 },
  { n: 14, value: 3000000 },
  { n: 15, value: 5000000, milestone: true },
  { n: 16, value: 7500000 },
  { n: 17, value: 10000000 },
  { n: 18, value: 15000000 },
  { n: 19, value: 20000000 },
  { n: 20, value: 30000000, milestone: true },
  { n: 21, value: 50000000 },
  { n: 22, value: 75000000 },
  { n: 23, value: 100000000 },
  { n: 24, value: 150000000 },
  { n: 25, value: 200000000, milestone: true },
  { n: 26, value: 300000000 },
  { n: 27, value: 500000000 },
  { n: 28, value: 750000000 },
  { n: 29, value: 1000000000 },
  { n: 30, value: 2000000000, milestone: true },
];

export function formatRupiah(n) {
  const rounded = Math.round(n);
  return "Rp " + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Bangun tangga hadiah untuk sejumlah soal, urut dari soal 1 s.d. terakhir
// (ascending). Kalau totalQuestions === 30 (kondisi normal sesuai
// DIFFICULTY_PLAN di questionBank.js), pakai PRIZE_LADDER manual di atas
// biar nilainya persis seperti yang sudah dirancang. Kalau jumlah soal
// pernah diubah jadi bukan 30, tetap fallback ke skema proporsional
// sederhana biar aplikasi gak error.
export function buildLadder(totalQuestions) {
  if (totalQuestions === PRIZE_LADDER.length) {
    return PRIZE_LADDER.map((r) => ({
      n: r.n,
      value: r.value,
      amount: formatRupiah(r.value),
      milestone: Boolean(r.milestone),
    }));
  }
  if (totalQuestions <= 0) return [];
  const first = PRIZE_LADDER[0].value;
  const last = PRIZE_LADDER[PRIZE_LADDER.length - 1].value;
  const rungs = [];
  for (let n = 1; n <= totalQuestions; n++) {
    const t = totalQuestions === 1 ? 1 : (n - 1) / (totalQuestions - 1);
    const raw = first * Math.pow(last / first, t);
    const value = Math.round(raw);
    rungs.push({ n, value, amount: formatRupiah(value), milestone: n === totalQuestions });
  }
  return rungs;
}

// Kalau pemain salah jawab (atau kehabisan waktu) di soal ke `passedCount + 1`
// (1-indexed), hadiah yang dibawa pulang adalah milestone tertinggi yang
// sudah TERLEWATI. passedCount = jumlah soal yang sudah dijawab BENAR
// sebelum soal yang gagal ini.
export function fallbackPrize(passedCount, ladder) {
  let safe = 0;
  for (const r of ladder) {
    if (r.milestone && r.n <= passedCount) safe = r.value;
  }
  return safe;
}
