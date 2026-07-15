"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { buildLadder, fallbackPrize, formatRupiah } from "../lib/prizeLadder";
import { pickGameQuestions } from "../lib/questionBank";
import {
  primeAudio,
  playCorrectSound,
  playWrongSound,
  playGameOverSound,
  playWinSound,
  playClickSound,
  playTickSound,
  playMilestoneSound,
  play5050Sound,
  playPhoneRingSound,
  playAudienceSuspenseSound,
  playAudienceResultSound,
  playCheatAlarmSound,
  playSaveSuccessSound,
  playNextQuestionSound,
} from "../lib/sounds";
import { buildShareText, buildShareLinks, CERITAGENZ_X_URL } from "../lib/share";
import { getPrizeDefinition, TIMEOUT_DEFINITION, CHEAT_DEFINITION, getRankTitle } from "../lib/prizeDefinitions";

const LETTERS = ["A", "B", "C", "D"];
const FRIENDS = ["Budi", "Sinta", "Rian", "Dewi", "Fajar", "Nadia"];

// 30 variasi kalimat pembuka pas teman jawab telepon -- independen dari
// bener/salahnya tebakan (biar realistis: kadang pede tapi salah, kadang
// ragu-ragu tapi bener). Tiap kalimat didesain nyambung ke " jawabannya X. Y".
const PHONE_A_FRIEND_LINES = [
  "Gua cukup yakin nih,",
  "Aduh, gua kurang yakin, tapi coba",
  "Setau gua sih,",
  "Waduh, ini susah banget, tapi kalo nebak",
  "Gampang banget ini mah,",
  "Hmm, bentar mikir dulu... oke,",
  "Yakin 100%, gak mungkin salah,",
  "Duh maaf ya kalo ternyata salah,",
  "Kalo gak salah inget ya,",
  "Ini mah gua apal luar kepala,",
  "Waduh jujur gua agak ragu, tapi",
  "Serius deh, gua yakin banget",
  "Ini pertanyaan jebakan gak sih? Tapi coba deh",
  "Asal tebak aja ya,",
  "Sumpah gua yakin,",
  "Aduh maaf banget kalo meleset,",
  "Kayaknya deh ya,",
  "Fix banget nih gua yakin,",
  "Bentar googling dulu... eh gaboleh ya, oke deh",
  "Insting gua bilang,",
  "Gua kurang pede sih, tapi",
  "Ini gampang, jawabannya",
  "Hmm... coin flip aja deh,",
  "Gua pernah baca soal ini,",
  "Duh grogi, tapi menurut gua",
  "Percaya diri aja ya,",
  "Waduh lupa-lupa inget, tapi kayaknya",
  "Ini mah 100% bener,",
  "Jujur gua gatau, tapi asal nebak",
  "Yaudah gua jawab aja,",
];

const QUESTION_TIME_LIMIT = 30; // detik per soal

export default function QuizGame() {
  // --- data soal dari supabase ---
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // --- state permainan ---
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [eliminated, setEliminated] = useState([]);
  const [usedFifty, setUsedFifty] = useState(false);
  const [usedPhone, setUsedPhone] = useState(false);
  const [usedAudience, setUsedAudience] = useState(false);
  const [glow, setGlow] = useState(false);
  const [modal, setModal] = useState(null);
  const [phoneResult, setPhoneResult] = useState(null);
  const [audienceResult, setAudienceResult] = useState(null);
  const [audienceBarsReady, setAudienceBarsReady] = useState(false);
  const [dialing, setDialing] = useState(false);
  const [polling, setPolling] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [timedOut, setTimedOut] = useState(false);
  const [cheatDetected, setCheatDetected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showAllLadder, setShowAllLadder] = useState(false);
  const [ladderPanelOpen, setLadderPanelOpen] = useState(false);
  const activeLadderRef = useRef(null);

  // --- game over & leaderboard ---
  const [gameOver, setGameOver] = useState(null); // null | "won" | "lost"
  const [finalPrize, setFinalPrize] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [isReturningPlayer, setIsReturningPlayer] = useState(false);

  // Begitu game over, cek apakah ada nama yang udah pernah diinget dari main
  // sebelumnya -- kalau ada, langsung pakai itu (gak perlu ngetik/klik lagi
  // tiap kali). Kalau mau ganti nama, ada tombol "Ganti" di GameOverScreen.
  useEffect(() => {
    if (!gameOver) return;
    try {
      const remembered = window.localStorage.getItem("quiz-player-name");
      if (remembered) {
        setPlayerName(remembered);
        setIsReturningPlayer(true);
      } else {
        setIsReturningPlayer(false);
      }
    } catch (e) {
      // localStorage gak tersedia; anggap aja pemain baru, form manual muncul
    }
  }, [gameOver]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const loadQuestions = async () => {
    setLoadingQuestions(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("questions")
      .select("id, question, choices, correct_index, difficulty");

    if (error) {
      setLoadError(error.message);
      setLoadingQuestions(false);
      return;
    }
    if (!data || data.length === 0) {
      setLoadError(
        "Belum ada soal di tabel 'questions'. Jalankan supabase/schema.sql lalu supabase/seed_questions.sql, atau tambahkan soal sendiri lewat Supabase Table Editor."
      );
      setLoadingQuestions(false);
      return;
    }
    const { questions: picked, warnings } = pickGameQuestions(data);
    if (picked.length === 0) {
      setLoadError("Bank soal kosong untuk semua level kesulitan. Cek tabel 'questions' di Supabase.");
      setLoadingQuestions(false);
      return;
    }
    if (warnings.length > 0) {
      // Tetap jalan walau soal kurang dari target per level, cuma kasih tau di console.
      console.warn(warnings.join(" "));
    }
    setQuestions(picked);
    setLoadingQuestions(false);
  };

  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ladder = useMemo(() => buildLadder(questions.length), [questions.length]);
  const activeRungIndex = ladder.findIndex((p) => p.n === step + 1);
  const currentRung = ladder[activeRungIndex];
  const LADDER_WINDOW = 3; // tampilkan 3 di atas + current + 3 di bawah = 7 baris
  const visibleLadder = showAllLadder
    ? ladder
    : ladder.filter((p, i) => Math.abs(i - activeRungIndex) <= LADDER_WINDOW);

  useEffect(() => {
    if (showAllLadder && activeLadderRef.current) {
      activeLadderRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [showAllLadder, step]);

  const current = questions[step];
  const isHighStakes = step + 1 >= 25; // soal 25 ke atas -- efek partikel emas biar makin tegang

  const resetQuestionState = () => {
    setSelected(null);
    setLocked(false);
    setRevealed(false);
    setEliminated([]);
    setModal(null);
    setPhoneResult(null);
    setAudienceResult(null);
    setAudienceBarsReady(false);
    setDialing(false);
    setPolling(false);
    setGlow(false);
    setTimeLeft(QUESTION_TIME_LIMIT);
    setTimedOut(false);
    setCheatDetected(false);
  };

  useEffect(() => {
    resetQuestionState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Countdown per soal. Berhenti begitu terkunci (sudah jawab / waktu habis /
  // ketahuan pindah tab) atau permainan sudah selesai. Detak jam berbunyi
  // tiap detik begitu sisa waktu <=10 detik, biar makin mendesak.
  useEffect(() => {
    if (locked || gameOver || !current) return;
    if (timeLeft <= 0) {
      setTimedOut(true);
      setLocked(true);
      setRevealed(true);
      return;
    }
    if (timeLeft <= 10 && !muted) playTickSound(timeLeft <= 5);
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, locked, gameOver, current]);

  // Deteksi pindah tab / minimize buat cari jawaban di Google dkk. Ini gak
  // bisa 100% mencegah (gak ada cara web app blokir app/device lain), tapi
  // nangkep pola paling umum: buka tab baru pas soal masih aktif.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden && !locked && !gameOver && current) {
        setCheatDetected(true);
        setLocked(true);
        setRevealed(true);
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [locked, gameOver, current]);

  // Refs supaya effect transisi di bawah selalu baca nilai TERBARU tanpa
  // perlu depend ke banyak state sekaligus (depend ke step/current/selected
  // dkk bikin effect ini nembak ULANG setiap step berubah, padahal step
  // BARU SAJA berubah KARENA effect ini sendiri -- itu penyebab bug hadiah
  // suka keitung salah/nol: effect nembak dobel pakai `selected` basi dari
  // soal sebelumnya dibanding `current` yang udah soal baru).
  const stepRef = useRef(step);
  const selectedRef = useRef(selected);
  const currentRef = useRef(current);
  const timedOutRef = useRef(timedOut);
  const cheatDetectedRef = useRef(cheatDetected);
  const ladderRef = useRef(ladder);
  const totalQuestionsRef = useRef(questions.length);
  const mutedRef = useRef(muted);
  useEffect(() => {
    stepRef.current = step;
    selectedRef.current = selected;
    currentRef.current = current;
    timedOutRef.current = timedOut;
    cheatDetectedRef.current = cheatDetected;
    ladderRef.current = ladder;
    totalQuestionsRef.current = questions.length;
    mutedRef.current = muted;
  });

  // Satu-satunya "pintu" transisi setelah jawaban disorot (revealed): entah
  // itu karena benar, salah pilih, waktu habis, atau ketahuan pindah tab --
  // semuanya lewat sini, OTOMATIS, tanpa perlu klik tombol apa pun. Cuma
  // bereaksi ke `revealed` (bukan step/current/selected) supaya gak nembak
  // dobel saat step berubah.
  useEffect(() => {
    if (!revealed || gameOver) return;
    const t = setTimeout(() => {
      const s = stepRef.current;
      const cur = currentRef.current;
      const isRight = !timedOutRef.current && !cheatDetectedRef.current && cur && selectedRef.current === cur.correct_index;
      if (isRight) {
        if (s < totalQuestionsRef.current - 1) {
          if (!mutedRef.current) playNextQuestionSound();
          setStep(s + 1);
        } else {
          const ld = ladderRef.current;
          const jackpot = ld[ld.length - 1]?.value ?? 0;
          setFinalPrize(jackpot);
          setGameOver("won");
        }
      } else {
        const prize = fallbackPrize(s, ladderRef.current);
        setFinalPrize(prize);
        setGameOver("lost");
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [revealed, gameOver]);

  const handlePick = (idx) => {
    if (locked || eliminated.includes(idx) || gameOver) return;
    primeAudio();
    if (!muted) playClickSound();
    setSelected(idx);
    setLocked(true);
    setGlow(true);
    setTimeout(() => {
      setRevealed(true);
      setGlow(false);
    }, 1400);
  };

  const handleFifty = () => {
    if (usedFifty || locked) return;
    setUsedFifty(true);
    if (!muted) play5050Sound();
    const wrong = current.choices
      .map((_, i) => i)
      .filter((i) => i !== current.correct_index);
    const toRemove = wrong.sort(() => 0.5 - Math.random()).slice(0, 2);
    setEliminated(toRemove);
  };

  const handlePhone = () => {
    if (usedPhone || locked) return;
    setModal("phone");
    setDialing(true);
    setPhoneResult(null);
    if (!muted) playPhoneRingSound();
    setTimeout(() => {
      setUsedPhone(true);
      setDialing(false);
      const friendName = FRIENDS[Math.floor(Math.random() * FRIENDS.length)];
      const pool = current.choices
        .map((_, i) => i)
        .filter((i) => !eliminated.includes(i));
      const isRight = Math.random() < 0.7; // teman bener 70% dari waktu, gak selalu bener
      const guess = isRight
        ? current.correct_index
        : pool.filter((i) => i !== current.correct_index)[
            Math.floor(Math.random() * Math.max(1, pool.length - 1))
          ] ?? current.correct_index;
      const line = PHONE_A_FRIEND_LINES[Math.floor(Math.random() * PHONE_A_FRIEND_LINES.length)];
      setPhoneResult({ name: friendName, guess, line });
    }, 1800);
  };

  const handleAudience = () => {
    if (usedAudience || locked) return;
    setModal("audience");
    setPolling(true);
    setAudienceResult(null);
    setAudienceBarsReady(false);
    if (!muted) playAudienceSuspenseSound();
    setTimeout(() => {
      setUsedAudience(true);
      setPolling(false);
      const pool = current.choices
        .map((_, i) => i)
        .filter((i) => !eliminated.includes(i));
      let remaining = 100;
      const dist = {};
      const correctShare = 45 + Math.floor(Math.random() * 25);
      dist[current.correct_index] = correctShare;
      remaining -= correctShare;
      const others = pool.filter((i) => i !== current.correct_index);
      others.forEach((i, idx) => {
        if (idx === others.length - 1) {
          dist[i] = remaining;
        } else {
          const share = Math.floor(Math.random() * (remaining / 2));
          dist[i] = share;
          remaining -= share;
        }
      });
      current.choices.forEach((_, i) => {
        if (eliminated.includes(i)) dist[i] = 0;
      });
      setAudienceResult(dist);
      if (!muted) playAudienceResultSound();
      // biarin render sekali di 0% dulu, baru animasi ke nilai asli
      setTimeout(() => setAudienceBarsReady(true), 50);
    }, 1600);
  };

  const isCorrectPick = selected !== null && current && selected === current.correct_index;

  // Efek suara pas jawaban disorot (revealed) -- benar (biasa/milestone),
  // salah, waktu habis, atau ketahuan pindah tab, masing-masing beda bunyi.
  useEffect(() => {
    if (!revealed || muted) return;
    if (cheatDetected) {
      playCheatAlarmSound();
    } else if (!timedOut && isCorrectPick) {
      const rung = ladder.find((r) => r.n === step + 1);
      if (rung && rung.milestone) playMilestoneSound();
      else playCorrectSound();
    } else {
      playWrongSound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  // Efek suara pas transisi ke layar game over: fanfare kalau menang,
  // nada turun dramatis kalau kalah.
  useEffect(() => {
    if (muted) return;
    if (gameOver === "won") playWinSound();
    else if (gameOver === "lost") playGameOverSound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  const handleSaveScore = async (e) => {
    e.preventDefault();
    if (!playerName.trim() || saving) return;
    setSaving(true);
    setSaveError(null);
    const { data, error } = await supabase
      .from("scores")
      .insert({
        player_name: playerName.trim().slice(0, 40),
        questions_answered: gameOver === "won" ? questions.length : step,
        prize_amount: finalPrize,
        prize_label: formatRupiah(finalPrize),
        result: gameOver,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    // Simpan ID skor kita sendiri di localStorage biar bisa di-highlight
    // pas buka halaman leaderboard nanti. Simpan juga NAMA-nya biar game
    // berikutnya gak perlu ngetik/submit manual lagi.
    try {
      if (data?.id != null && typeof window !== "undefined") {
        const key = "quiz-my-score-ids";
        const existing = JSON.parse(window.localStorage.getItem(key) || "[]");
        window.localStorage.setItem(key, JSON.stringify([...existing, data.id].slice(-50)));
        window.localStorage.setItem("quiz-player-name", playerName.trim().slice(0, 40));
      }
    } catch (e) {
      // localStorage bisa gagal (mode private/disabled); abaikan diam-diam
    }
    setSaved(true);
    if (!muted) playSaveSuccessSound();
  };

  // Dipanggil kalau pemain klik "Ganti" -- lupain nama yang diinget, balik ke
  // form manual biar bisa isi nama baru.
  const handleChangeName = () => {
    try {
      window.localStorage.removeItem("quiz-player-name");
    } catch (e) {
      // abaikan
    }
    setIsReturningPlayer(false);
    // Kalau skor ronde ini udah kesimpen, jangan kosongin playerName (biar
    // pesan "Selamat kepada ..." tetap nampilin nama yang bener) -- efeknya
    // baru kerasa pas ronde BERIKUTNYA (form manual bakal muncul lagi).
    // Kalau belum sempat kesimpen, kosongin biar bisa ketik nama baru.
    if (!saved) {
      setPlayerName("");
    }
  };

  const resetGame = () => {
    setStep(0);
    setGameOver(null);
    setFinalPrize(0);
    setPlayerName("");
    setSaved(false);
    setSaveError(null);
    setUsedFifty(false);
    setUsedPhone(false);
    setUsedAudience(false);
    resetQuestionState(); // panggil langsung -- kalau kalah di soal 1, setStep(0) gak
    // bikin efek [step] jalan lagi karena nilainya gak berubah (0 -> 0)
    loadQuestions();
  };

  if (loadingQuestions) {
    return (
      <Shell>
        <CenterMessage>Memuat soal dari Supabase…</CenterMessage>
      </Shell>
    );
  }

  if (loadError) {
    return (
      <Shell>
        <CenterMessage error>{loadError}</CenterMessage>
      </Shell>
    );
  }

  if (gameOver) {
    return (
      <Shell>
        <GameOverScreen
          result={gameOver}
          finalPrize={finalPrize}
          playerName={playerName}
          setPlayerName={setPlayerName}
          saving={saving}
          saved={saved}
          saveError={saveError}
          onSave={handleSaveScore}
          onReset={resetGame}
          timedOut={timedOut}
          cheatDetected={cheatDetected}
          isReturningPlayer={isReturningPlayer}
          onChangeName={handleChangeName}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <style>{`
        @keyframes pulseGold {
          0%, 100% { box-shadow: 0 0 16px 2px rgba(255,196,64,0.4), inset 0 0 12px rgba(255,196,64,0.08); transform: scale(1); }
          50% { box-shadow: 0 0 36px 10px rgba(255,196,64,0.9), inset 0 0 18px rgba(255,196,64,0.18); transform: scale(1.012); }
        }
        @keyframes flicker {
          0%,100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .opt-btn {
          transition: transform 0.4s ease, background 0.3s ease, border-color 0.3s ease, opacity 0.5s ease, filter 0.5s ease;
        }
        .opt-btn:hover:not(.disabled):not(.locked) {
          transform: scale(1.015);
        }
        .opt-btn.disabled {
          transform: scale(0.94);
          filter: grayscale(1) blur(0.5px);
        }
      `}</style>

      <Title />

      <Link href="/leaderboard" style={topLinkStyle}>
        🏆 Lihat Leaderboard
      </Link>

      <div
        style={{
          display: "flex",
          gap: 24,
          width: "100%",
          maxWidth: 980,
          flexWrap: "wrap",
          justifyContent: "center",
          marginTop: 14,
        }}
      >
        <div style={{ flex: "1 1 560px", minWidth: 300 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 18, justifyContent: "center", alignItems: "center" }}>
            <button onClick={handleFifty} disabled={usedFifty} style={lifelineStyle(usedFifty)} title="50:50">
              50:50
            </button>
            <button onClick={handlePhone} disabled={usedPhone} style={lifelineStyle(usedPhone)} title="Tanya Teman">
              📞 Teman
            </button>
            <button onClick={handleAudience} disabled={usedAudience} style={lifelineStyle(usedAudience)} title="Tanya Penonton">
              📊 Penonton
            </button>
            <button
              onClick={() => {
                primeAudio();
                setMuted((m) => !m);
              }}
              title={muted ? "Nyalain suara" : "Matiin suara"}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "1px solid #3f5fa8",
                background: "rgba(255,255,255,0.03)",
                color: "#9fb0d8",
                fontSize: 15,
                cursor: "pointer",
                marginLeft: 4,
              }}
            >
              {muted ? "🔇" : "🔊"}
            </button>
          </div>

          {isHighStakes && <GoldParticles />}

          <div
            onContextMenu={(e) => e.preventDefault()}
            onCopy={(e) => e.preventDefault()}
            style={{
              background: isHighStakes
                ? "linear-gradient(180deg, #2a1f4d 0%, #1a0f38 100%)"
                : "linear-gradient(180deg, #142a63 0%, #0b1a44 100%)",
              border: "2px solid #ffce5c",
              borderRadius: 14,
              padding: "20px 22px",
              marginBottom: 16,
              boxShadow: isHighStakes ? "0 0 36px rgba(255,196,64,0.5)" : "0 0 24px rgba(20,40,100,0.6)",
              position: "relative",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  color: "#ffce5c",
                  fontFamily: "'Outfit', 'Trebuchet MS', sans-serif",
                }}
              >
                SOAL {step + 1} DARI {questions.length}
              </span>
              <span
                style={{
                  background: timeLeft <= 10 ? "#ff5c5c" : "rgba(255,206,92,0.12)",
                  color: timeLeft <= 10 ? "#fff" : "#ffce5c",
                  border: "1.5px solid " + (timeLeft <= 10 ? "#ff5c5c" : "#ffce5c"),
                  fontSize: 13,
                  fontWeight: 700,
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Outfit', 'Trebuchet MS', sans-serif",
                  animation: timeLeft <= 10 && !locked ? "pulseGold 0.7s ease-in-out infinite" : "none",
                  flexShrink: 0,
                }}
              >
                {timeLeft}
              </span>
            </div>
            <div style={{ height: 1, background: "rgba(255,206,92,0.25)", marginBottom: 14 }} />
            <div style={{ fontSize: 19, lineHeight: 1.5, fontWeight: 600 }}>{current.question}</div>
          </div>

          <div
            style={{
              height: 4,
              borderRadius: 999,
              background: "rgba(255,255,255,0.1)",
              marginTop: -10,
              marginBottom: 16,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(timeLeft / QUESTION_TIME_LIMIT) * 100}%`,
                background: timeLeft <= 10 ? "#ff5c5c" : "linear-gradient(90deg, #ffce5c, #ffa53c)",
                transition: "width 1s linear",
              }}
            />
          </div>

          <div
            onContextMenu={(e) => e.preventDefault()}
            onCopy={(e) => e.preventDefault()}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, userSelect: "none", WebkitUserSelect: "none" }}
          >
            {current.choices.map((choice, idx) => {
              const isEliminated = eliminated.includes(idx);
              const isSelected = selected === idx;
              const isCorrect = idx === current.correct_index;
              let bg = "linear-gradient(180deg, #1c3a7a 0%, #0e2156 100%)";
              let border = "#3f5fa8";
              if (isEliminated) {
                bg = "linear-gradient(180deg, #0c1430 0%, #070b1d 100%)";
                border = "#1c2747";
              }
              if (revealed && isCorrect) {
                bg = "linear-gradient(180deg, #1f8a3f 0%, #0f5b26 100%)";
                border = "#5cffa0";
              } else if (revealed && isSelected && !isCorrect) {
                bg = "linear-gradient(180deg, #9c1c1c 0%, #5c0d0d 100%)";
                border = "#ff6b6b";
              } else if (isSelected && glow) {
                border = "#ffce5c";
              }
              return (
                <button
                  key={idx}
                  onClick={() => handlePick(idx)}
                  disabled={isEliminated}
                  className={`opt-btn ${isEliminated ? "disabled" : ""} ${locked ? "locked" : ""}`}
                  style={{
                    background: bg,
                    border: `2px solid ${border}`,
                    borderRadius: 10,
                    color: isEliminated ? "#48506e" : "#f4f7ff",
                    padding: "14px 16px",
                    fontSize: 15.5,
                    textAlign: "left",
                    cursor: isEliminated || locked ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontFamily: "'Outfit', 'Trebuchet MS', sans-serif",
                    gridColumn: idx === 4 ? "1 / -1" : undefined,
                    animation: isSelected && glow ? "pulseGold 0.7s ease-in-out infinite" : "none",
                    opacity: isEliminated ? 0.4 : 1,
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "rgba(255,206,92,0.15)",
                      border: "1px solid #ffce5c",
                      color: "#ffce5c",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontWeight: 700,
                    }}
                  >
                    {LETTERS[idx]}
                  </span>
                  {choice}
                </button>
              );
            })}
          </div>

          {revealed && (
            <div style={{ marginTop: 18, textAlign: "center", fontFamily: "'Outfit', 'Trebuchet MS', sans-serif" }}>
              <div
                style={{
                  fontSize: 16,
                  color: isCorrectPick ? "#5cffa0" : "#ff8080",
                  fontWeight: 700,
                }}
              >
                {cheatDetected
                  ? "🚫 Ketahuan pindah tab! Katanya jujur, kok malah kabur nyari contekan? Game over."
                  : isCorrectPick
                  ? "Benar!"
                  : timedOut
                  ? "⏰ Waktu habis! Game over. Kebanyakan bengong hasilnya nol, kan?"
                  : "Yah, kurang tepat. Game over."}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            flex: ladderPanelOpen ? "0 1 220px" : "0 1 auto",
            background: "linear-gradient(180deg, #0c1840 0%, #060d28 100%)",
            border: "1px solid #2b3d77",
            borderRadius: 12,
            padding: "12px 14px",
            fontFamily: "'Outfit', 'Trebuchet MS', sans-serif",
            alignSelf: "flex-start",
            minWidth: 220,
          }}
        >
          <button
            onClick={() => setLadderPanelOpen((v) => !v)}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "none",
              border: "none",
              color: "#ffce5c",
              cursor: "pointer",
              padding: 0,
              fontFamily: "'Outfit', 'Trebuchet MS', sans-serif",
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>🏆 {currentRung?.amount ?? "-"}</span>
            <span style={{ fontSize: 11, color: "#9fb0d8" }}>{ladderPanelOpen ? "Tutup ▲" : "Tangga Hadiah ▼"}</span>
          </button>

          {ladderPanelOpen && (
            <>
              <div style={{ height: 1, background: "rgba(255,206,92,0.2)", margin: "10px 0" }} />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column-reverse",
                  gap: 4,
                  maxHeight: showAllLadder ? 320 : "none",
                  overflowY: showAllLadder ? "auto" : "visible",
                }}
              >
                {visibleLadder.map((p) => {
                  const isActive = p.n === step + 1;
                  const isPast = p.n < step + 1; // sudah dijawab benar sebelumnya
                  return (
                    <div
                      key={p.n}
                      ref={isActive ? activeLadderRef : null}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 12.5,
                        background: isActive
                          ? "linear-gradient(90deg, #ffce5c, #ffa53c)"
                          : p.milestone
                          ? "rgba(92,255,160,0.10)"
                          : isPast
                          ? "rgba(255,206,92,0.08)"
                          : "transparent",
                        borderLeft: !isActive && p.milestone ? "3px solid #5cffa0" : "3px solid transparent",
                        color: isActive ? "#0b1a44" : p.milestone ? "#5cffa0" : isPast ? "#ffce5c" : "#7d8cbf",
                        fontWeight: isActive || p.milestone ? 700 : 400,
                      }}
                    >
                      <span>
                        {p.n}
                        {p.milestone && !isActive ? " 🚩" : ""}
                      </span>
                      <span>{p.amount}</span>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setShowAllLadder((v) => !v)}
                style={{
                  width: "100%",
                  marginTop: 8,
                  background: "none",
                  border: "1px solid #3f5fa8",
                  borderRadius: 8,
                  color: "#9fb0d8",
                  fontSize: 11.5,
                  padding: "5px 0",
                  cursor: "pointer",
                  fontFamily: "'Outfit', 'Trebuchet MS', sans-serif",
                }}
              >
                {showAllLadder ? "Ringkas" : "Lihat Semua Level"}
              </button>
            </>
          )}
        </div>
      </div>

      {modal && (
        <div
          onClick={() => setModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,4,15,0.78)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(180deg, #142a63 0%, #0b1a44 100%)",
              border: "2px solid #ffce5c",
              borderRadius: 16,
              padding: "24px 26px",
              maxWidth: 380,
              width: "100%",
              fontFamily: "'Outfit', 'Trebuchet MS', sans-serif",
              boxShadow: "0 0 40px rgba(255,196,64,0.25)",
            }}
          >
            {modal === "phone" && (
              <>
                <div style={{ fontSize: 13, letterSpacing: "0.1em", color: "#ffce5c", marginBottom: 10 }}>
                  📞 TELEPON TEMAN
                </div>
                {dialing ? (
                  <div style={{ fontSize: 15, color: "#cdd6f5" }}>Menghubungi... ☎️</div>
                ) : phoneResult ? (
                  <div style={{ fontSize: 15, color: "#eef2ff", lineHeight: 1.6 }}>
                    <div style={{ marginBottom: 8 }}>
                      <b>{phoneResult.name}</b> menjawab telepon.
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      "<TypewriterText
                        text={`${phoneResult.line} jawabannya ${LETTERS[phoneResult.guess]}. ${current.choices[phoneResult.guess]}`}
                      />"
                    </div>
                  </div>
                ) : null}
              </>
            )}

            {modal === "audience" && (
              <>
                <div style={{ fontSize: 13, letterSpacing: "0.1em", color: "#ffce5c", marginBottom: 14 }}>
                  📊 HASIL POLLING PENONTON
                </div>
                {polling ? (
                  <div style={{ fontSize: 15, color: "#cdd6f5" }}>Mengumpulkan suara...</div>
                ) : audienceResult ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {current.choices.map((c, i) => (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#cdd6f5", marginBottom: 3 }}>
                          <span>{LETTERS[i]}. {c}</span>
                          <span>{audienceResult[i]}%</span>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden", height: 14 }}>
                          <div
                            style={{
                              width: audienceBarsReady ? `${audienceResult[i]}%` : "0%",
                              height: "100%",
                              background:
                                i === current.correct_index
                                  ? "linear-gradient(90deg, #5cffa0, #1f8a3f)"
                                  : "linear-gradient(90deg, #ffce5c, #b4791c)",
                              transition: "width 0.7s ease",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            )}

            <button onClick={() => setModal(null)} style={{ ...nextBtnStyle, marginTop: 18, width: "100%" }}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

function GameOverScreen({
  result,
  finalPrize,
  playerName,
  setPlayerName,
  saving,
  saved,
  saveError,
  onSave,
  onReset,
  timedOut,
  cheatDetected,
  isReturningPlayer,
  onChangeName,
}) {
  const won = result === "won";
  const [copied, setCopied] = useState(false);
  const autoSubmitTried = useRef(false);
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const prizeLabel = formatRupiah(finalPrize);
  const prizeDefinition = cheatDetected ? CHEAT_DEFINITION : timedOut ? TIMEOUT_DEFINITION : getPrizeDefinition(finalPrize);

  // Kalau ini pemain yang udah pernah main (nama diinget dari localStorage),
  // langsung submit otomatis -- gak perlu ngetik/klik "Simpan" tiap kali.
  useEffect(() => {
    if (isReturningPlayer && playerName && !saved && !saving && !autoSubmitTried.current) {
      autoSubmitTried.current = true;
      onSave({ preventDefault: () => {} });
    }
  }, [isReturningPlayer, playerName, saved, saving, onSave]);
  const rankTitle = getRankTitle(finalPrize);

  const shareText = buildShareText({ prizeLabel, url: siteUrl });
  const shareLinks = buildShareLinks(shareText);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // clipboard bisa gagal di beberapa browser/permission; abaikan diam-diam
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: 460, textAlign: "center", fontFamily: "'Outfit', 'Trebuchet MS', sans-serif" }}>
      <div style={{ fontSize: 15, letterSpacing: "0.1em", color: won ? "#5cffa0" : "#ff8080", marginBottom: 8, fontWeight: 700 }}>
        {won ? "🎉 SELAMAT, JACKPOT!" : "💥 GAME OVER"}
      </div>
      <div
        style={{
          fontSize: finalPrize <= 0 ? 52 : 30,
          fontWeight: 800,
          color: "#ffce5c",
          opacity: finalPrize <= 0 ? 0.45 : 1,
          letterSpacing: finalPrize <= 0 ? "0.02em" : "normal",
          marginBottom: 6,
          lineHeight: 1.1,
        }}
      >
        {prizeLabel}
      </div>
      <div
        style={{
          display: "inline-block",
          fontSize: 11.5,
          fontWeight: 800,
          color: "#2a1400",
          background: "linear-gradient(90deg, #fff6d8, #ffce5c 40%, #ffa53c 70%, #ffce5c)",
          borderRadius: 999,
          padding: "4px 14px",
          marginBottom: 12,
          letterSpacing: "0.03em",
          boxShadow: "0 0 16px rgba(255,196,64,0.5), inset 0 1px 0 rgba(255,255,255,0.6)",
        }}
      >
        {rankTitle}
      </div>
      <div style={{ fontSize: 13.5, color: "#9fb0d8", marginBottom: 26 }}>
        {won
          ? "Kamu jawab semua soal dengan benar."
          : finalPrize <= 0
          ? "Waduh, hampir aja! Coba lagi yuk, siapa tahu kamu bisa jadi Miliarder hari ini!"
          : "Hadiah ini sesuai milestone terakhir yang berhasil kamu lewati."}
      </div>

      {!saved ? (
        isReturningPlayer ? (
          <div
            style={{
              background: "linear-gradient(180deg, #142a63 0%, #0b1a44 100%)",
              border: "2px solid #ffce5c",
              borderRadius: 14,
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 13.5, color: "#cdd6f5" }}>
              Nyimpen skor buat <b style={{ color: "#ffce5c" }}>"{playerName}"</b>...
            </div>
            {saveError && (
              <>
                <div style={{ color: "#ff8080", fontSize: 12.5 }}>{saveError}</div>
                <button onClick={() => onSave({ preventDefault: () => {} })} style={nextBtnStyle}>
                  Coba Lagi
                </button>
              </>
            )}
            <button
              onClick={onChangeName}
              style={{ background: "none", border: "none", color: "#7d8cbf", fontSize: 11.5, textDecoration: "underline", cursor: "pointer", fontFamily: "'Outfit', 'Trebuchet MS', sans-serif" }}
            >
              Bukan "{playerName}"? Ganti nama
            </button>
          </div>
        ) : (
          <form
            onSubmit={onSave}
            style={{
              background: "linear-gradient(180deg, #142a63 0%, #0b1a44 100%)",
              border: "2px solid #ffce5c",
              borderRadius: 14,
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <label style={{ fontSize: 12.5, color: "#cdd6f5", textAlign: "left" }}>Masukin nama buat masuk leaderboard:</label>
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={40}
              placeholder="Nama kamu"
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #3f5fa8",
                background: "#0c1840",
                color: "#eef2ff",
                fontSize: 15,
                fontFamily: "'Outfit', 'Trebuchet MS', sans-serif",
              }}
            />
            {saveError && <div style={{ color: "#ff8080", fontSize: 12.5 }}>{saveError}</div>}
            <button type="submit" disabled={saving || !playerName.trim()} style={{ ...nextBtnStyle, opacity: saving || !playerName.trim() ? 0.6 : 1 }}>
              {saving ? "Menyimpan…" : "Simpan ke Leaderboard"}
            </button>
            <div style={{ fontSize: 10.5, color: "#5c6a94" }}>
              Nama ini bakal diinget buat main berikutnya, jadi gak perlu ngetik ulang tiap kali.
            </div>
          </form>
        )
      ) : (
        <div
          style={{
            background: "linear-gradient(180deg, #142a63 0%, #0b1a44 100%)",
            border: "2px solid #ffce5c",
            borderRadius: 14,
            padding: "22px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 12.5, color: "#5cffa0", marginBottom: 8 }}>Skor tersimpan! 🎉</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", lineHeight: 1.5 }}>
              {finalPrize <= 0
                ? `Hadiah yang lo bawa pulang, ${playerName.trim() || "Pemain"}: Rp 0`
                : `Wih, ${playerName.trim() || "Pemain"} berhasil bawa pulang ${prizeLabel}! 🏆`}
            </div>
            <button
              onClick={onChangeName}
              style={{ background: "none", border: "none", color: "#7d8cbf", fontSize: 11, textDecoration: "underline", cursor: "pointer", fontFamily: "'Outfit', 'Trebuchet MS', sans-serif", marginTop: 8, padding: 0 }}
            >
              Bukan kamu? Ganti nama buat main berikutnya
            </button>
          </div>

          <div
            style={{
              background: "rgba(255,206,92,0.1)",
              border: "1px solid rgba(255,206,92,0.4)",
              borderRadius: 12,
              padding: "20px 20px",
              fontSize: 14.5,
              fontWeight: 600,
              color: "#f4f7ff",
              lineHeight: 1.75,
              textAlign: "left",
            }}
          >
            {prizeDefinition}
          </div>

          <div style={{ fontSize: 12.5, color: "#cdd6f5", lineHeight: 1.7, textAlign: "left" }}>
            Mau hadiahnya? Screenshot layar ini dan tag{" "}
            <a href={CERITAGENZ_X_URL} target="_blank" rel="noopener noreferrer" style={{ color: "#ffce5c", fontWeight: 700 }}>
              @ceritagenz
            </a>{" "}
            sekarang. Siapa tahu keberuntungan lo hari ini beda dari yang lain. Pamerin dulu aja, siapa tahu beneran dikira sultan! 😏
          </div>

          <div>
            <div style={{ fontSize: 11.5, color: "#7d8cbf", marginBottom: 8, textAlign: "left" }}>🔥 TANTANG TEMANMU! BAGIKAN HASILMU</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a
                href={shareLinks.x}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...shareBtnStyle, background: "#000" }}
              >
                <ShareIcon type="x" /> Bagikan
              </a>
              <a
                href={shareLinks.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...shareBtnStyle, background: "#25D366", color: "#0b1a44" }}
              >
                <ShareIcon type="whatsapp" /> WhatsApp
              </a>
              <button onClick={handleCopy} style={{ ...shareBtnStyle, background: "#3f5fa8", cursor: "pointer", border: "none" }}>
                <ShareIcon type={copied ? "check" : "link"} /> {copied ? "Tersalin!" : "Copy Link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {saved ? (
        <>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
            <button
              onClick={onReset}
              style={{
                ...nextBtnStyle,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65), inset 0 -2px 3px rgba(0,0,0,0.18), 0 0 20px rgba(255,196,64,0.6)",
                animation: "pulseGold 2s ease-in-out infinite",
              }}
            >
              Main Lagi
            </button>
            <Link href="/leaderboard" style={{ ...nextBtnStyle, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              Lihat Leaderboard
            </Link>
          </div>

          <a
            href={CERITAGENZ_X_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(10, 20, 50, 0.55)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: "1.5px solid #ffce5c",
              borderRadius: 999,
              padding: "8px 14px",
              textDecoration: "none",
              marginTop: 14,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "#000",
                color: "#fff",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              𝕏
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: "left", fontSize: 12.5, fontWeight: 700, color: "#fff" }}>
              Follow @ceritagenz
            </div>
            <div
              style={{
                flexShrink: 0,
                background: "linear-gradient(180deg, #ffce5c, #ffa53c)",
                color: "#0b1a44",
                fontWeight: 700,
                fontSize: 12,
                padding: "6px 14px",
                borderRadius: 999,
              }}
            >
              Follow
            </div>
          </a>
        </>
      ) : (
        <div style={{ marginTop: 18, fontSize: 12, color: "#7d8cbf" }}>
          Simpan skor dulu buat bisa main lagi atau lihat leaderboard ya.
        </div>
      )}
    </div>
  );
}

// Ikon outline konsisten (stroke-based, bukan campuran emoji) buat baris
// tombol share, biar keliatan lebih rapi & "satu keluarga" secara visual.
function ShareIcon({ type }) {
  const common = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (type === "x") {
    return (
      <svg {...common} style={{ flexShrink: 0 }}>
        <path d="M4 4l16 16M20 4L4 20" />
      </svg>
    );
  }
  if (type === "whatsapp") {
    return (
      <svg {...common} style={{ flexShrink: 0 }}>
        <path d="M3 21l1.6-4.8A8.5 8.5 0 1112 20.5a8.4 8.4 0 01-4.4-1.2z" />
        <path d="M8.5 9.5c0 3.5 2.5 6 6 6 .6 0 1-.4 1-1v-1.2c0-.3-.2-.6-.5-.7l-1.6-.5c-.3-.1-.6 0-.7.3l-.3.6a5 5 0 01-2.9-2.9l.6-.3c.3-.1.4-.4.3-.7l-.5-1.6c-.1-.3-.4-.5-.7-.5H8.5c-.6 0-1 .4-1 1z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (type === "check") {
    return (
      <svg {...common} style={{ flexShrink: 0 }}>
        <path d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg {...common} style={{ flexShrink: 0 }}>
      <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1.5 1.5" />
      <path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1.5-1.5" />
    </svg>
  );
}

// Efek partikel emas melayang, dipakai buat soal-soal high-stakes (25+)
// biar makin dramatis & bikin tegang.
// Nampilin teks huruf demi huruf kayak lagi diketik, dipakai buat jawaban
// "teman" di lifeline biar berasa lebih hidup.
function TypewriterText({ text, speedMs = 18 }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speedMs);
    return () => clearInterval(interval);
  }, [text, speedMs]);
  return <>{shown}</>;
}

function GoldParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 4 + Math.random() * 6,
        duration: 3 + Math.random() * 3,
        delay: Math.random() * 3,
      })),
    []
  );
  return (
    <div style={{ position: "relative", height: 0, overflow: "visible" }}>
      <style>{`
        @keyframes floatUpParticle {
          0% { transform: translateY(20px) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-140px) rotate(360deg); opacity: 0; }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            bottom: 0,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: "radial-gradient(circle, #fff6d8 0%, #ffce5c 60%, transparent 100%)",
            animation: `floatUpParticle ${p.duration}s ease-in ${p.delay}s infinite`,
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
}

function Shell({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "radial-gradient(ellipse at 50% -10%, #1a2f6b 0%, #0d1638 35%, #05081a 70%, #000000 100%)",
        fontFamily: "'Outfit', 'Georgia', serif",
        color: "#eef2ff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "28px 16px 60px",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

function Title() {
  return (
    <div style={{ textAlign: "center", marginBottom: 4 }}>
      <div style={{ fontSize: 13, letterSpacing: "0.35em", color: "#ffce5c", marginBottom: 4, fontFamily: "'Outfit', 'Trebuchet MS', sans-serif" }}>
        SIAPA INGIN JADI
      </div>
      <div
        style={{
          fontSize: 34,
          fontWeight: 700,
          background: "linear-gradient(180deg, #fff6d8 0%, #ffc94d 55%, #b4791c 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "0.04em",
        }}
      >
        MILIARDER
      </div>
    </div>
  );
}

function CenterMessage({ children, error }) {
  return (
    <div style={{ marginTop: 80, fontFamily: "'Outfit', 'Trebuchet MS', sans-serif", fontSize: 15, color: error ? "#ff8080" : "#cdd6f5", textAlign: "center", maxWidth: 420 }}>
      {children}
    </div>
  );
}

const topLinkStyle = {
  fontFamily: "'Outfit', 'Trebuchet MS', sans-serif",
  fontSize: 12.5,
  color: "#ffce5c",
  textDecoration: "none",
  border: "1px solid #ffce5c",
  borderRadius: 999,
  padding: "5px 14px",
};

const lifelineStyle = (disabled) => ({
  width: 56,
  height: 56,
  borderRadius: "50%",
  border: "2px solid #ffce5c",
  background: disabled ? "rgba(255,255,255,0.03)" : "linear-gradient(180deg, #1c3a7a, #0e2156)",
  color: disabled ? "#3d4870" : "#ffce5c",
  fontSize: 10.5,
  fontWeight: 700,
  cursor: disabled ? "default" : "pointer",
  fontFamily: "'Outfit', 'Trebuchet MS', sans-serif",
  opacity: disabled ? 0.4 : 1,
  boxShadow: disabled ? "none" : "0 0 10px rgba(255,196,64,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
});

const nextBtnStyle = {
  background: "linear-gradient(180deg, #fff6d8 0%, #ffce5c 18%, #eda52e 55%, #ffce5c 85%, #c9861e 100%)",
  color: "#241400",
  border: "1px solid rgba(255,255,255,0.5)",
  borderRadius: 999,
  padding: "10px 24px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'Outfit', 'Trebuchet MS', sans-serif",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65), inset 0 -2px 3px rgba(0,0,0,0.18), 0 0 14px rgba(255,196,64,0.35)",
};

const shareBtnStyle = {
  color: "#fff",
  borderRadius: 999,
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 700,
  fontFamily: "'Outfit', 'Trebuchet MS', sans-serif",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};
