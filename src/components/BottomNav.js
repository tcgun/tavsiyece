'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
// Yeni hook'u import et
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';

const BottomNav = () => {
    const pathname = usePathname();
    // Hook'u çağırarak okunmamış bildirim sayısını al
    const unreadCount = useUnreadNotifications();

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
                    const isActive = item.href === '/' ? pathname === item.href : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            // Bildirimler linki için relative pozisyon eklendi
                            className={`relative flex flex-col items-center p-2 transition-colors ${isActive ? 'text-teal-600' : 'text-gray-500 hover:text-teal-600'}`}
                        >
                            <i className={`${item.icon} text-xl`}></i>
                            <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : ''}`}>{item.label}</span> {/* mt-1 eklendi */}

                            {/* --- YENİ: Bildirim İşareti --- */}
                            {item.href === '/bildirimler' && unreadCount > 0 && (
                                <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
                            )}
                            {/* --- Bildirim İşareti Sonu --- */}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;