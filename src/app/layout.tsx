import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Khmer Q&A Correction System",
  description:
    "A teacher workspace for reviewing and correcting Khmer question-and-answer datasets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="km">
      <body>{children}</body>
    </html>
  );
}
