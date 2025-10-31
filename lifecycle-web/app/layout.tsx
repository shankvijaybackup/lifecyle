import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";

export const metadata = { title: "Lifecycle — Free EoL/EoS Lookup" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
