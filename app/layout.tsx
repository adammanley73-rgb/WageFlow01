import './globals.css';
import { Inter } from 'next/font/google';
import SupportButton from '@/components/layout/SupportButton';
import Header from '../components/layout/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'WageFlow - UK Payroll Management',
  description: 'Professional payroll processing for UK businesses',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head />
      <body className={`${inter.className} bg-gray-100 min-h-screen`}>
        <Header />
        <main className="pb-20">
          {children}
        </main>
        <SupportButton />
      </body>
    </html>
  );
}