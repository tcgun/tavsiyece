import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { normalizeText } from '../../utils/textUtils';

/**
 * Kullanıcı profilini ID'ye göre getirir
 */
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Kullanıcı profili çekme hatası:', error);
    return null;
  }
};

/**
 * Birden fazla kullanıcı profilini ID'lere göre getirir
 */
export const getUserProfiles = async (userIds) => {
  const userMap = new Map();
  
  if (userIds.length === 0) return userMap;
  
  try {
    // Firestore'da 'in' operatörü maksimum 10 eleman alır
    const chunks = [];
    for (let i = 0; i < userIds.length; i += 10) {
      chunks.push(userIds.slice(i, i + 10));
    }
    
    for (const chunk of chunks) {
      const usersQuery = query(
        collection(db, 'users'),
        where(documentId(), 'in', chunk)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        userMap.set(doc.id, {
          id: doc.id,
          name: data.name || 'İsimsiz',
          username: data.username || 'kullanici',
          bio: data.bio || '',
          photoURL: data.photoURL || null,
          recommendationsCount: data.recommendationsCount,
          followersCount: data.followersCount,
          followingCount: data.followingCount,
        });
      });
    }
    
    return userMap;
  } catch (error) {
    console.error('Kullanıcı profilleri çekme hatası:', error);
    return userMap;
  }
};

/**
 * Kullanıcının takipçilerini getirir
 */
export const getFollowers = async (userId, limitCount = 5) => {
  try {
    const followersQuery = query(
      collection(db, 'users', userId, 'followers'),
      limit(limitCount)
    );
    const followersSnapshot = await getDocs(followersQuery);
    const followerUserIds = followersSnapshot.docs.map((doc) => doc.id);
    
    if (followerUserIds.length === 0) return [];
    
    const userMap = await getUserProfiles(followerUserIds);
    return followerUserIds
      .map((id) => {
        const user = userMap.get(id);
        if (!user) return null;
        return {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.name || '?'}&background=random`,
        };
      })
      .filter((user) => user !== null);
  } catch (error) {
    console.error('Takipçiler çekme hatası:', error);
    return [];
  }
};

/**
 * Kullanıcının takip ettiklerini getirir
 */
export const getFollowing = async (userId, limitCount = 5) => {
  try {
    const followingQuery = query(
      collection(db, 'users', userId, 'following'),
      limit(limitCount)
    );
    const followingSnapshot = await getDocs(followingQuery);
    const followingUserIds = followingSnapshot.docs.map((doc) => doc.id);
    
    if (followingUserIds.length === 0) return [];
    
    const userMap = await getUserProfiles(followingUserIds);
    return followingUserIds
      .map((id) => {
        const user = userMap.get(id);
        if (!user) return null;
        return {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.name || '?'}&background=random`,
        };
      })
      .filter((user) => user !== null);
  } catch (error) {
    console.error('Takip edilenler çekme hatası:', error);
    return [];
  }
};

/**
 * Kullanıcı adından e-posta adresi bulur
 */
export const getEmailByUsername = async (username) => {
  try {
    // Türkçe karakterleri normalleştir (kayıt sırasında normalizeText kullanıldığı için)
    const normalizedUsername = normalizeText(username);
    
    const usersQuery = query(
      collection(db, 'users'),
      where('username_lowercase', '==', normalizedUsername)
    );
    const usersSnapshot = await getDocs(usersQuery);
    
    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();
      return userData.email || null;
    }
    
    return null;
  } catch (error) {
    console.error('Kullanıcı adından e-posta bulma hatası:', error);
    return null;
  }
};

/**
 * Kullanıcının tavsiye sayısını Firestore'dan hesaplayıp günceller
 * Eğer recommendationsCount yoksa veya güncel değilse, gerçek sayıyı hesaplar ve günceller
 * İzin hatası durumunda sessizce devam eder ve mevcut count'u döndürür
 */
export const syncRecommendationsCount = async (userId) => {
  try {
    if (!userId) return null;
    
    // Kullanıcının tavsiyelerini say
    let actualCount = 0;
    try {
      const recQuery = query(
        collection(db, 'recommendations'),
        where('userId', '==', userId)
      );
      const recSnapshot = await getDocs(recQuery);
      actualCount = recSnapshot.size;
    } catch (error) {
      // İzin hatası veya başka bir hata - sadece log'la ve devam et
      if (error.code === 'permission-denied') {
        console.warn('Tavsiyeler sayılırken izin hatası (devam ediliyor):', error);
      } else {
        console.error('Tavsiyeler sayılırken hata:', error);
      }
      // Hata durumunda null dön, böylece mevcut count kullanılır
      return null;
    }
    
    // Kullanıcı profilini al
    let userSnap;
    try {
      const userRef = doc(db, 'users', userId);
      userSnap = await getDoc(userRef);
    } catch (error) {
      if (error.code === 'permission-denied') {
        console.warn('Kullanıcı profili okunurken izin hatası (devam ediliyor):', error);
      } else {
        console.error('Kullanıcı profili okunurken hata:', error);
      }
      return null;
    }
    
    if (!userSnap.exists()) {
      console.warn(`Kullanıcı profili bulunamadı: ${userId}`);
      return null;
    }
    
    const userData = userSnap.data();
    const currentCount = userData.recommendationsCount;
    
    // Eğer count yoksa veya gerçek sayıyla uyuşmuyorsa güncelle
    if (currentCount === undefined || currentCount === null || currentCount !== actualCount) {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          recommendationsCount: actualCount
        });
        console.log(`RecommendationsCount güncellendi: ${userId} - ${currentCount || 0} -> ${actualCount}`);
        return actualCount;
      } catch (error) {
        // İzin hatası durumunda sessizce devam et ve mevcut count'u döndür
        if (error.code === 'permission-denied') {
          console.warn('RecommendationsCount güncellenirken izin hatası (sadece okuma yapılıyor):', error);
          // İzin yoksa, hesaplanan count'u döndür (güncelleme yapmadan)
          return actualCount;
        } else {
          console.error('RecommendationsCount güncellenirken hata:', error);
          // Diğer hatalarda mevcut count'u döndür
          return currentCount !== undefined && currentCount !== null ? currentCount : actualCount;
        }
      }
    }
    
    return currentCount;
  } catch (error) {
    // Genel hata yakalama - sessizce devam et
    if (error.code === 'permission-denied') {
      console.warn('Tavsiye sayısı senkronize edilirken izin hatası (devam ediliyor):', error);
    } else {
      console.error('Tavsiye sayısı senkronize edilirken hata:', error);
    }
    return null;
  }
};

/**
 * Kullanıcının takipçi ve takip sayılarını Firestore'dan hesaplayıp günceller
 * Eğer followersCount veya followingCount yoksa veya güncel değilse, gerçek sayıları hesaplar ve günceller
 * İzin hatası durumunda sessizce devam eder ve mevcut count'ları döndürür
 */
export const syncFollowCounts = async (userId) => {
  try {
    if (!userId) return null;
    
    // Takipçi ve takip sayılarını hesapla
    let actualFollowersCount = 0;
    let actualFollowingCount = 0;
    
    // Önce kullanıcı profilini al (mevcut count'ları görmek için)
    let userSnap;
    try {
      const userRef = doc(db, 'users', userId);
      userSnap = await getDoc(userRef);
    } catch (error) {
      if (error.code === 'permission-denied') {
        console.warn('Kullanıcı profili okunurken izin hatası (devam ediliyor):', error);
      } else {
        console.error('Kullanıcı profili okunurken hata:', error);
      }
      return null;
    }
    
    if (!userSnap.exists()) {
      console.warn(`Kullanıcı profili bulunamadı: ${userId}`);
      return null;
    }
    
    const userData = userSnap.data();
    const currentFollowersCount = userData.followersCount;
    const currentFollowingCount = userData.followingCount;
    
    let followersCountError = false;
    let followingCountError = false;
    
    try {
      // Takipçileri say (limit olmadan tümünü say)
      const followersQuery = query(
        collection(db, 'users', userId, 'followers')
      );
      const followersSnapshot = await getDocs(followersQuery);
      actualFollowersCount = followersSnapshot.size;
    } catch (error) {
      followersCountError = true;
      if (error.code === 'permission-denied') {
        console.warn('Takipçiler sayılırken izin hatası (mevcut count kullanılacak):', error);
        // İzin hatası durumunda mevcut count'u kullan
        actualFollowersCount = currentFollowersCount !== undefined && currentFollowersCount !== null ? currentFollowersCount : 0;
      } else {
        console.error('Takipçiler sayılırken hata:', error);
        // Diğer hatalarda da mevcut count'u kullan
        actualFollowersCount = currentFollowersCount !== undefined && currentFollowersCount !== null ? currentFollowersCount : 0;
      }
    }
    
    try {
      // Takip edilenleri say (limit olmadan tümünü say)
      const followingQuery = query(
        collection(db, 'users', userId, 'following')
      );
      const followingSnapshot = await getDocs(followingQuery);
      actualFollowingCount = followingSnapshot.size;
    } catch (error) {
      followingCountError = true;
      if (error.code === 'permission-denied') {
        console.warn('Takip edilenler sayılırken izin hatası (mevcut count kullanılacak):', error);
        // İzin hatası durumunda mevcut count'u kullan
        actualFollowingCount = currentFollowingCount !== undefined && currentFollowingCount !== null ? currentFollowingCount : 0;
      } else {
        console.error('Takip edilenler sayılırken hata:', error);
        // Diğer hatalarda da mevcut count'u kullan
        actualFollowingCount = currentFollowingCount !== undefined && currentFollowingCount !== null ? currentFollowingCount : 0;
      }
    }
    
    // Eğer her iki sayı da hata verdi ve mevcut count'lar yoksa, null dön
    if (followersCountError && followingCountError && 
        (currentFollowersCount === undefined || currentFollowersCount === null) &&
        (currentFollowingCount === undefined || currentFollowingCount === null)) {
      return null;
    }
    
    // Eğer count'lar yoksa veya gerçek sayılarla uyuşmuyorsa güncelle
    // Ancak sadece sayılar başarıyla sayıldıysa güncelleme yap
    const needsUpdate = 
      !followersCountError && !followingCountError && (
        currentFollowersCount === undefined || 
        currentFollowersCount === null || 
        currentFollowersCount !== actualFollowersCount ||
        currentFollowingCount === undefined || 
        currentFollowingCount === null || 
        currentFollowingCount !== actualFollowingCount
      );
    
    if (needsUpdate) {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          followersCount: actualFollowersCount,
          followingCount: actualFollowingCount
        });
        console.log(`Follow counts güncellendi: ${userId} - Takipçi: ${currentFollowersCount || 0} -> ${actualFollowersCount}, Takip: ${currentFollowingCount || 0} -> ${actualFollowingCount}`);
        return {
          followersCount: actualFollowersCount,
          followingCount: actualFollowingCount
        };
      } catch (error) {
        // İzin hatası durumunda sessizce devam et ve hesaplanan count'ları döndür
        if (error.code === 'permission-denied') {
          console.warn('Follow counts güncellenirken izin hatası (sadece okuma yapılıyor):', error);
          return {
            followersCount: actualFollowersCount,
            followingCount: actualFollowingCount
          };
        } else {
          console.error('Follow counts güncellenirken hata:', error);
          return {
            followersCount: actualFollowersCount,
            followingCount: actualFollowingCount
          };
        }
      }
    }
    
    // Mevcut count'ları veya hesaplanan count'ları döndür
    return {
      followersCount: actualFollowersCount,
      followingCount: actualFollowingCount
    };
  } catch (error) {
    // Genel hata yakalama - sessizce devam et
    if (error.code === 'permission-denied') {
      console.warn('Takip/takipçi sayıları senkronize edilirken izin hatası (devam ediliyor):', error);
    } else {
      console.error('Takip/takipçi sayıları senkronize edilirken hata:', error);
    }
    return null;
  }
};

