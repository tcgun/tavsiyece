'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export const useUnreadNotifications = () => {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        let unsubscribeSnapshot = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            // Önceki listener'ı temizle
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }

            if (user) {
                try {
                    const notificationsRef = collection(db, "users", user.uid, "notifications");
                    // Sadece okunmamış (isRead: false) olanları sorgula
                    const q = query(notificationsRef, where("isRead", "==", false));

                    unsubscribeSnapshot = onSnapshot(
                        q,
                        (snapshot) => {
                            setUnreadCount(snapshot.size); // Okunmamış belge sayısını ayarla
                        },
                        (error) => {
                            // Permission hatası veya diğer hatalar durumunda
                            if (error.code === 'permission-denied') {
                                console.log("Bildirimler için yetki hatası:", error);
                                setUnreadCount(0);
                            } else {
                                console.error("Bildirimler dinlenirken hata:", error);
                                setUnreadCount(0);
                            }
                        }
                    );
                } catch (error) {
                    console.error("Bildirimler sorgusu oluşturulurken hata:", error);
                    setUnreadCount(0);
                }
            } else {
                setUnreadCount(0);
            }
        });

        return () => {
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
            }
            unsubscribeAuth();
        };
    }, []);

    return unreadCount;
};
