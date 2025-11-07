'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { collection, documentId, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { markAllNotificationsAsRead, markNotificationAsRead } from '../../services/firebase/notificationService';
import { formatRelativeTime, getAvatarUrlWithFallback } from '../../utils';

// Bildirim Öğesi
const NotificationItem = ({ item, onMarkAsRead }) => {
    const router = useRouter();
    const [isRead, setIsRead] = useState(item.isRead);

    const markAsRead = async () => {
        if (isRead) return;
        setIsRead(true);
        await onMarkAsRead(item.id);
    };

    const handlePress = async () => {
        await markAsRead();

        if (item.linkPath === '/tavsiye/[id]' || item.linkPath === '/recommendation/[id]') {
            router.push(`/tavsiye/${item.linkParams.id}`);
        }
    };

    const containerClass = isRead
        ? 'bg-[#1C1424]'
        : 'bg-[#2a1f3d]';

    return (
        <button
            onClick={handlePress}
            className={`w-full flex items-start gap-4 p-4 border-b border-[rgba(255,255,255,0.1)] hover:bg-[#2a1f3d] transition-colors ${containerClass}`}
        >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
                <Image
                    src={item.sender.avatar}
                    alt={item.sender.name}
                    width={48}
                    height={48}
                    className="rounded-full object-cover"
                    unoptimized
                />
                {!isRead && (
                    <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-[#BA68C8] ring-2 ring-[#1C1424]"></span>
                )}
            </div>

            {/* Metin */}
            <div className="flex-1 text-left">
                <p className="text-[#f8fafc] text-sm leading-6">
                    <span className="font-bold">{item.sender.name}</span>
                    {` ${item.message}`}
                    {item.commentText && (
                        <span className="text-[#9ca3af]">{`: "${item.commentText}"`}</span>
                    )}
                </p>
                <p className="text-xs text-[#9ca3af] mt-1">
                    {formatRelativeTime(item.createdAt)}
                </p>
            </div>

            {/* Görsel */}
            {item.imageUrl && (
                <Image
                    src={item.imageUrl}
                    alt="İlgili gönderi"
                    width={48}
                    height={48}
                    className="rounded-lg object-cover flex-shrink-0"
                    unoptimized
                />
            )}
        </button>
    );
};

// Ana Ekran
export default function NotificationsPage() {
    const { user: authUser, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Tümünü Okundu Yap
    const markAllAsRead = async () => {
        if (!authUser?.uid || notifications.length === 0) return;

        // UI anında güncelle
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

        // Firestore batch güncellemesi
        try {
            await markAllNotificationsAsRead(authUser.uid);
        } catch (err) {
            console.warn('Tüm bildirimler okundu olarak işaretlenemedi:', err);
        }
    };

    // Tek bildirimi okundu yap
    const handleMarkAsRead = async (notificationId) => {
        if (!authUser?.uid) return;
        try {
            await markNotificationAsRead(authUser.uid, notificationId);
        } catch (err) {
            console.warn('Bildirim okundu olarak işaretlenemedi:', err);
        }
    };

    useEffect(() => {
        const fetchNotifications = async () => {
            setIsLoading(true);
            setError(null);

            if (!authUser?.uid) {
                setError('Bildirimleri görmek için giriş yapmalısınız.');
                setIsLoading(false);
                return;
            }

            try {
                const notifQuery = query(
                    collection(db, 'users', authUser.uid, 'notifications'),
                    orderBy('createdAt', 'desc'),
                    limit(30)
                );
                const notifSnapshot = await getDocs(notifQuery);

                if (notifSnapshot.empty) {
                    setNotifications([]);
                    setIsLoading(false);
                    return;
                }

                const fetchedNotifs = [];
                const senderIds = new Set();

                notifSnapshot.forEach(doc => {
                    const data = doc.data();
                    fetchedNotifs.push({ id: doc.id, ...data });
                    if (data.senderId && typeof data.senderId === 'string') senderIds.add(data.senderId);
                });

                const userMap = new Map();
                if (senderIds.size > 0) {
                    const userIdsArray = Array.from(senderIds);
                    const promises = [];
                    
                    // Paralel sorgularla kullanıcı verilerini çek
                    for (let i = 0; i < userIdsArray.length; i += 10) {
                        const batch = userIdsArray.slice(i, i + 10);
                        const usersQuery = query(
                            collection(db, 'users'),
                            where(documentId(), 'in', batch)
                        );
                        promises.push(getDocs(usersQuery));
                    }
                    
                    const snapshots = await Promise.all(promises);
                    snapshots.forEach(snapshot => {
                        snapshot.forEach((doc) => {
                            const data = doc.data();
                            userMap.set(doc.id, {
                                name: data.name || data.username || 'Bilinmeyen',
                                photoURL: data.photoURL || getAvatarUrlWithFallback(null, data.name, data.username),
                            });
                        });
                    });
                }

                const finalNotifications = fetchedNotifs.map(notif => {
                    const senderInfo = userMap.get(notif.senderId);

                    let messageText = 'yeni bir bildirim gönderdi.';
                    if (notif.type === 'Begeniler') messageText = 'tavsiyeni beğendi.';
                    if (notif.type === 'Yorumlar') messageText = 'tavsiyene yorum yaptı';
                    if (notif.type === 'Yanitlar') messageText = 'yorumuna yanıt verdi';
                    if (notif.type === 'Takip') messageText = 'seni takip etmeye başladı.';

                    let commentText;
                    if (notif.type === 'Yorumlar' && typeof notif.message === 'string' && notif.message.includes(': "')) {
                        try {
                            commentText = notif.message.split(': "')[1]?.slice(0, -1);
                        } catch {}
                    }

                    let finalLinkPath = '/bildirimler';
                    let finalLinkParams = {};

                    if (notif.link && typeof notif.link === 'string' && (notif.link.startsWith('/recommendation/') || notif.link.startsWith('/tavsiye/'))) {
                        const parts = notif.link.split('/');
                        const recId = parts[parts.length - 1];
                        if (recId) {
                            finalLinkPath = '/tavsiye/[id]';
                            finalLinkParams = { id: recId };
                        }
                    }

                    return {
                        id: notif.id,
                        type: notif.type,
                        sender: {
                            id: notif.senderId,
                            name: senderInfo?.name || notif.senderName || 'Biri',
                            avatar: getAvatarUrlWithFallback(
                                senderInfo?.photoURL || notif.senderPhotoURL,
                                senderInfo?.name || notif.senderName,
                                undefined
                            ),
                        },
                        linkPath: finalLinkPath,
                        linkParams: finalLinkParams,
                        imageUrl: notif.imageUrl || null,
                        message: messageText,
                        commentText: commentText,
                        createdAt: notif.createdAt,
                        isRead: notif.isRead,
                    };
                });

                setNotifications(finalNotifications);
            } catch (err) {
                console.error('Bildirimler çekilirken hata:', err);
                setError('Bildirimler yüklenemedi: ' + err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (!authLoading && authUser) {
            fetchNotifications();
        } else if (!authLoading && !authUser) {
            router.push('/giris');
        }
    }, [authUser, authLoading, router]);

    const hasUnreadNotifications = notifications.some(notif => !notif.isRead);

    if (authLoading || isLoading) {
        return (
            <div className="w-full min-h-screen bg-[#1C1424] flex items-center justify-center">
                <div className="loader"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full min-h-screen bg-[#1C1424] flex flex-col items-center justify-center p-4">
                <i className="fas fa-exclamation-circle text-4xl text-red-500 mb-4"></i>
                <p className="text-red-500 text-center">{error}</p>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-[#1C1424] pb-20">
            <header className="sticky top-0 z-10 bg-[#1C1424]/90 backdrop-blur-sm shadow-sm border-b border-[rgba(255,255,255,0.1)]">
                <div className="p-4 flex justify-between items-center">
                    <button
                        onClick={() => router.back()}
                        className="text-[#9ca3af] hover:bg-[#2a1f3d] w-10 h-10 flex items-center justify-center rounded-full transition-colors"
                    >
                        <i className="fas fa-arrow-left text-lg"></i>
                    </button>
                    <h1 className="text-xl font-bold text-[#f8fafc]">Bildirimler</h1>
                    <div className="w-24 text-right">
                        {hasUnreadNotifications && (
                            <button
                                onClick={markAllAsRead}
                                className="text-sm font-semibold text-[#BA68C8] hover:text-[#9c4fb8]"
                            >
                                <i className="fas fa-check-double"></i>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main>
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                        <div className="w-24 h-24 bg-[#BA68C8]/20 rounded-full flex items-center justify-center mb-6">
                            <i className="fas fa-bell-slash text-4xl text-[#BA68C8]"></i>
                        </div>
                        <h2 className="text-xl font-bold text-[#f8fafc] mb-2">Henüz bir bildirimin yok.</h2>
                        <p className="text-sm text-[#9ca3af] text-center max-w-xs">
                            Yeni tavsiyeler keşfetmeye ve insanlarla etkileşime geçmeye ne dersin?
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-[rgba(255,255,255,0.1)]">
                        {notifications.map(notif => (
                            <NotificationItem
                                key={notif.id}
                                item={notif}
                                onMarkAsRead={handleMarkAsRead}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
