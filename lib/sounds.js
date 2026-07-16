// Efek suara buat tiap momen penting di game, semuanya di-generate langsung
// pakai Web Audio API (osilator + noise buffer) -- gak perlu file audio
// eksternal, jadi nggak nambah beban loading, nggak perlu hosting file, dan
// nggak ada isu lisensi musik.

let audioCtx = null;

function getContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  // Browser modern nge-suspend audio context sampai ada interaksi user.
  // Aman dipanggil berkali-kali; resume() no-op kalau udah running.
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// "Nyalain" audio context dari dalam event click langsung (gesture asli),
// supaya suara yang dimainkan belakangan (lewat setTimeout) gak keblokir
// autoplay policy browser.
export function primeAudio() {
  getContext();
}

// ---- building blocks ----

function tone(ctx, { freq, start, duration, type = "sine", gain = 0.2, freqEnd, freqCurve = "exponential" }) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  if (freqEnd) {
    if (freqCurve === "linear") {
      osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + start + duration);
    } else {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + start + duration);
    }
  }
  gainNode.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.05);
}

// Ledakan noise pendek (buat efek "whoosh"/"poof"), difilter biar gak berisik.
function noiseBurst(ctx, { start, duration, gain = 0.15, filterFreq = 1200, filterType = "bandpass" }) {
  const bufferSize = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // fade out biar natural
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gain, ctx.currentTime + start);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  src.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);
  src.start(ctx.currentTime + start);
  src.stop(ctx.currentTime + start + duration + 0.05);
}

// =====================================================================
// GAMEPLAY UTAMA
// =====================================================================

// Klik saat memilih jawaban -- nada pendek netral, feedback instan.
export function playClickSound() {
  const ctx = getContext();
  if (!ctx) return;
  tone(ctx, { freq: 880, start: 0, duration: 0.08, type: "sine", gain: 0.15 });
}

// Detak jam -- makin mendesak makin dikit sisa waktunya. `urgent` = true
// dipakai buat 5 detik terakhir (nada lebih tinggi & lebih kenceng).
export function playTickSound(urgent = false) {
  const ctx = getContext();
  if (!ctx) return;
  tone(ctx, {
    freq: urgent ? 1300 : 1000,
    start: 0,
    duration: urgent ? 0.08 : 0.06,
    type: "square",
    gain: urgent ? 0.16 : 0.1,
  });
}

// Jawaban benar (bukan milestone): dua-tiga nada naik yang ceria.
export function playCorrectSound() {
  const ctx = getContext();
  if (!ctx) return;
  tone(ctx, { freq: 523.25, start: 0, duration: 0.14, type: "sine", gain: 0.22 });
  tone(ctx, { freq: 659.25, start: 0.12, duration: 0.14, type: "sine", gain: 0.22 });
  tone(ctx, { freq: 783.99, start: 0.24, duration: 0.28, type: "sine", gain: 0.24 });
}

// Jawaban benar TEPAT di soal milestone (10, 15, lalu tiap soal 16-30) -- lebih megah
// dari correct biasa, nandain "aman, hadiah gak bisa turun dari sini".
export function playMilestoneSound() {
  const ctx = getContext();
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    tone(ctx, { freq, start: i * 0.09, duration: 0.22, type: "triangle", gain: 0.22 });
  });
  // lapisan "kilau" bel di atasnya biar berasa spesial
  tone(ctx, { freq: 1568, start: 0.32, duration: 0.5, type: "sine", gain: 0.14 });
}

// Jawaban salah: nada turun + sedikit "buzz", kesan mengecewakan.
export function playWrongSound() {
  const ctx = getContext();
  if (!ctx) return;
  tone(ctx, { freq: 220, start: 0, duration: 0.22, type: "sawtooth", gain: 0.16, freqEnd: 130 });
  tone(ctx, { freq: 160, start: 0.18, duration: 0.28, type: "square", gain: 0.12, freqEnd: 80 });
}

// Game over (kalah): progresi 4 nada turun, lebih panjang & dramatis.
export function playGameOverSound() {
  const ctx = getContext();
  if (!ctx) return;
  const notes = [392, 349.23, 293.66, 220];
  notes.forEach((freq, i) => {
    tone(ctx, { freq, start: i * 0.18, duration: 0.32, type: "triangle", gain: 0.2 });
  });
}

// Menang jackpot: fanfare 4 nada naik + kilau di akhir.
export function playWinSound() {
  const ctx = getContext();
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    tone(ctx, { freq, start: i * 0.13, duration: 0.35, type: "sine", gain: 0.24 });
  });
  tone(ctx, { freq: 1318.5, start: 0.55, duration: 0.6, type: "sine", gain: 0.18 });
}

// =====================================================================
// LIFELINE
// =====================================================================

// 50:50 -- dua "poof" berturut-turut, mewakili 2 jawaban salah yang hilang.
export function play5050Sound() {
  const ctx = getContext();
  if (!ctx) return;
  noiseBurst(ctx, { start: 0, duration: 0.18, gain: 0.18, filterFreq: 900 });
  tone(ctx, { freq: 500, start: 0, duration: 0.12, type: "sine", gain: 0.12, freqEnd: 200 });
  noiseBurst(ctx, { start: 0.16, duration: 0.18, gain: 0.18, filterFreq: 900 });
  tone(ctx, { freq: 500, start: 0.16, duration: 0.12, type: "sine", gain: 0.12, freqEnd: 200 });
}

// Telepon Teman -- nada dering telepon (dua nada bergantian), diulang 2x.
export function playPhoneRingSound() {
  const ctx = getContext();
  if (!ctx) return;
  [0, 0.7].forEach((offset) => {
    tone(ctx, { freq: 480, start: offset, duration: 0.35, type: "sine", gain: 0.14 });
    tone(ctx, { freq: 440, start: offset + 0.35, duration: 0.35, type: "sine", gain: 0.14 });
  });
}

// Tanya Penonton -- suara "membangun ketegangan" (dengung naik pelan-pelan)
// sebelum hasil polling muncul.
export function playAudienceSuspenseSound() {
  const ctx = getContext();
  if (!ctx) return;
  tone(ctx, { freq: 110, start: 0, duration: 1.0, type: "sawtooth", gain: 0.06, freqEnd: 220, freqCurve: "linear" });
  tone(ctx, { freq: 165, start: 0, duration: 1.0, type: "sine", gain: 0.05, freqEnd: 330, freqCurve: "linear" });
}

// Hasil polling penonton selesai muncul -- bar-bar "jatuh" ke posisi akhir.
export function playAudienceResultSound() {
  const ctx = getContext();
  if (!ctx) return;
  tone(ctx, { freq: 660, start: 0, duration: 0.18, type: "sine", gain: 0.16 });
}

// =====================================================================
// LAIN-LAIN
// =====================================================================

// Ketahuan pindah tab (curang) -- alarm 2 nada gantian, lebih tegas/genting
// daripada sekadar salah jawab biasa.
export function playCheatAlarmSound() {
  const ctx = getContext();
  if (!ctx) return;
  [0, 0.22, 0.44].forEach((offset) => {
    tone(ctx, { freq: 900, start: offset, duration: 0.14, type: "square", gain: 0.16 });
    tone(ctx, { freq: 600, start: offset + 0.14, duration: 0.14, type: "square", gain: 0.16 });
  });
}

// Skor berhasil disimpan ke leaderboard -- "ding" konfirmasi yang enak didengar.
export function playSaveSuccessSound() {
  const ctx = getContext();
  if (!ctx) return;
  tone(ctx, { freq: 784, start: 0, duration: 0.12, type: "sine", gain: 0.18 });
  tone(ctx, { freq: 1046.5, start: 0.1, duration: 0.35, type: "sine", gain: 0.2 });
}

// Transisi ke soal berikutnya -- whoosh halus, nandain soal baru muncul.
export function playNextQuestionSound() {
  const ctx = getContext();
  if (!ctx) return;
  noiseBurst(ctx, { start: 0, duration: 0.25, gain: 0.08, filterFreq: 2000, filterType: "highpass" });
}
