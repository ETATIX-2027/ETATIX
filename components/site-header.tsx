'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

const menuItems = [
  { href: '/', label: 'Beranda' },
  { href: '/events', label: 'Jelajah Event' },
  { href: '/my-tickets', label: 'Tiket Saya' },
  { href: '/dashboard', label: 'Dashboard Akun' },
  { href: '/organizer', label: 'Dashboard Organizer' },
  { href: '/login', label: 'Masuk' },
  { href: '/register', label: 'Daftar' },
];

function Icon({ name }: { name: 'home' | 'compass' | 'ticket' | 'search' | 'menu' }) {
  if (name === 'home') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2h-4v-9H9v9H5a2 2 0 0 1-2-2z" /></svg>;
  if (name === 'compass') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z" /></svg>;
  if (name === 'ticket') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9a2.5 2.5 0 0 1 0 6v2a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 21 17v-2a2.5 2.5 0 0 1 0-6V7a1.5 1.5 0 0 0-1.5-1.5h-15A1.5 1.5 0 0 0 3 7z" /><path d="M14 6v12" strokeDasharray="2.2 2.2" /></svg>;
  if (name === 'search') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    setSearchOpen(false);
    setMenuOpen(false);
    router.push(query ? `/events?search=${encodeURIComponent(query)}` : '/events');
  }

  const activePage = pathname === '/' ? 'home' : pathname.startsWith('/events') ? 'explore' : pathname.startsWith('/my-tickets') ? 'tickets' : '';

  return <>
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="site-logo" href="/" aria-label="ETATIX — Beranda">
          <span className="site-logo-icon"><img src="/logo.svg" alt="" width="42" height="42" /></span>
          <span className="site-brand-name"><strong>ETATIX</strong><em>TIX</em></span>
        </Link>
        <div className="site-header-actions">
          <span className="site-language" aria-label="Bahasa Indonesia"><span aria-hidden="true">🇮🇩</span><span>ID</span></span>
          <button className="site-icon-button" type="button" aria-label={searchOpen ? 'Tutup pencarian' : 'Cari event'} aria-expanded={searchOpen} onClick={() => { setSearchOpen(value => !value); setMenuOpen(false); }}>
            <Icon name="search" />
          </button>
          <div className="site-menu-wrap">
            <button className="site-icon-button" type="button" aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={menuOpen} aria-controls="site-menu-dropdown" onClick={() => { setMenuOpen(value => !value); setSearchOpen(false); }}>
              <Icon name="menu" />
            </button>
            {menuOpen && <nav className="site-dropdown" id="site-menu-dropdown" aria-label="Menu utama">
              {menuItems.map(item => <Link href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}
            </nav>}
          </div>
        </div>
      </div>
      {searchOpen && <div className="site-searchbar">
        <form role="search" onSubmit={submitSearch}>
          <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari event, penyelenggara, atau kota..." aria-label="Cari event, penyelenggara, atau kota" />
          <button type="submit" aria-label="Tampilkan hasil pencarian"><Icon name="search" /></button>
        </form>
      </div>}
    </header>
    <nav className="site-bottomnav" aria-label="Navigasi utama">
      <Link className={activePage === 'home' ? 'site-bottom-link active' : 'site-bottom-link'} href="/" aria-current={activePage === 'home' ? 'page' : undefined}><Icon name="home" />Beranda</Link>
      <Link className={activePage === 'explore' ? 'site-bottom-link active' : 'site-bottom-link'} href="/events" aria-current={activePage === 'explore' ? 'page' : undefined}><Icon name="compass" />Jelajah</Link>
      <Link className={activePage === 'tickets' ? 'site-bottom-link active' : 'site-bottom-link'} href="/my-tickets" aria-current={activePage === 'tickets' ? 'page' : undefined}><Icon name="ticket" />Tiket Saya</Link>
    </nav>
  </>;
}
