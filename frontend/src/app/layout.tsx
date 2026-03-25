import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "CitySense - Shahar muammolarini hal qilish platformasi",
  description: "Shahar muammolarini xabar qiling, ovoz bering, analitika oling",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
      </head>
      <body className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-20">
        <TelegramInit />
        <main className="max-w-lg mx-auto px-4 pt-4">{children}</main>
        <Header />
      </body>
    </html>
  );
}

function TelegramInit() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            if (window.Telegram.WebApp.colorScheme === 'dark') {
              document.documentElement.classList.add('dark');
            }
          }
        `,
      }}
    />
  );
}
