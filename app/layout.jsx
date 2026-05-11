// layout.jsx: Root layout that wraps all pages with global providers, fonts, and metadata
import './globals.css';

export const metadata = {
  title: 'St Francis Xavier Choir',
  description: 'Choir Attendance, Punctuality & Eligibility System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased text-gray-900 bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
