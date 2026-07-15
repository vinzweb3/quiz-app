// Bikin teks share yang catchy & santai -- satu template buat semua hasil
// (menang atau kalah, termasuk Rp 0), tinggal nominalnya beda-beda.
export function buildShareText({ prizeLabel, url }) {
  return (
    `Gue baru aja main kuis 'Siapa Ingin Jadi Miliarder' dan hasilnya ${prizeLabel}. 😅\n` +
    `Ternyata jadi orang kaya di dunia simulasi itu nggak segampang yang gue kira! 🤣\n` +
    `Yakin lu bisa dapet hasil lebih tinggi dari gue? Buktiin sendiri di sini 👇\n${url}`
  );
}

export function buildShareLinks(text) {
  const encodedText = encodeURIComponent(text);
  return {
    x: `https://twitter.com/intent/tweet?text=${encodedText}`,
    whatsapp: `https://wa.me/?text=${encodedText}`,
  };
}

export const CERITAGENZ_X_URL = "https://x.com/ceritagenz";
