import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
// --- DÜZELTME: FirebaseConfig yolu düzeltildi (src/hooks -> src) ---
import { auth, db } from '../firebaseConfig'; // Bir seviye yukarı çıkmak yeterli

// --- DÜZELTME: export eklendi ---
export function useUnreadNotifications() {
// --- DÜZELTME SONU ---
    const [unreadCount, setUnreadCount] = useState(0);
    const [userId, setUserId] = useState(null);

    // Kullanıcı oturumunu dinle
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                setUserId(null);
                setUnreadCount(0); // Kullanıcı yoksa sayacı sıfırla
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // Kullanıcı ID'si değiştiğinde veya geldiğinde bildirimleri dinle
    useEffect(() => {
        if (!userId) {
            setUnreadCount(0); // Kullanıcı ID'si yoksa sıfırla
            return; // Listener'ı başlatma
        }

        // Okunmamış bildirimleri sorgula
        const notificationsRef = collection(db, "users", userId, "notifications");
        const q = query(notificationsRef, where("isRead", "==", false));

        // Değişiklikleri dinle
        const unsubscribeNotifications = onSnapshot(q, (snapshot) => {
            setUnreadCount(snapshot.size); // Okunmamış belge sayısını state'e ata
        }, (error) => {
            console.error("Okunmamış bildirimler dinlenirken hata:", error);
            setUnreadCount(0); // Hata durumunda sıfırla
        });

        // Component kaldırıldığında veya userId değiştiğinde listener'ı temizle
        return () => unsubscribeNotifications();

    }, [userId]); // Sadece userId değiştiğinde çalıştır

    return unreadCount; // Okunmamış bildirim sayısını döndür
}