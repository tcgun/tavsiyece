import { useState, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs, documentId, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { markAllNotificationsAsRead, markNotificationAsRead } from '../services/firebase/notificationService';
import { getAvatarUrlWithFallback } from '../utils';

/**
 * Bildirimleri yöneten custom hook
 */
export const useNotifications = (authUser) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Bildirimleri çek
   */
  const fetchNotifications = useCallback(async () => {
    if (!authUser?.uid) return;
    
    setIsLoading(true);
    setError(null);
    
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
  }, [authUser?.uid]);

  /**
   * Bildirimi okundu işaretle
   */
  const markAsRead = useCallback(async (notificationId) => {
    if (!authUser?.uid) return;
    try {
      await markNotificationAsRead(authUser.uid, notificationId);
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
    } catch (err) {
      console.warn('Bildirim okundu olarak işaretlenemedi:', err);
    }
  }, [authUser?.uid]);

  /**
   * Tüm bildirimleri okundu işaretle
   */
  const markAllAsRead = useCallback(async () => {
    if (!authUser?.uid || notifications.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsAsRead(authUser.uid);
    } catch (err) {
      console.warn('Tüm bildirimler okundu olarak işaretlenemedi:', err);
    }
  }, [authUser?.uid, notifications.length]);

  return {
    notifications,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  };
};

