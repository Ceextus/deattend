// page.jsx: Root page — redirects authenticated users to /dashboard
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
}
