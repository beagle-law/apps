import type { MetadataRoute } from "next";

// v25：スマホのホーム画面に追加して、アプリのように起動できるようにする（PWA）。
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Beagle総合法律事務所 案件進捗管理",
    short_name: "案件管理",
    description: "Beagle総合法律事務所 内製ツール",
    start_url: "/",
    display: "standalone",
    background_color: "#F1EDE4",
    theme_color: "#1B2A4A",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
