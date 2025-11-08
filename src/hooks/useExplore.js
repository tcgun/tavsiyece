import { useState, useCallback, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getAvatarUrlWithFallback, normalizeText } from '../utils';

/**
 * Keşfet özelliklerini yöneten custom hook
 */
export const useExplore = (authUser) => {
  const [trendingItems, setTrendingItems] = useState([]);
  const [featuredUsers, setFeaturedUsers] = useState([]);
  const [popularUsers, setPopularUsers] = useState([]);
  const [activeUserTab, setActiveUserTab] = useState('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [recommendationResults, setRecommendationResults] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [myFollowingIds, setMyFollowingIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Takip listesini çek
   */
  useEffect(() => {
    const fetchFollowing = async () => {
      if (!authUser?.uid) return;
      try {
        const followingQuery = query(collection(db, 'users', authUser.uid, 'following'));
        const followingSnapshot = await getDocs(followingQuery);
        const followingIds = followingSnapshot.docs.map(doc => doc.id);
        setMyFollowingIds(new Set(followingIds));
      } catch (err) {
        console.error("Takip listesi çekilirken hata:", err);
      }
    };
    if (authUser?.uid) {
      fetchFollowing();
    }
  }, [authUser?.uid]);

  /**
   * Keşfet verilerini çek
   */
  const fetchExploreData = useCallback(async () => {
    if (!authUser?.uid) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Trend öğeleri (varsa)
      try {
        const trendQuery = query(collection(db, 'trending'), orderBy('createdAt', 'desc'), limit(10));
        const trendSnapshot = await getDocs(trendQuery);
        const fetchedTrending = [];
        trendSnapshot.forEach(doc => {
          fetchedTrending.push({ id: doc.id, ...doc.data() });
        });
        setTrendingItems(fetchedTrending);
      } catch (trendError) {
        setTrendingItems([]);
      }
      
      // myFollowingIds'i güncel olarak çek
      let currentFollowingIds = new Set();
      try {
        const followingQuery = query(collection(db, 'users', authUser.uid, 'following'));
        const followingSnapshot = await getDocs(followingQuery);
        followingSnapshot.docs.forEach(doc => {
          currentFollowingIds.add(doc.id);
        });
        setMyFollowingIds(currentFollowingIds);
      } catch (err) {
        // Hata durumunda mevcut Set'i kullan
      }
      
      // Kullanıcıları çek
      if (activeUserTab === 'new') {
        const userQuery = query(
          collection(db, 'users'), 
          orderBy('createdAt', 'desc'), 
          limit(10)
        );
        const userSnapshot = await getDocs(userQuery);
        const fetchedUsers = [];
        userSnapshot.forEach(doc => {
          const data = doc.data();
          if (doc.id === authUser.uid) return;
          const avatar = data.photoURL || getAvatarUrlWithFallback(null, data.name, data.username);
          fetchedUsers.push({
            id: doc.id,
            name: data.name || 'İsimsiz',
            username: data.username || 'kullaniciadi',
            bio: data.bio || '',
            avatar: avatar,
            isFollowing: currentFollowingIds.has(doc.id), 
          });
        });
        setFeaturedUsers(fetchedUsers);
      } else {
        const userQuery = query(
          collection(db, 'users'), 
          orderBy('followersCount', 'desc'), 
          limit(10)
        );
        const userSnapshot = await getDocs(userQuery);
        const fetchedUsers = [];
        userSnapshot.forEach(doc => {
          const data = doc.data();
          if (doc.id === authUser.uid) return;
          const avatar = data.photoURL || getAvatarUrlWithFallback(null, data.name, data.username);
          fetchedUsers.push({
            id: doc.id,
            name: data.name || 'İsimsiz',
            username: data.username || 'kullaniciadi',
            bio: data.bio || '',
            avatar: avatar,
            isFollowing: currentFollowingIds.has(doc.id), 
          });
        });
        setPopularUsers(fetchedUsers);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error("Keşfet verileri çekilirken hata:", err);
      setError('Veriler yüklenemedi.');
      setIsLoading(false);
    }
  }, [authUser?.uid, activeUserTab]);

  /**
   * Arama fonksiyonu
   */
  const performSearch = useCallback(async (term) => {
    if (!term.trim()) {
      setIsSearching(false);
      setUserResults([]);
      setRecommendationResults([]);
      return;
    }
    setIsSearching(true);
    const searchTerm = normalizeText(term);
    
    try {
      // Tavsiyelerde Ara (keywords field'ı varsa)
      try {
        const recQuery = query(
          collection(db, 'recommendations'),
          where('keywords', 'array-contains', searchTerm),
          limit(10)
        );
        const recSnapshot = await getDocs(recQuery);
        const recs = [];
        recSnapshot.forEach(doc => {
          const data = doc.data();
          recs.push({
            id: doc.id,
            title: data.title,
            category: data.category,
            image: data.image || data.imageUrl || null,
          });
        });
        setRecommendationResults(recs);
      } catch (recError) {
        setRecommendationResults([]);
      }

      // Kullanıcılarda Ara (username_lowercase field'ı varsa)
      try {
        const userQuery = query(
          collection(db, 'users'),
          where('username_lowercase', '>=', searchTerm),
          where('username_lowercase', '<=', searchTerm + '\uf8ff'),
          limit(10)
        );
        const userSnapshot = await getDocs(userQuery);
        const users = [];
        userSnapshot.forEach(doc => {
          const data = doc.data();
          if (doc.id === authUser?.uid) return;
          users.push({
            id: doc.id,
            name: data.name,
            username: data.username,
            avatar: data.photoURL || getAvatarUrlWithFallback(null, data.name, data.username),
          });
        });
        setUserResults(users);
      } catch (userError) {
        setUserResults([]);
      }
    } catch (err) {
      console.error("Arama hatası:", err);
      setUserResults([]);
      setRecommendationResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [authUser?.uid]);

  /**
   * Takip et/takipten çık
   */
  const handleFollowToggle = useCallback(async (userId) => {
    if (!authUser?.uid || userId === authUser.uid) return;
    
    const { writeBatch, serverTimestamp, updateDoc, increment } = await import('firebase/firestore');
    const batch = writeBatch(db);
    const followingRef = doc(db, 'users', authUser.uid, 'following', userId);
    const followerRef = doc(db, 'users', userId, 'followers', authUser.uid);
    
    // Eski takip durumunu sakla
    const wasFollowing = myFollowingIds.has(userId);
    const willFollow = !wasFollowing;
    
    try {
      if (wasFollowing) {
        // Takibi bırak
        batch.delete(followingRef);
        batch.delete(followerRef);
        setMyFollowingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      } else {
        // Takip et
        batch.set(followingRef, { createdAt: serverTimestamp() });
        batch.set(followerRef, { createdAt: serverTimestamp() });
        setMyFollowingIds(prev => new Set([...prev, userId]));
      }
      await batch.commit();
      
      // Takip/takipçi sayılarını güncelle
      try {
        // Kendi profilimizin followingCount'unu güncelle
        const currentUserDocRef = doc(db, 'users', authUser.uid);
        await updateDoc(currentUserDocRef, {
          followingCount: increment(wasFollowing ? -1 : 1)
        });
        
        // Diğer kullanıcının followersCount'unu güncelle
        const profileUserDocRef = doc(db, 'users', userId);
        await updateDoc(profileUserDocRef, {
          followersCount: increment(wasFollowing ? -1 : 1)
        });
      } catch (countError) {
        console.error("Takip/takipçi sayıları güncellenirken hata:", countError);
        // Hata olsa bile devam et
      }
      
      // Kullanıcı listelerini güncelle
      setFeaturedUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, isFollowing: willFollow } : user
      ));
      setPopularUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, isFollowing: willFollow } : user
      ));
      setUserResults(prev => prev.map(user => 
        user.id === userId ? { ...user, isFollowing: willFollow } : user
      ));
    } catch (err) {
      console.error("Takip etme hatası:", err);
      // Hata durumunda state'i geri al
      if (wasFollowing) {
        setMyFollowingIds(prev => new Set([...prev, userId]));
      } else {
        setMyFollowingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
    }
  }, [authUser?.uid, myFollowingIds]);

  return {
    trendingItems,
    featuredUsers,
    popularUsers,
    activeUserTab,
    setActiveUserTab,
    searchQuery,
    setSearchQuery,
    performSearch,
    isSearching,
    recommendationResults,
    userResults,
    myFollowingIds,
    isLoading,
    error,
    fetchExploreData,
    handleFollowToggle
  };
};

