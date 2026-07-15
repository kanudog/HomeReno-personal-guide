import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Allerta_Stencil } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const stencil = Allerta_Stencil({
  variable: "--font-stencil",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HomeReno",
  description:
    "Parametric DIY renovation assistant — framing, plumbing, electrical, and drop ceiling plans generated from your exact dimensions.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${stencil.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
