import type { Metadata } from "next";
import { Noto_Sans_JP, Shippori_Mincho_B1 } from "next/font/google";
import { TabBar } from "../components/TabBar";
import "../styles/globals.css";

const notoSansJp = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-ui",
});

const shipporiMincho = Shippori_Mincho_B1({
  weight: ["600", "700"],
  subsets: ["latin"],
  variable: "--font-numeric",
});

export const metadata: Metadata = {
  title: "Nutrition App",
  description:
    "食品成分表(八訂)と食事摂取基準(2025)に基づく推定値を提示します。診断・助言は行いません。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSansJp.variable} ${shipporiMincho.variable}`}
    >
      <body>
        <main className="app-main">{children}</main>
        <TabBar />
      </body>
    </html>
  );
}
