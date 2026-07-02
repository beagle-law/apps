import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "案件進捗管理",
  description: "法律事務所 案件管理アプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
