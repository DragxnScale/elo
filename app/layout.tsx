import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import DotField from "@/components/kokonutui/dot-field";
import { ThemeScript } from "@/components/ui/theme-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kleos",
  description: "Live ELO leaderboards with share codes and match tracking",
};

export const viewport: Viewport = {
  // Phone browser chrome matches the paper / charcoal page.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#12100e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        {/*
          The interactive halftone sits behind every page: swipe for a wake,
          tap empty space for a ring. Its canvas is pinned to the viewport,
          the dots take --border-strong, and the page keeps its own colours.
        */}
        <DotField
          fixed
          spacing={16}
          className="min-h-dvh flex-1 flex-col items-stretch justify-start overflow-visible bg-background text-foreground dark:bg-background dark:text-foreground [&_canvas]:text-border-strong"
        >
          <div className="relative flex flex-1 flex-col">{children}</div>
        </DotField>
      </body>
    </html>
  );
}
