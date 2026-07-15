import type { Metadata } from "next";
import "./globals.css";
import NavMenu from "./components/NavMenu";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: "Power Clean Niederrhein – Professionelle Hochdruckreinigung & Winterdienst",
  description:
    "Professionelle Hochdruckreinigung und zuverlässiger Winterdienst im Niederrhein. Terrassen-, Gehweg-, Balkon- und Auffahrtreinigung in Goch, Weeze, Kevelaer und Umgebung.",
  metadataBase: new URL("https://powercleanniederrhein.de"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full">
      <body className="min-h-full flex flex-col font-sans antialiased">
        <NavMenu />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
