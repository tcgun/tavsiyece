'use client'; 

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const BottomNav = () => {
    const pathname = usePathname();

    const navItems = [
        { href: '/', icon: 'fas fa-home', label: 'Akış' },
        { href: '/arama', icon: 'fas fa-search', label: 'Ara' },
        { href: '/bildirimler', icon: 'fas fa-bell', label: 'Bildirimler' },
        { href: '/profil', icon: 'fas fa-user', label: 'Profil' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-t">
            <div className="container mx-auto max-w-lg flex justify-around py-2">
                {navItems.map((item) => {
                    // DÜZELTME BURADA YAPILDI
                    // Ana sayfa ('/') linki sadece tam eşleşmede aktif olsun.
                    // Diğer linkler ise (örneğin '/profil'), alt sayfalarında da ('/profil/123' gibi) aktif kalsın.
                    const isActive = item.href === '/' ? pathname === item.href : pathname.startsWith(item.href);
                    
                    return (
                        <Link key={item.href} href={item.href} className={`flex flex-col items-center p-2 transition-colors ${isActive ? 'text-teal-600' : 'text-gray-500 hover:text-teal-600'}`}>
                            <i className={`${item.icon} text-xl`}></i>
                            <span className={`text-xs ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;