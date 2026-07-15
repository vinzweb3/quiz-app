"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

function formatTimeAgo(isoString) {
  if (!isoString) return "";
  const then = new Date(isoString).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return "baru saja";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return new Date(isoString).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

const MEDALS = ["🥇", "🥈", "🥉"];

const SCORE_COLUMNS = "id, player_name, prize_label, prize_amount, questions_answered, result, created_at";

export default function Leaderboard() {
  const [topRows, setTopRows] = useState([]);
  const [latestRows, setLatestRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [myScoreIds, setMyScoreIds] = useState([]);

  useEffect(() => {
    try {
      const ids = JSON.parse(window.localStorage.getItem("quiz-my-score-ids") || "[]");
      setMyScoreIds(ids);
    } catch (e) {
      // localStorage gak tersedia; abaikan, cuma berarti gak ada highlight
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [topResult, latestResult] = await Promise.all([
        supabase.from("scores").select(SCORE_COLUMNS).order("prize_amount", { ascending: false }).limit(10),
        supabase.from("scores").select(SCORE_COLUMNS).order("created_at", { ascending: false }).limit(10),
      ]);
      if (cancelled) return;
      if (topResult.error) setError(topResult.error.message);
      else if (latestResult.error) setError(latestResult.error.message);
      else {
        setTopRows(topResult.data || []);
        setLatestRows(latestResult.data || []);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 13, letterSpacing: "0.35em", color: "#ffce5c", marginBottom: 4, fontFamily: "'Outfit', 'Trebuchet MS', sans-serif" }}>
          PAPAN PERINGKAT
        </div>
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            background: "linear-gradient(180deg, #fff6d8 0%, #ffc94d 55%, #b4791c 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          LEADERBOARD
        </div>
      </div>

      <Link
        href="/"
        style={{
          fontFamily: "'Outfit', 'Trebuchet MS', sans-serif",
          fontSize: 12.5,
          color: "#ffce5c",
          textDecoration: "none",
          border: "1px solid #ffce5c",
          borderRadius: 999,
          padding: "5px 14px",
          marginBottom: 8,
        }}
      >
        ← Main Kuis
      </Link>
      <div style={{ fontSize: 11.5, color: "#7d8cbf", marginBottom: 20, fontFamily: "'Outfit', 'Trebuchet MS', sans-serif" }}>
        🔥 Sekalian tantang temanmu buat ngalahin skor kamu!
      </div>

      {loading && <div style={{ color: "#cdd6f5", fontFamily: "'Outfit', 'Trebuchet MS', sans-serif" }}>Memuat leaderboard…</div>}
      {error && <div style={{ color: "#ff8080", fontFamily: "'Outfit', 'Trebuchet MS', sans-serif" }}>{error}</div>}

      {!loading && !error && (
        <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 24 }}>
          <LeaderboardSection
            title="🏆 HADIAH TERTINGGI"
            emptyText="Belum ada skor. Jadilah yang pertama main!"
            rows={topRows}
            mode="prize"
            myScoreIds={myScoreIds}
          />
          <LeaderboardSection
            title="🕐 TERBARU SUBMIT"
            emptyText="Belum ada yang main."
            rows={latestRows}
            mode="recent"
            myScoreIds={myScoreIds}
            live
          />
        </div>
      )}
    </div>
  );
}

function LeaderboardSection({ title, emptyText, rows, mode, myScoreIds, live }) {
  return (
    <div>
      <div
        style={{
          fontSize: 12.5,
          letterSpacing: "0.1em",
          color: "#ffce5c",
          marginBottom: 8,
          fontFamily: "'Outfit', 'Trebuchet MS', sans-serif",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {title}
        {live && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              color: "#5cffa0",
              fontWeight: 700,
              letterSpacing: "normal",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#5cffa0",
                display: "inline-block",
                animation: "pulseLive 1.2s ease-in-out infinite",
              }}
            />
            LIVE
          </span>
        )}
      </div>
      <style>{`
        @keyframes pulseLive {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
      <div
        style={{
          background: "linear-gradient(180deg, #142a63 0%, #0b1a44 100%)",
          border: "2px solid #ffce5c",
          borderRadius: 14,
          padding: "10px 16px",
          fontFamily: "'Outfit', 'Trebuchet MS', sans-serif",
        }}
      >
        {rows.length === 0 && (
          <div style={{ padding: "16px 4px", color: "#cdd6f5", textAlign: "center", fontSize: 13 }}>{emptyText}</div>
        )}
        {rows.map((r, i) => {
          const isMine = myScoreIds.includes(r.id);
          return (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 8px",
                margin: "0 -8px",
                borderRadius: 10,
                background: isMine ? "rgba(255,206,92,0.14)" : "transparent",
                border: isMine ? "1px solid #ffce5c" : "1px solid transparent",
                borderBottom:
                  i === rows.length - 1 && !isMine ? "none" : isMine ? "1px solid #ffce5c" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ width: 26, fontWeight: 700, fontSize: mode === "prize" && i < 3 ? 17 : 13, color: mode === "prize" && i < 3 ? "#ffce5c" : "#7d8cbf" }}>
                {mode === "prize" && i < 3 ? MEDALS[i] : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.player_name}
                  {isMine && <span style={{ color: "#ffce5c", fontSize: 11, marginLeft: 6 }}>(kamu)</span>}
                </div>
                <div style={{ fontSize: 11.5, color: "#7d8cbf" }}>
                  {r.result === "won" ? "🏆 Menang" : `Sampai soal ${r.questions_answered}`} · {formatTimeAgo(r.created_at)}
                </div>
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "#ffce5c", whiteSpace: "nowrap" }}>{r.prize_label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
