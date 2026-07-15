import "./globals.css";

export const metadata = {
  title: "Siapa Ingin Jadi Miliarder",
  description: "Kuis online — jawab benar terus naik level, salah satu kali langsung game over.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
