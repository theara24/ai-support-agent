import './globals.css';
import Providers from './providers';
import Sidebar from '@/components/Sidebar';

export const metadata = {
  title: 'AI Support Agent Platform',
  description: 'Enterprise AI Customer Support Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-slate-50 text-slate-900 antialiased">
        <Providers>
          <div className="flex h-full w-full overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
