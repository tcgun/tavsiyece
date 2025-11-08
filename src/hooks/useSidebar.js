import { useState, useCallback } from 'react';
import { collection, query, getDocs, where, documentId } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getFollowers, getFollowing } from '../services/firebase/userService';

/**
 * Sidebar state'ini yöneten custom hook
 */
export const useSidebar = (authUser) => {
  const [sidebarView, setSidebarView] = useState('profile');
  const [sidebarUsers, setSidebarUsers] = useState([]);
  const [isLoadingSidebar, setIsLoadingSidebar] = useState(false);
  const [savedRecommendations, setSavedRecommendations] = useState([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  /**
   * Takipçi/Takip listesini sidebar'da göster
   */
  const showUsersList = useCallback(async (type) => {
    if (!authUser?.uid) return;
    
    setSidebarView(type);
    setIsLoadingSidebar(true);
    setSidebarUsers([]);
    
    try {
      let usersList = [];
      if (type === 'followers') {
        usersList = await getFollowers(authUser.uid, 100);
      } else {
        usersList = await getFollowing(authUser.uid, 100);
      }
      setSidebarUsers(usersList);
    } catch (error) {
      console.error(`${type} listesi çekilirken hata:`, error);
    } finally {
      setIsLoadingSidebar(false);
    }
  }, [authUser?.uid]);

  /**
   * Kaydedilenler listesini çek
   */
  const fetchSavedRecommendations = useCallback(async () => {
    if (!authUser?.uid) return;
    
    setIsLoadingSaved(true);
    try {
      const savedRef = collection(db, 'users', authUser.uid, 'savedRecommendations');
      const savedSnapshot = await getDocs(savedRef);
      const savedIds = savedSnapshot.docs.map(doc => doc.id);
      
      if (savedIds.length === 0) {
        setSavedRecommendations([]);
        setIsLoadingSaved(false);
        return;
      }
      
      // Tavsiyeleri batch olarak çek
      const batchSize = 10;
      const allRecs = [];
      for (let i = 0; i < savedIds.length; i += batchSize) {
        const batch = savedIds.slice(i, i + batchSize);
        const recsQuery = query(
          collection(db, 'recommendations'),
          where(documentId(), 'in', batch)
        );
        const recsSnapshot = await getDocs(recsQuery);
        recsSnapshot.forEach((doc) => {
          allRecs.push({ id: doc.id, ...doc.data() });
        });
      }
      
      // Sıralamayı kaydedilme sırasına göre yap
      const sortedRecs = savedIds.map(id => allRecs.find(rec => rec.id === id)).filter(Boolean);
      setSavedRecommendations(sortedRecs);
    } catch (error) {
      console.error("Kaydedilenler çekilirken hata:", error);
      setSavedRecommendations([]);
    } finally {
      setIsLoadingSaved(false);
    }
  }, [authUser?.uid]);

  /**
   * Kaydedilenler view'ını aç
   */
  const showSavedList = useCallback(() => {
    setSidebarView('saved');
    if (savedRecommendations.length === 0) {
      fetchSavedRecommendations();
    }
  }, [savedRecommendations.length, fetchSavedRecommendations]);

  return {
    sidebarView,
    setSidebarView,
    sidebarUsers,
    isLoadingSidebar,
    savedRecommendations,
    isLoadingSaved,
    showUsersList,
    showSavedList,
    fetchSavedRecommendations
  };
};

