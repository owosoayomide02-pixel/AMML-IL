import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { appConfig } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(appConfig.appUrl),
  title: {
    default: `${appConfig.shortName} Inventory`,
    template: `%s · ${appConfig.shortName}`,
  },
  description: appConfig.description,
  icons: {
    icon: "/aaml-mark.png",
    apple: "/aaml-mark.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
