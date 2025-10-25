'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Next.js Image bileşenini import ediyoruz
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
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

    const handleNotificationClick = async (notifId) => {
        if (!currentUser) return;
        const notifRef = doc(db, "users", currentUser.uid, "notifications", notifId);
        try {
            await updateDoc(notifRef, {
                isRead: true
            });
        } catch (error) {
            console.error("Bildirim güncellenirken hata:", error);
        }
    };
    
    const handleMarkAllAsRead = async () => {
        if (!currentUser || notifications.length === 0) return;

        const batch = writeBatch(db);
        notifications.forEach(notif => {
            if (!notif.isRead) {
                const notifRef = doc(db, "users", currentUser.uid, "notifications", notif.id);
                batch.update(notifRef, { "isRead": true });
            }
        });

        try {
            await batch.commit();
        } catch (error) {
            console.error("Tüm bildirimler okunurken hata:", error);
        }
    };


    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="loader"></div>
            </div>
        );
    }

    // Bu alt bileşeni, ana bileşenin dışında tanımlamak daha temiz bir yöntemdir.
    const NotificationItem = ({ notif }) => {
        const timeAgo = notif.createdAt ? new Date(notif.createdAt.seconds * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : '';
        
        const itemClass = notif.isRead ? 'bg-white' : 'bg-teal-50';

        return (
            <Link 
                href={notif.link || '#'} 
                className={`flex items-center space-x-4 p-4 hover:bg-gray-100 transition-colors ${itemClass}`}
                onClick={() => handleNotificationClick(notif.id)}
            >
                <div className="relative">
                    <Image 
                        className="w-12 h-12 rounded-full object-cover" 
                        src={notif.senderPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(notif.senderName)}&background=random&color=fff`} 
                        alt={notif.senderName}
                        width={48}
                        height={48}
                        unoptimized
                    />
                    {!notif.isRead && (
                        <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-teal-500 ring-2 ring-white"></span>
                    )}
                </div>

                <div className="flex-grow">
                    <p className="text-sm text-gray-800" dangerouslySetInnerHTML={{ __html: notif.message }}></p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
                </div>
                {notif.imageUrl && (
                     <Image 
                        src={notif.imageUrl} 
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0" 
                        alt="İlgili gönderi"
                        width={48}
                        height={48}
                    />
                )}
            </Link>
        );
    };

    const hasUnreadNotifications = notifications.some(notif => !notif.isRead);

    return (
        <div>
             <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                 <div className="p-4 flex justify-between items-center">
                    <div className="w-24"></div>
                    <h1 className="text-xl font-bold text-gray-800">Bildirimler</h1>
                    <div className="w-24 text-right">
                        {hasUnreadNotifications && (
                            <button onClick={handleMarkAllAsRead} className="text-sm font-semibold text-teal-600 hover:text-teal-800">
                                Hepsini Oku
                            </button>
                        )}
                    </div>
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

