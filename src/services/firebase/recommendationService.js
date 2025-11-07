import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

/**
 * Tavsiyeyi beğen
 */
export const likeRecommendation = async (userId, recommendationId) => {
  try {
    // Parametre kontrolü
    if (!userId || !recommendationId) {
      throw new Error('Kullanıcı ID veya tavsiye ID eksik');
    }
    
    const likeRef = doc(db, 'recommendations', recommendationId, 'likes', userId);
    await setDoc(likeRef, {
      createdAt: serverTimestamp(),
    });
    
    // Kullanıcının beğendikleri listesine de ekle
    const userLikeRef = doc(db, 'users', userId, 'likedRecommendations', recommendationId);
    await setDoc(userLikeRef, {
      createdAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error('Beğeni hatası:', error);
    // Daha ayrıntılı hata mesajı
    if (error.code === 'permission-denied' || (error.message && error.message.includes('Missing or insufficient permissions'))) {
      throw new Error('Bu işlemi yapmak için yetkiniz yok. Lütfen uygulama yöneticisiyle iletişime geçin.');
    } else if (error.code === 'not-found') {
      throw new Error('Tavsiye bulunamadı');
    } else {
      throw new Error('Beğeni işlemi başarısız oldu: ' + (error.message || error.code || 'Bilinmeyen hata'));
    }
  }
};

/**
 * Tavsiyenin beğenilmesini kaldır
 */
export const unlikeRecommendation = async (userId, recommendationId) => {
  try {
    // Parametre kontrolü
    if (!userId || !recommendationId) {
      throw new Error('Kullanıcı ID veya tavsiye ID eksik');
    }
    
    const likeRef = doc(db, 'recommendations', recommendationId, 'likes', userId);
    await deleteDoc(likeRef);
    
    // Kullanıcının beğendikleri listesinden de kaldır
    const userLikeRef = doc(db, 'users', userId, 'likedRecommendations', recommendationId);
    await deleteDoc(userLikeRef);
    
    return true;
  } catch (error) {
    console.error('Beğeni kaldırma hatası:', error);
    // Daha ayrıntılı hata mesajı
    if (error.code === 'permission-denied' || (error.message && error.message.includes('Missing or insufficient permissions'))) {
      throw new Error('Bu işlemi yapmak için yetkiniz yok. Lütfen uygulama yöneticisiyle iletişime geçin.');
    } else if (error.code === 'not-found') {
      throw new Error('Tavsiye veya beğeni bulunamadı');
    } else {
      throw new Error('Beğeni kaldırma işlemi başarısız oldu: ' + (error.message || error.code || 'Bilinmeyen hata'));
    }
  }
};

/**
 * Tavsiyeyi kaydet
 */
export const saveRecommendation = async (userId, recommendationId) => {
  try {
    const savedRef = doc(db, 'users', userId, 'savedRecommendations', recommendationId);
    await setDoc(savedRef, {
      createdAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error('Kaydetme hatası:', error);
    return false;
  }
};

/**
 * Tavsiyenin kaydedilmesini kaldır
 */
export const unsaveRecommendation = async (userId, recommendationId) => {
  try {
    const savedRef = doc(db, 'users', userId, 'savedRecommendations', recommendationId);
    await deleteDoc(savedRef);
    
    return true;
  } catch (error) {
    console.error('Kaydetme kaldırma hatası:', error);
    return false;
  }
};

/**
 * Tavsiyenin kaydedilip kaydedilmediğini kontrol et
 */
export const isRecommendationSaved = async (userId, recommendationId) => {
  try {
    const savedRef = doc(db, 'users', userId, 'savedRecommendations', recommendationId);
    const savedSnap = await getDoc(savedRef);
    return savedSnap.exists();
  } catch (error) {
    console.error('Kaydedilme durumu kontrol hatası:', error);
    return false;
  }
};

