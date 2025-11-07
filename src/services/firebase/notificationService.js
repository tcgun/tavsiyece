import {
    collection,
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    setDoc,
    updateDoc,
    writeBatch,
    addDoc,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

/**
 * Genel bildirim oluşturur
 * @param {Object} notificationData - Bildirim verileri
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
            type: notificationData.type,
            commentText: notificationData.commentText || null
        });
        console.log(`Bildirim gönderildi (${notificationData.type}): ${notificationData.recipientId}`);
    } catch (error) {
        console.error(`Bildirim (${notificationData.type}) oluşturulurken hata oluştu:`, error);
    }
};

/**
 * Beğeni bildirimi oluşturur
 */
export const createLikeNotification = async (
  recommendationId,
  recommendationOwnerId,
  likerId,
  likerName,
  likerAvatar,
  recommendationTitle,
  recommendationImage
) => {
  try {
    // Kendi tavsiyesini beğendiğinde bildirim gönderme
    if (recommendationOwnerId === likerId) return;

    const notificationRef = doc(
      collection(db, 'users', recommendationOwnerId, 'notifications')
    );

    await setDoc(notificationRef, {
      type: 'Begeniler',
      senderId: likerId,
      senderName: likerName,
      senderPhotoURL: likerAvatar,
      message: 'tavsiyeni beğendi.',
      link: `/recommendation/${recommendationId}`,
      imageUrl: recommendationImage,
      createdAt: serverTimestamp(),
      isRead: false,
    });
  } catch (error) {
    console.error('Beğeni bildirimi oluşturma hatası:', error);
  }
};

/**
 * Yorum bildirimi oluşturur
 */
export const createCommentNotification = async (
  recommendationId,
  recommendationOwnerId,
  commenterId,
  commenterName,
  commenterAvatar,
  commentText,
  recommendationTitle,
  recommendationImage
) => {
  try {
    // Kendi tavsiyesine yorum yaptığında bildirim gönderme
    if (recommendationOwnerId === commenterId) return;

    const notificationRef = doc(
      collection(db, 'users', recommendationOwnerId, 'notifications')
    );

    await setDoc(notificationRef, {
      type: 'Yorumlar',
      senderId: commenterId,
      senderName: commenterName,
      senderPhotoURL: commenterAvatar,
      message: `tavsiyene yorum yaptı: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
      link: `/recommendation/${recommendationId}`,
      imageUrl: recommendationImage,
      createdAt: serverTimestamp(),
      isRead: false,
    });
  } catch (error) {
    console.error('Yorum bildirimi oluşturma hatası:', error);
  }
};

/**
 * Yorum yanıtı bildirimi oluşturur
 */
export const createReplyNotification = async (
  recommendationId,
  parentCommentOwnerId,
  replierId,
  replierName,
  replierAvatar,
  replyText,
  recommendationTitle,
  recommendationImage
) => {
  try {
    // Kendi yorumuna yanıt verdiğinde bildirim gönderme
    if (parentCommentOwnerId === replierId) return;

    const notificationRef = doc(
      collection(db, 'users', parentCommentOwnerId, 'notifications')
    );

    await setDoc(notificationRef, {
      type: 'Yanitlar',
      senderId: replierId,
      senderName: replierName,
      senderPhotoURL: replierAvatar,
      message: `yorumuna yanıt verdi: "${replyText.substring(0, 50)}${replyText.length > 50 ? '...' : ''}"`,
      link: `/recommendation/${recommendationId}`,
      imageUrl: recommendationImage,
      createdAt: serverTimestamp(),
      isRead: false,
    });
  } catch (error) {
    console.error('Yorum yanıtı bildirimi oluşturma hatası:', error);
  }
};

/**
 * Bildirimi okundu olarak işaretler
 */
export const markNotificationAsRead = async (
  userId,
  notificationId
) => {
  try {
    const notificationRef = doc(
      db,
      'users',
      userId,
      'notifications',
      notificationId
    );
    
    // Önce bildirimi kontrol et
    const notificationSnap = await getDoc(notificationRef);
    if (notificationSnap.exists()) {
      await updateDoc(notificationRef, {
        isRead: true
      });
    }
  } catch (error) {
    console.error('Bildirimi okundu olarak işaretleme hatası:', error);
  }
};

/**
 * Tüm bildirimleri okundu olarak işaretler
 */
export const markAllNotificationsAsRead = async (
  userId
) => {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const notificationsSnapshot = await getDocs(notificationsRef);
    
    const batch = writeBatch(db);
    notificationsSnapshot.forEach((doc) => {
      batch.update(doc.ref, { isRead: true });
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Tüm bildirimleri okundu olarak işaretleme hatası:', error);
  }
};

// Explicit exports (for Next.js Turbopack compatibility)
export {
  createNotification,
  createLikeNotification,
  createCommentNotification,
  createReplyNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
