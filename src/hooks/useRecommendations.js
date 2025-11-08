import { useState, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs, documentId } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getFollowing } from '../services/firebase/userService';
import { getAvatarUrlWithFallback } from '../utils';

const RECOMMENDATIONS_PER_PAGE = 20;

/**
 * Tavsiyeleri yöneten custom hook
 */
export const useRecommendations = (authUser, type = 'following') => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Takip edilen kullanıcıların tavsiyelerini çek
   */
  const fetchFollowingRecommendations = useCallback(async () => {
    if (!authUser?.uid) {
      setRecommendations([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const followingList = await getFollowing(authUser.uid, 100);
      const followingIds = new Set(followingList.map(user => user.id));
      followingIds.add(authUser.uid);
      
      const followingIdsArray = Array.from(followingIds);
      let allRecsData = [];
      
      if (followingIdsArray.length === 0) {
        setRecommendations([]);
        setIsLoading(false);
        return;
      }

      const batchSize = 10;
      const recPromises = [];
      for (let i = 0; i < followingIdsArray.length; i += batchSize) {
        const batch = followingIdsArray.slice(i, i + batchSize);
        const recsQueryBatch = query(
          collection(db, 'recommendations'),
          where('userId', 'in', batch),
          orderBy('createdAt', 'desc'),
          limit(RECOMMENDATIONS_PER_PAGE)
        );
        recPromises.push(getDocs(recsQueryBatch));
      }
      
      const snapshots = await Promise.all(recPromises);
      const seenIds = new Set();
      
      snapshots.forEach(snapshot => {
        snapshot.forEach((doc) => {
          if (!seenIds.has(doc.id)) {
            seenIds.add(doc.id);
            allRecsData.push({ id: doc.id, ...doc.data() });
          }
        });
      });
      
      // Kullanıcı bilgilerini çek
      const userIDs = new Set(allRecsData.map(rec => rec.userId).filter(Boolean));
      const userMap = new Map();
      
      if (userIDs.size > 0) {
        const userIdsArray = Array.from(userIDs);
        const userPromises = [];
        for (let i = 0; i < userIdsArray.length; i += 10) {
          const batch = userIdsArray.slice(i, i + 10);
          const usersQuery = query(
            collection(db, 'users'),
            where(documentId(), 'in', batch)
          );
          userPromises.push(getDocs(usersQuery));
        }
        const userSnapshots = await Promise.all(userPromises);
        userSnapshots.forEach(snapshot => {
          snapshot.forEach((doc) => {
            const data = doc.data();
            userMap.set(doc.id, {
              username: data.username || 'bilinmeyen',
              photoURL: data.photoURL || '',
              name: data.name || '',
            });
          });
        });
      }
      
      // Beğeni durumlarını çek
      let likedRecommendationIds = new Set();
      const likesQuery = query(collection(db, 'users', authUser.uid, 'likedRecommendations'));
      const likesSnapshot = await getDocs(likesQuery);
      likesSnapshot.forEach(doc => {
        likedRecommendationIds.add(doc.id);
      });
      
      // Beğeni ve yorum sayılarını çek
      const recommendationIds = allRecsData.map(rec => rec.id);
      const countsMap = new Map();
      
      if (recommendationIds.length > 0) {
        const countPromises = recommendationIds.map(async (recId) => {
          try {
            const [likesSnap, commentsSnap] = await Promise.all([
              getDocs(collection(db, 'recommendations', recId, 'likes')),
              getDocs(collection(db, 'recommendations', recId, 'comments'))
            ]);
            return {
              id: recId,
              likeCount: likesSnap.size,
              commentCount: commentsSnap.size
            };
          } catch (error) {
            console.error(`Sayılar çekilirken hata (${recId}):`, error);
            return { id: recId, likeCount: 0, commentCount: 0 };
          }
        });
        const counts = await Promise.all(countPromises);
        counts.forEach(count => {
          countsMap.set(count.id, { likeCount: count.likeCount, commentCount: count.commentCount });
        });
      }
      
      const fetchedData = allRecsData.map(rec => {
        const userInfo = userMap.get(rec.userId);
        let finalUsername = '@bilinmeyen';
        let finalAvatar = `https://ui-avatars.com/api/?name=?&background=random`;
        if (userInfo) {
          if (userInfo.name) { 
            finalUsername = userInfo.name; 
          } else if (userInfo.username && userInfo.username !== 'bilinmeyen') { 
            finalUsername = `@${userInfo.username}`; 
          }
          finalAvatar = getAvatarUrlWithFallback(userInfo.photoURL, userInfo.name, userInfo.username);
        }
        
        const isLiked = likedRecommendationIds.has(rec.id);
        const counts = countsMap.get(rec.id) || { likeCount: 0, commentCount: 0 };
        
        return {
          id: rec.id,
          title: rec.title || 'Başlık Yok',
          text: rec.text || '',
          imageUrl: rec.image || rec.imageUrl || null,
          category: rec.category || 'Kategori Yok',
          userId: rec.userId || '',
          user: { name: finalUsername, avatar: finalAvatar },
          isLiked: isLiked,
          likes: [],
          likeCount: counts.likeCount,
          commentCount: counts.commentCount,
          createdAt: rec.createdAt,
        };
      }).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      
      // Duplicate'leri filtrele
      const uniqueFetchedData = fetchedData.filter((rec, index, self) => 
        index === self.findIndex(r => r.id === rec.id)
      );
      
      setRecommendations(uniqueFetchedData);
    } catch (err) {
      console.error("Takip edilenlerin tavsiyelerini çekerken hata:", err);
      setError('Tavsiyeler yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  }, [authUser?.uid]);

  /**
   * Popüler tavsiyeleri çek
   */
  const fetchPopularRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let recSnapshot;
      try {
        const recsQuery = query(
          collection(db, 'recommendations'),
          orderBy('createdAt', 'desc'),
          limit(30)
        );
        recSnapshot = await getDocs(recsQuery);
      } catch (recError) {
        if (recError.code === 'permission-denied') {
          throw new Error('Bu içeriğe erişmek için giriş yapmanız gerekiyor.');
        }
        throw recError;
      }
      
      const allRecsData = [];
      recSnapshot.forEach((doc) => {
        allRecsData.push({ id: doc.id, ...doc.data() });
      });
      
      // Kullanıcı bilgilerini çek
      const userIDs = new Set(allRecsData.map(rec => rec.userId).filter(Boolean));
      const userMap = new Map();
      
      if (userIDs.size > 0) {
        const userIdsArray = Array.from(userIDs);
        const userPromises = [];
        for (let i = 0; i < userIdsArray.length; i += 10) {
          const batch = userIdsArray.slice(i, i + 10);
          const usersQuery = query(
            collection(db, 'users'),
            where(documentId(), 'in', batch)
          );
          userPromises.push(
            getDocs(usersQuery).catch(err => {
              if (err.code === 'permission-denied') {
                return { forEach: () => {}, empty: true, docs: [] };
              }
              throw err;
            })
          );
        }
        const userSnapshots = await Promise.all(userPromises);
        userSnapshots.forEach(snapshot => {
          if (!snapshot.empty) {
            snapshot.forEach((doc) => {
              const data = doc.data();
              userMap.set(doc.id, {
                username: data.username || 'bilinmeyen',
                photoURL: data.photoURL || '',
                name: data.name || '',
              });
            });
          }
        });
      }
      
      // Beğeni durumlarını çek (sadece giriş yapmış kullanıcılar için)
      let likedRecommendationIds = new Set();
      if (authUser?.uid) {
        try {
          const likesQuery = query(collection(db, 'users', authUser.uid, 'likedRecommendations'));
          const likesSnapshot = await getDocs(likesQuery);
          likesSnapshot.forEach(doc => {
            likedRecommendationIds.add(doc.id);
          });
        } catch (likeError) {
          console.log("Beğeni durumu çekilemedi:", likeError);
        }
      }
      
      // Beğeni ve yorum sayılarını çek
      const recommendationIds = allRecsData.map(rec => rec.id);
      const countsMap = new Map();
      
      if (recommendationIds.length > 0) {
        const countPromises = recommendationIds.map(async (recId) => {
          try {
            const [likesSnap, commentsSnap] = await Promise.all([
              getDocs(collection(db, 'recommendations', recId, 'likes')),
              getDocs(collection(db, 'recommendations', recId, 'comments'))
            ]);
            return {
              id: recId,
              likeCount: likesSnap.size,
              commentCount: commentsSnap.size
            };
          } catch (error) {
            console.log(`Sayılar çekilirken hata (${recId}):`, error);
            return { id: recId, likeCount: 0, commentCount: 0 };
          }
        });
        const counts = await Promise.all(countPromises);
        counts.forEach(count => {
          countsMap.set(count.id, { likeCount: count.likeCount, commentCount: count.commentCount });
        });
      }
      
      const fetchedData = allRecsData.map(rec => {
        const userInfo = userMap.get(rec.userId);
        let finalUsername = '@bilinmeyen';
        let finalAvatar = `https://ui-avatars.com/api/?name=?&background=random`;
        if (userInfo) {
          if (userInfo.name) { 
            finalUsername = userInfo.name; 
          } else if (userInfo.username && userInfo.username !== 'bilinmeyen') { 
            finalUsername = `@${userInfo.username}`; 
          }
          finalAvatar = getAvatarUrlWithFallback(userInfo.photoURL, userInfo.name, userInfo.username);
        }
        
        const isLiked = likedRecommendationIds.has(rec.id);
        const counts = countsMap.get(rec.id) || { likeCount: 0, commentCount: 0 };
        
        return {
          id: rec.id,
          title: rec.title || 'Başlık Yok',
          text: rec.text || '',
          imageUrl: rec.image || rec.imageUrl || null,
          category: rec.category || 'Kategori Yok',
          userId: rec.userId || '',
          user: { name: finalUsername, avatar: finalAvatar },
          isLiked: isLiked,
          likes: [],
          likeCount: counts.likeCount,
          commentCount: counts.commentCount,
          createdAt: rec.createdAt,
        };
      });

      // Duplicate'leri filtrele
      const uniqueFetchedData = fetchedData.filter((rec, index, self) => 
        index === self.findIndex(r => r.id === rec.id)
      );

      setRecommendations(uniqueFetchedData);
    } catch (err) {
      console.error("Popüler tavsiyeler çekerken hata:", err);
      if (err.code === 'permission-denied') {
        setError('Bu içeriğe erişmek için giriş yapmanız gerekiyor.');
      } else {
        setError('Tavsiyeler yüklenemedi. Lütfen tekrar deneyin.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [authUser?.uid]);

  /**
   * Tavsiyeleri yükle (tip'e göre)
   */
  const loadRecommendations = useCallback(() => {
    if (type === 'following') {
      fetchFollowingRecommendations();
    } else {
      fetchPopularRecommendations();
    }
  }, [type, fetchFollowingRecommendations, fetchPopularRecommendations]);

  /**
   * Tavsiyeyi güncelle (beğeni, kaydetme vs.)
   */
  const updateRecommendation = useCallback((recId, updates) => {
    setRecommendations(prev => 
      prev.map(rec => rec.id === recId ? { ...rec, ...updates } : rec)
    );
  }, []);

  /**
   * Tavsiyeyi kaldır
   */
  const removeRecommendation = useCallback((recId) => {
    setRecommendations(prev => prev.filter(rec => rec.id !== recId));
  }, []);

  /**
   * Reset
   */
  const reset = useCallback(() => {
    setRecommendations([]);
    setError(null);
  }, []);

  return {
    recommendations,
    isLoading,
    error,
    loadRecommendations,
    updateRecommendation,
    removeRecommendation,
    reset
  };
};

