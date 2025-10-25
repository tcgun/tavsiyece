import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Ana yapılandırma dosyasından db'yi import et

/**
 * Firestore'da bir kullanıcı için yeni bir bildirim oluşturur.
 * @param {object} notificationData Bildirim verileri.
 * @param {string} notificationData.recipientId Bildirimi alacak kullanıcının ID'si.
 * @param {string} notificationData.senderName Gönderenin adı.
 * @param {string} notificationData.senderPhotoURL Gönderenin profil fotoğrafı.
 * @param {string} notificationData.message HTML formatında bildirim mesajı.
 * @param {string} notificationData.link Tıklandığında gidilecek URL.
 * @param {string} [notificationData.imageUrl] İsteğe bağlı, ilgili gönderi resmi.
 */
export const createNotification = async (notificationData) => {
    // recipientId'nin kendimiz olmamasını kontrol et, kendi kendimize bildirim göndermeyelim.
    if (!notificationData.recipientId || notificationData.recipientId === notificationData.senderId) {
        return;
    }

    try {
        const notificationsRef = collection(db, "users", notificationData.recipientId, "notifications");
        await addDoc(notificationsRef, {
            senderId: notificationData.senderId,
            senderName: notificationData.senderName,
            senderPhotoURL: notificationData.senderPhotoURL,
            message: notificationData.message,
            link: notificationData.link,
            imageUrl: notificationData.imageUrl || null,
            isRead: false, // Okunmadı olarak işaretle
            createdAt: serverTimestamp() // Sunucu zaman damgası ekle
        });
    } catch (error) {
        console.error("Bildirim oluşturulurken hata oluştu:", error);
    }
};