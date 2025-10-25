import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Firestore'da bir kullanıcı için yeni bir bildirim oluşturur.
 * (Alıcının ayarlarını KONTROL ETMEZ - şimdilik her zaman gönderir).
 * @param {object} notificationData Bildirim verileri.
 * @param {string} notificationData.recipientId Bildirimi alacak kullanıcının ID'si.
 * @param {string} notificationData.senderId Gönderenin ID'si.
 * @param {string} notificationData.senderName Gönderenin adı.
 * @param {string} notificationData.senderPhotoURL Gönderenin profil fotoğrafı.
 * @param {string} notificationData.message HTML formatında bildirim mesajı.
 * @param {string} notificationData.link Tıklandığında gidilecek URL.
 * @param {string} [notificationData.imageUrl] İsteğe bağlı, ilgili gönderi resmi.
 * @param {'yeniTakipciler' | 'begeniler' | 'arkadasAktivitesi'} notificationData.type Bildirim türü.
 */
export const createNotification = async (notificationData) => {
    // Kendine bildirim göndermeyi engelle
    if (!notificationData.recipientId || notificationData.recipientId === notificationData.senderId) {
        console.log("Kendine bildirim gönderilemez.");
        return;
    }

    // Gerekli alanlar eksikse engelle
    if (!notificationData.type || !notificationData.senderId || !notificationData.message || !notificationData.link) {
         console.error("Bildirim oluşturmak için gerekli alanlar eksik:", notificationData);
         return;
    }

    try {
        // --- AYAR KONTROLÜ KALDIRILDI ---
        /*
        // 1. Alıcının bildirim ayarlarını Firestore'dan çek
        const settingsRef = doc(db, "users", notificationData.recipientId, "settings", "notifications");
        const settingsSnap = await getDoc(settingsRef);

        let isEnabled = true; // Varsayılan olarak açık kabul edelim
        if (settingsSnap.exists()) {
            const settingsData = settingsSnap.data();
            if (settingsData[notificationData.type] !== undefined) {
                isEnabled = settingsData[notificationData.type];
            }
        } else {
             console.log(`Bildirim ayarları bulunamadı (${notificationData.recipientId}), bildirim gönderiliyor.`);
        }

        // 2. Eğer ayar açıksa, bildirimi oluştur
        if (isEnabled) {
           // ... (addDoc kısmı aşağı taşındı) ...
        } else {
            console.log(`Bildirim engellendi (ayar kapalı - ${notificationData.type}): ${notificationData.recipientId}`);
        }
        */
        // --- AYAR KONTROLÜ SONU ---

        // Bildirimi doğrudan oluştur
        console.log(`Bildirim oluşturuluyor (${notificationData.type}): ${notificationData.recipientId}`);
        const notificationsRef = collection(db, "users", notificationData.recipientId, "notifications");
        await addDoc(notificationsRef, {
            senderId: notificationData.senderId,
            senderName: notificationData.senderName || null,
            senderPhotoURL: notificationData.senderPhotoURL || null,
            message: notificationData.message,
            link: notificationData.link,
            imageUrl: notificationData.imageUrl || null,
            isRead: false,
            createdAt: serverTimestamp(),
            type: notificationData.type
        });
        console.log(`Bildirim gönderildi (${notificationData.type}): ${notificationData.recipientId}`);


    } catch (error) {
        // Bu hata artık izin hatası olmamalı, daha çok ağ veya Firestore hatası olabilir.
        console.error(`Bildirim (${notificationData.type}) oluşturulurken hata oluştu:`, error);
    }
};