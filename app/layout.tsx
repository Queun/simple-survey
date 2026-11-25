import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "学校匿名评教系统",
  description: "学生匿名评价本班任课教师",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
