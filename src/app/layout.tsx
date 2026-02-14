import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medical OCR - Intelligent Document Processing",
  description: "Nanonets-style IDP SaaS for document extraction, review, and automation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
