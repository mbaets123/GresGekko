import type { Metadata } from "next";
import { Titan_One, Kanit } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const titanOne = Titan_One({
  weight: "400",
  variable: "--font-heading",
  subsets: ["latin"],
});

const kanit = Kanit({
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Biologie Leeromgeving | Grescollege VMBO-KT",
  description:
    "Online leeromgeving voor biologie VMBO-KT leerjaar 1 met AI-ondersteuning, videolessen en oefenvragen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      className={`${titanOne.variable} ${kanit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
