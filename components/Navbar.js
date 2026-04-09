'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Brain, BookOpen, MessageSquare, Search, Video, LogOut, LayoutDashboard, Trophy, Users } from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then(d => setUser(d.user));
  }, [pathname]);

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' });
    setUser(null);
    router.push('/login');
  }

  if (pathname === '/login') return null;

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/notes', label: 'Notes', icon: BookOpen },
    { href: '/qa', label: 'Q&A', icon: MessageSquare },
    { href: '/sessions', label: 'Sessions', icon: Video },
    { href: '/groups', label: 'Groups', icon: Users },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  return (
    <nav className="border-b border-border bg-panel/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center">
            <Brain size={20} color="white" />
          </div>
          <span className="text-lg font-bold gradient-text">Campus Brain</span>
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-accent/15 text-accent' : 'text-muted hover:text-white hover:bg-panel2'}`}>
                <Icon size={16} />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="text-right hidden sm:block">
                <div className="text-xs text-muted">{user.roll_number}</div>
                <div className="text-sm font-medium flex items-center gap-1 justify-end">
                  {user.name}
                  <span className="text-xs text-accent2">⚡{user.reputation}</span>
                </div>
              </div>
              <button onClick={logout} className="p-2 rounded-lg hover:bg-panel2 text-muted hover:text-white" title="Logout">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link href="/login" className="btn">Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
