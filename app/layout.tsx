import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "爪爪图鉴｜宠物知识与像素家园",
  description: "认识宠物、学习科学饲养知识，并陪伴你的像素伙伴成长。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
