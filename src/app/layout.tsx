import type { Metadata } from "next";
import { Anton, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const anton = Anton({
  weight: "400",
  variable: "--font-heading",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  variable: "--font-mono",
  subsets: ["latin"],
});

// Deliberately carries no `metadataBase`. It would be evaluated at build time
// for any statically prerendered descendant (`/guest-timer`,
// `/guest-timer-active`), baking the build-time origin into their metadata.
// `metadataBase` lives on the landing page instead — the only route with
// relative metadata URLs, and one that renders per request. A future route
// that adds a relative URL without one gets a build error, which is loud,
// rather than a silently wrong origin.
export const metadata: Metadata = {
  title: "Iron Pulse",
  description: "Inicia sesión con tu cuenta de Google",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${anton.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
