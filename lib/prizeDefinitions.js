// Teks lucu ala 'definisi KBBI palsu' buat tiap nominal hadiah di tangga.
// Dipakai di layar game over setelah skor disimpan, biar makin kocak & shareable.
export const PRIZE_DEFINITIONS = {
  0: "Definisi nol besar yang membanggakan. Capek-capek main, eh hasilnya tetap setia di angka nol. Mau pamer tapi malu, ya udah pamer kegagalan aja. 🤡",
  25000: "Definisi kaya raya, tapi cuma cukup buat beli gorengan dapet sepuluh. Lumayan lah buat jajan, daripada nggak sama sekali. 💸",
  50000: "Definisi sultan receh yang lagi otw kaya. Lumayan banget buat beli kopi pas lagi nongkrong sore, nggak perlu minta duit orang tua lagi! ☕",
  75000: "Definisi jajan kenyang yang sesungguhnya. Kalau ditabung sih mungkin bakal berasa lama, tapi kalau langsung diabisin buat makan enak, hari ini terasa sangat berharga. 🍜",
  100000: "Definisi angka bulat yang bikin tenang. Seratus ribu di tangan rasanya sudah cukup buat gaya-gayaan tipis-tipis di akhir pekan. 💸",
  150000: "Definisi sultan kelas menengah. Sudah bisa buat bayar tagihan atau sekadar nongkrong santai tanpa harus takut dompet langsung kosong melompong. 😎",
  200000: "Definisi progres yang bikin nagih. Tiap angkanya naik, perasaan bangga jadi miliarder simulasi makin sulit dibendung. 📈",
  300000: "Definisi modal dikit untung selangit. Rasanya sudah seperti bos kecil yang lagi mantau profit harian di aplikasi sendiri. 💼",
  400000: "Definisi hampir setengah juta. Dikit lagi beneran bisa buat pamer ke grup keluarga biar dikira beneran sukses besar. 🤫",
  500000: "Definisi setengah juta pertama. Nominal yang cukup bikin orang lain melirik, padahal cuma hasil main-main di layar HP. 🚀",
  750000: "Definisi nanggung tapi bikin senang. Dikit lagi tembus angka satu juta, rasanya seperti sudah di depan mata buat pensiun dini. 💎",
  1000000: "Definisi jutawan muda yang sebenarnya. Akhirnya tembus angka sejuta, walaupun cuma di layar, tapi sensasinya tetep berasa megang duit beneran. 💵",
  1500000: "Definisi langkah kaki menuju kesuksesan. Dikit lagi makin jauh dari angka receh, mulai berasa kayak profesional yang lagi nabung buat masa depan. 🧳",
  2000000: "Definisi 'sultan' modal klik doang. Lumayan lah buat nambah-nambahin halu biar semangat kerja walaupun cuma angka di layar. 💸",
  3000000: "Definisi angka cantik yang bikin tenang. Kalau beneran masuk rekening, mungkin gue udah langsung liburan singkat buat ngerayain keberhasilan halu ini. 🏖️",
  5000000: "Definisi lima juta pertama. Angka yang cukup buat bikin orang di sekitar curiga, padahal ya cuma hasil iseng-iseng berhadiah. 🕵️",
  7500000: "Definisi nanggung tapi bikin ketagihan. Sedikit lagi mau nyentuh angka dua digit, makin semangat buat lanjut klik terus sampai ujung. 🔥",
  10000000: "Definisi sultan papan atas simulasi. Sepuluh juta di tangan, rasanya udah kayak bos besar yang punya perusahaan sendiri di dunia khayalan. 🏢",
  15000000: "Definisi kekayaan yang mulai di luar nalar. Main game dapet segini mah udah bisa bikin orang ngira gue menang undian berhadiah besar. 🎉",
  20000000: "Definisi sukses yang bikin geleng-geleng kepala. Angka dua puluh juta terpampang nyata, bikin semangat halu gue mencapai titik tertinggi. 🚀",
  30000000: "Definisi level dewa dalam hal pamer. Kalau beneran segini, mungkin gue udah sibuk mikirin mau beli apa, padahal kenyataannya cuma mau beli kopi. ☕",
  50000000: "Definisi puncak dari segala simulasi. Lima puluh juta sudah di tangan, saatnya pamer ke seluruh dunia kalau gue adalah juara bertahan di dunia halu. 👑",
  75000000: "Definisi sultan yang sebenarnya. Angka segini mah udah cukup buat modal renovasi ruko atau sekadar jadi aset yang bikin tetangga mulai bertanya-tanya. 🏗️",
  100000000: "Definisi sembilan digit pertama yang sangat manis. Rasanya sudah bukan lagi main simulasi, tapi udah berasa kayak orang kaya yang baru menang kuis dadakan. 🍯",
  150000000: "Definisi kekayaan yang mulai membuat orang terdiam. Kalau angka ini beneran ada, mungkin gue udah keliling komplek sambil bagi-bagi sembako (khayalan). 🥫",
  200000000: "Definisi sukses yang nggak masuk akal. Angka segini sudah bikin gue merasa jadi pemilik usaha besar yang punya banyak karyawan di balik layar. 🏭",
  300000000: "Definisi level bos besar yang sulit dikejar. Sudah di tahap di mana gue cuma bisa tertawa melihat saldo simulasi sendiri yang makin menggila. 😂",
  500000000: "Definisi setengah miliar yang bikin merinding. Cuma kurang dikit lagi tembus angka satu miliar, perjuangan klik-klik ini benar-benar membuahkan hasil halu yang maksimal. 🥶",
  750000000: "Definisi hampir miliarder papan atas. Sedikit lagi menuju angka impian, rasanya sudah seperti pemenang undian yang siap ganti gaya hidup dalam sekejap. 🎰",
  1000000000: "Definisi 'sultan' modal klik doang. Lumayan lah buat nambah-nambahin halu biar semangat kerja walaupun cuma angka di layar. 💸",
  2000000000: "Definisi 'sultan' modal klik doang. Lumayan lah buat nambah-nambahin halu biar semangat kerja walaupun cuma angka di layar. 💸",
};

// Ambil definisi berdasarkan nominal persis. Kalau gak ada yang cocok persis
// (misal ladder pernah diubah), fallback ke definisi milestone terdekat di bawahnya.
export function getPrizeDefinition(value) {
  if (PRIZE_DEFINITIONS[value] !== undefined) return PRIZE_DEFINITIONS[value];
  const keys = Object.keys(PRIZE_DEFINITIONS).map(Number).sort((a, b) => a - b);
  let closest = keys[0];
  for (const k of keys) {
    if (k <= value) closest = k;
  }
  return PRIZE_DEFINITIONS[closest];
}
// Definisi khusus buat game over yang disebabkan waktu habis (bukan salah
// pilih jawaban) -- ditampilkan gantiin definisi nominal biasa.
export const TIMEOUT_DEFINITION =
  "Definisi telat mikir. Waktu udah abis baru sadar ternyata jawabannya gampang banget. Emang bener, kesempatan itu kayak kereta, kalau telat ya ditinggal pergi.";

// Definisi khusus buat game over yang disebabkan ketahuan pindah tab
// (kemungkinan lagi nyari jawaban di Google dkk).
export const CHEAT_DEFINITION =
  "Definisi ketahuan belangnya. Baru juga mau buka Google, eh keduluan ketahuan sama sistem. Niat curang tapi gagal total, mendingan modal otak sendiri deh lain kali. 🕵️";

// Rank/gelar lucu-lucuan berdasarkan nominal hadiah, ditampilkan di layar
// game over biar berasa ada progres/pencapaian walau baru "modal klik".
export function getRankTitle(value) {
  if (value <= 0) return "Rank: Pemula Banget";
  if (value < 500000) return "Rank: Pemula";
  if (value < 5000000) return "Rank: Lumayan";
  if (value < 50000000) return "Rank: Jago";
  if (value < 500000000) return "Rank: Sultan Receh";
  if (value < 2000000000) return "Rank: Sultan";
  return "Rank: LEGENDA MILIARDER";
}
