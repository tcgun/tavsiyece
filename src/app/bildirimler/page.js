'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                // Kullanıcının bildirimler alt koleksiyonunu dinle
                const notificationsRef = collection(db, "users", user.uid, "notifications");
                const q = query(notificationsRef, orderBy("createdAt", "desc"));

                const unsubscribeNotifications = onSnapshot(q, (snapshot) => {
                    const notifsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setNotifications(notifsData);
                    setLoading(false);
                });

                return () => unsubscribeNotifications();
            } else {
                router.push('/giris');
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="loader"></div>
            </div>
        );
    }

    const NotificationItem = ({ notif }) => {
        const timeAgo = notif.createdAt ? new Date(notif.createdAt.seconds * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : '';
        
        return (
            <Link href={notif.link || '#'} className="flex items-center space-x-4 p-4 hover:bg-gray-50 transition-colors">
                <img className="w-12 h-12 rounded-full object-cover" src={notif.senderPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(notif.senderName)}&background=random&color=fff`} alt={notif.senderName} />
                <div className="flex-grow">
                    {/* HTML içeriğini güvenli bir şekilde render etmek için */}
                    <p className="text-sm text-gray-800" dangerouslySetInnerHTML={{ __html: notif.message }}></p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
                </div>
                {notif.imageUrl && (
                     <img src={notif.imageUrl} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" alt="İlgili gönderi" />
                )}
            </Link>
        );
    };

    return (
        <div>
             <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                 <div className="p-4 flex justify-center items-center">
                    <h1 className="text-xl font-bold text-gray-800">Bildirimler</h1>
                </div>
            </header>
            <main className="divide-y divide-gray-100">
                {notifications.length > 0 ? (
                    notifications.map(notif => <NotificationItem key={notif.id} notif={notif} />)
                ) : (
                    <div className="text-center py-20 flex flex-col items-center">
                        <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center">
                            <i className="far fa-bell-slash text-4xl text-teal-500"></i>
                        </div>
                        <h2 className="mt-6 text-xl font-bold text-gray-800">Hiç Bildirimin Yok</h2>
                        <p className="mt-2 text-sm text-gray-600 max-w-xs">
                            Uygulamada etkileşime girdikçe bildirimlerin burada görünecek.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};