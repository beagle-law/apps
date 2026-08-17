import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beagle総合法律事務所｜案件進捗管理",
  description: "Beagle総合法律事務所 内製ツール",
  icons: { icon: "/logo-mark.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
