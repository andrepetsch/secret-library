import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Secret Library",
  description: "A shared library for EPUB and PDF files",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
