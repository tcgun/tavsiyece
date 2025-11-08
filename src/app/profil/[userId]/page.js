'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { doc, getDoc, getDocs, collection, query, where, orderBy, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../../contexts/AuthContext';
import { getFollowers, getFollowing, getUserProfile } from '../../../services/firebase/userService';
import { isRecommendationSaved, likeRecommendation, saveRecommendation, unlikeRecommendation, unsaveRecommendation } from '../../../services/firebase/recommendationService';
import { createNotification, createLikeNotification } from '../../../services/firebase/notificationService';
import { getAvatarUrlWithFallback } from '../../../utils/avatarUtils';
import RecommendationCard from '../../../components/RecommendationCard';
import Header from '../../../components/layout/Header';
import Sidebar from '../../../components/layout/Sidebar';
import { useUnreadNotifications } from '../../../hooks/useUnreadNotifications';
import { useSidebar } from '../../../hooks/useSidebar';

export default function OtherProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user: authUser, isLoading: authLoading } = useAuth();
    const { userId } = params;
    const unreadCount = useUnreadNotifications();

    const [profileUser, setProfileUser] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Sidebar için state'ler
    const [categories, setCategories] = useState([]);
    const [userProfile, setUserProfile] = useState(null);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [recommendationsCount, setRecommendationsCount] = useState(0);
    const sidebarHook = useSidebar(authUser);

    // Kendi profilimiz kontrolü
    useEffect(() => {
        if (!authLoading && authUser && authUser.uid === userId) {
            router.push('/profil');
        }
    }, [authUser, userId, authLoading, router]);

    // Kategorileri çek
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const catQuery = query(collection(db, 'categories'), orderBy('order', 'asc'));
                const catSnapshot = await getDocs(catQuery);
                if (!catSnapshot.empty) {
                    const fetchedCategories = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setCategories(fetchedCategories);
                }
            } catch (err) {
                try {
                    const catQuery = query(collection(db, 'categories'));
                    const catSnapshot = await getDocs(catQuery);
                    const fetchedCategories = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setCategories(fetchedCategories);
                } catch (queryError) {
                    setCategories([]);
                }
            }
        };
        fetchCategories();
    }, []);

    // Kendi profil bilgilerini çek (Sidebar için)
    useEffect(() => {
        const fetchProfile = async () => {
            if (!authUser?.uid) return;
            
            try {
                // Önce tavsiye sayısını senkronize et (önceki tavsiyeleri de saysın)
                // İzin hatası durumunda sessizce devam et
                let syncedCount = null;
                try {
                    const { syncRecommendationsCount } = await import('../../../services/firebase/userService');
                    syncedCount = await syncRecommendationsCount(authUser.uid);
                } catch (syncError) {
                    // İzin hatası veya başka bir hata - sessizce devam et
                    console.warn("Tavsiye sayısı senkronize edilemedi (devam ediliyor):", syncError);
                }
                
                const profile = await getUserProfile(authUser.uid);
                if (profile) {
                    setUserProfile(profile);
                    // Senkronize edilmiş count'u kullan (eğer varsa), yoksa mevcut count'u kullan
                    const finalCount = syncedCount !== null && syncedCount !== undefined 
                        ? syncedCount 
                        : (profile.recommendationsCount !== undefined && profile.recommendationsCount !== null 
                            ? profile.recommendationsCount 
                            : 0);
                    setRecommendationsCount(finalCount);
                    
                    // Takipçi ve takip sayılarını senkronize et
                    let syncedFollowCounts = null;
                    try {
                        const { syncFollowCounts } = await import('../../../services/firebase/userService');
                        syncedFollowCounts = await syncFollowCounts(authUser.uid);
                    } catch (syncError) {
                        console.warn("Takip/takipçi sayıları senkronize edilemedi (devam ediliyor):", syncError);
                    }
                    
                    // Senkronize edilmiş count'ları kullan (eğer varsa), yoksa mevcut count'ları veya listelerden hesapla
                    let finalFollowersCount = 0;
                    let finalFollowingCount = 0;
                    
                    if (syncedFollowCounts) {
                        finalFollowersCount = syncedFollowCounts.followersCount;
                        finalFollowingCount = syncedFollowCounts.followingCount;
                    } else {
                        // Fallback: Profil'den veya listelerden hesapla
                        const [followersList, followingList] = await Promise.all([
                            getFollowers(authUser.uid, 1000),
                            getFollowing(authUser.uid, 1000)
                        ]);
                        finalFollowersCount = profile.followersCount !== undefined && profile.followersCount !== null 
                            ? profile.followersCount 
                            : followersList.length;
                        finalFollowingCount = profile.followingCount !== undefined && profile.followingCount !== null 
                            ? profile.followingCount 
                            : followingList.length;
                    }
                    
                    setFollowersCount(finalFollowersCount);
                    setFollowingCount(finalFollowingCount);
                }
            } catch (err) {
                console.error("Profil çekilirken hata:", err);
            }
        };
        
        if (!authLoading && authUser) {
            fetchProfile();
        }
    }, [authUser, authLoading]);

    // Diğer kullanıcının profilini çek
    useEffect(() => {
        if (!userId) return;

        const fetchProfile = async () => {
            setLoading(true);
            setError(null);

            try {
                // Profil kullanıcısını çek
                // Önce tavsiye sayısını senkronize et (önceki tavsiyeleri de saysın)
                // İzin hatası durumunda sessizce devam et
                let syncedCount = null;
                try {
                    const { syncRecommendationsCount } = await import('../../../services/firebase/userService');
                    syncedCount = await syncRecommendationsCount(userId);
                } catch (syncError) {
                    // İzin hatası veya başka bir hata - sessizce devam et
                    console.warn("Tavsiye sayısı senkronize edilemedi (devam ediliyor):", syncError);
                }
                
                const profileData = await getUserProfile(userId);
                if (!profileData) {
                    setError("Kullanıcı bulunamadı.");
                    setLoading(false);
                    router.push('/');
                    return;
                }

                // Senkronize edilmiş count'u kullan (eğer varsa), yoksa mevcut count'u kullan
                const finalCount = syncedCount !== null && syncedCount !== undefined 
                    ? syncedCount 
                    : (profileData.recommendationsCount !== undefined && profileData.recommendationsCount !== null 
                        ? profileData.recommendationsCount 
                        : 0);
                
                // Takipçi ve takip sayılarını senkronize et
                let syncedFollowCounts = null;
                try {
                    const { syncFollowCounts } = await import('../../../services/firebase/userService');
                    syncedFollowCounts = await syncFollowCounts(userId);
                } catch (syncError) {
                    console.warn("Takip/takipçi sayıları senkronize edilemedi (devam ediliyor):", syncError);
                }
                
                // Senkronize edilmiş count'ları kullan (eğer varsa), yoksa mevcut count'ları kullan
                let finalFollowersCount = 0;
                let finalFollowingCount = 0;
                
                if (syncedFollowCounts) {
                    finalFollowersCount = syncedFollowCounts.followersCount;
                    finalFollowingCount = syncedFollowCounts.followingCount;
                } else {
                    // Fallback: Profil'den al
                    finalFollowersCount = profileData.followersCount !== undefined && profileData.followersCount !== null 
                        ? profileData.followersCount 
                        : 0;
                    finalFollowingCount = profileData.followingCount !== undefined && profileData.followingCount !== null 
                        ? profileData.followingCount 
                        : 0;
                }
                
                // profileUser state'ini güncellenmiş count'larla birlikte set et
                setProfileUser({
                    ...profileData,
                    recommendationsCount: finalCount,
                    followersCount: finalFollowersCount,
                    followingCount: finalFollowingCount
                });
                
                setRecommendationsCount(finalCount);
                setFollowersCount(finalFollowersCount);
                setFollowingCount(finalFollowingCount);

                // Takip durumunu kontrol et
                if (authUser?.uid) {
                    const followingRef = doc(db, 'users', authUser.uid, 'following', userId);
                    const followingSnap = await getDoc(followingRef);
                    setIsFollowing(followingSnap.exists());
                }

                // Tavsiyeleri çek
                const recsQuery = query(
                    collection(db, 'recommendations'),
                    where('userId', '==', userId),
                    orderBy('createdAt', 'desc')
                );
                const recsSnapshot = await getDocs(recsQuery);
                
                const recommendationIds = recsSnapshot.docs.map(doc => doc.id);
                const countsMap = new Map();
                const likedRecommendationIds = new Set();

                if (recommendationIds.length > 0 && authUser?.uid) {
                    // Beğeni durumunu kontrol et
                    const likesPromises = recommendationIds.map(async (recId) => {
                        const likeRef = doc(db, 'recommendations', recId, 'likes', authUser.uid);
                        const likeSnap = await getDoc(likeRef);
                        return { recId, isLiked: likeSnap.exists() };
                    });
                    const likesResults = await Promise.all(likesPromises);
                    likesResults.forEach(({ recId, isLiked }) => {
                        if (isLiked) likedRecommendationIds.add(recId);
                    });

                    // Beğeni ve yorum sayılarını çek
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

                const fetchedRecs = [];
                recsSnapshot.forEach((doc) => {
                    const data = doc.data();
                    const counts = countsMap.get(doc.id) || { likeCount: 0, commentCount: 0 };
                    const isLiked = likedRecommendationIds.has(doc.id);
                    
                    fetchedRecs.push({
                        id: doc.id,
                        title: data.title || 'Başlıksız',
                        text: data.text || '',
                        category: data.category || 'Kategori Yok',
                        userId: userId,
                        image: data.imageUrl || data.image || null,
                        imageUrl: data.imageUrl || data.image || null,
                        user: {
                            name: profileData?.name || profileData?.username || 'Kullanıcı',
                            avatar: getAvatarUrlWithFallback(profileData?.photoURL, profileData?.name, profileData?.username),
                        },
                        isLiked: isLiked,
                        likeCount: counts.likeCount,
                        commentCount: counts.commentCount,
                        createdAt: data.createdAt,
                    });
                });
                setRecommendations(fetchedRecs);
            } catch (err) {
                console.error("Profil verisi çekme hatası:", err.message);
                setError("Profil yüklenirken bir hata oluştu.");
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            fetchProfile();
        }
    }, [userId, authUser?.uid, authLoading, router]);

    // Takip Et / Takibi Bırak
    const handleFollowToggle = async () => {
        if (!authUser?.uid || !profileUser || followLoading) {
            if (!authUser) {
                router.push('/giris');
            }
            return;
        }

        setFollowLoading(true);

        // Eski takip durumunu sakla (state güncellemesinden önce)
        const wasFollowing = isFollowing;
        // Yeni takip durumu (tersi)
        const willFollow = !wasFollowing;

        try {
            const currentUserFollowingRef = doc(db, 'users', authUser.uid, 'following', userId);
            const profileUserFollowersRef = doc(db, 'users', userId, 'followers', authUser.uid);
            const batch = writeBatch(db);

            if (wasFollowing) {
                // Takibi bırak
                batch.delete(currentUserFollowingRef);
                batch.delete(profileUserFollowersRef);
            } else {
                // Takip et
                batch.set(currentUserFollowingRef, { createdAt: serverTimestamp() });
                batch.set(profileUserFollowersRef, { createdAt: serverTimestamp() });

                // Bildirim gönderme
                if (authUser.uid !== userId) {
                    try {
                        const currentUserProfile = await getUserProfile(authUser.uid);
                        await createNotification({
                            recipientId: userId,
                            senderId: authUser.uid,
                            senderName: currentUserProfile?.name || 'Bilinmeyen Kullanıcı',
                            senderPhotoURL: currentUserProfile?.photoURL || null,
                            message: `<strong>${currentUserProfile?.name || 'Biri'}</strong> seni takip etmeye başladı.`,
                            link: `/profil/${authUser.uid}`,
                            type: 'Takip'
                        });
                    } catch (notifError) {
                        console.error("Bildirim gönderme hatası:", notifError);
                    }
                }
            }

            await batch.commit();
            
            // Takip/takipçi sayılarını güncelle
            try {
                const { updateDoc, increment } = await import('firebase/firestore');
                
                // Kendi profilimizin followingCount'unu güncelle
                // wasFollowing true ise -1 (takibi bıraktık), false ise +1 (takip ettik)
                const currentUserDocRef = doc(db, 'users', authUser.uid);
                await updateDoc(currentUserDocRef, {
                    followingCount: increment(wasFollowing ? -1 : 1)
                });
                
                // Diğer kullanıcının followersCount'unu güncelle
                // wasFollowing true ise -1 (takibi bıraktık), false ise +1 (takip ettik)
                const profileUserDocRef = doc(db, 'users', userId);
                await updateDoc(profileUserDocRef, {
                    followersCount: increment(wasFollowing ? -1 : 1)
                });
                
                // State'leri güncelle
                // Diğer kullanıcının followersCount'unu güncelle
                if (profileUser) {
                    const newFollowersCount = Math.max(0, (profileUser.followersCount || 0) + (wasFollowing ? -1 : 1));
                    setProfileUser({
                        ...profileUser,
                        followersCount: newFollowersCount
                    });
                }
                
                // Sidebar'daki kendi followingCount'unu güncelle
                setFollowingCount(prev => Math.max(0, prev + (wasFollowing ? -1 : 1)));
                
                // Takip durumunu güncelle
                setIsFollowing(willFollow);
            } catch (countError) {
                console.error("Takip/takipçi sayıları güncellenirken hata:", countError);
                // Hata olsa bile state'i güncelle (Firestore işlemi başarılı oldu)
                setIsFollowing(willFollow);
                if (profileUser) {
                    const newFollowersCount = Math.max(0, (profileUser.followersCount || 0) + (wasFollowing ? -1 : 1));
                    setProfileUser({
                        ...profileUser,
                        followersCount: newFollowersCount
                    });
                }
                setFollowingCount(prev => Math.max(0, prev + (wasFollowing ? -1 : 1)));
            }
        } catch (error) {
            console.error("Takip işlemi sırasında hata:", error);
            alert("Takip işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.");
        } finally {
            setFollowLoading(false);
        }
    };

    const handleLike = async (item) => {
        if (!authUser?.uid) {
            router.push('/giris');
            return;
        }
        
        try {
            if (item.isLiked) {
                await unlikeRecommendation(authUser.uid, item.id);
                setRecommendations(prev => prev.map(rec => 
                    rec.id === item.id 
                        ? { ...rec, isLiked: false, likeCount: Math.max(0, (rec.likeCount || 0) - 1) }
                        : rec
                ));
            } else {
                await likeRecommendation(authUser.uid, item.id);
                setRecommendations(prev => prev.map(rec => 
                    rec.id === item.id 
                        ? { ...rec, isLiked: true, likeCount: (rec.likeCount || 0) + 1 }
                        : rec
                ));

                // Bildirim gönderme
                if (item.userId && item.userId !== authUser.uid) {
                    try {
                        const currentUserProfile = await getUserProfile(authUser.uid);
                        if (currentUserProfile) {
                            await createLikeNotification(
                                item.id,
                                item.userId,
                                authUser.uid,
                                currentUserProfile.name || currentUserProfile.username || 'Kullanıcı',
                                getAvatarUrlWithFallback(currentUserProfile.photoURL, currentUserProfile.name, currentUserProfile.username),
                                item.title,
                                item.imageUrl
                            );
                        }
                    } catch (notifError) {
                        console.error("Beğeni bildirimi gönderme hatası:", notifError);
                    }
                }
            }
        } catch (error) {
            console.error('Beğeni hatası:', error);
            alert(error.message || 'Beğeni işlemi başarısız oldu.');
        }
    };

    const handleSave = async (item) => {
        if (!authUser?.uid) {
            router.push('/giris');
            return;
        }
        
        try {
            const isSaved = await isRecommendationSaved(authUser.uid, item.id);
            if (isSaved) {
                await unsaveRecommendation(authUser.uid, item.id);
            } else {
                await saveRecommendation(authUser.uid, item.id);
            }
        } catch (error) {
            console.error('Kaydetme hatası:', error);
        }
    };

    const profileAvatar = profileUser ? getAvatarUrlWithFallback(profileUser.photoURL, profileUser.name, profileUser.username) : 'https://ui-avatars.com/api/?name=?&background=random';
    const myProfileAvatar = userProfile ? getAvatarUrlWithFallback(userProfile.photoURL, userProfile.name, userProfile.username) : 'https://ui-avatars.com/api/?name=?&background=random';

    if (authLoading || loading) {
        return (
            <div className="w-full min-h-screen bg-dark flex items-center justify-center">
                <div className="loader"></div>
            </div>
        );
    }

    if (error || !profileUser) {
        return (
            <div className="w-full min-h-screen bg-dark flex flex-col items-center justify-center p-4">
                <i className="fas fa-exclamation-circle text-4xl text-red-500 mb-4"></i>
                <p className="text-red-500 text-center">{error || "Profil bulunamadı."}</p>
                <Link href="/" className="mt-4 px-6 py-2 bg-primary text-light rounded-xl hover:bg-primary-dark transition-colors">
                    Ana Sayfaya Dön
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-dark antialiased">
            <Header 
                authUser={authUser}
                showBackButton={true}
                backHref="/"
                unreadCount={unreadCount}
            />

            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
                {/* Sol Sidebar - Kendi Profilimiz */}
                {authUser && (
                    <Sidebar
                        userProfile={userProfile}
                        profileAvatar={myProfileAvatar}
                        recommendationsCount={recommendationsCount}
                        followersCount={followersCount}
                        followingCount={followingCount}
                        categories={categories}
                        sidebarView={sidebarHook.sidebarView}
                        sidebarUsers={sidebarHook.sidebarUsers}
                        isLoadingSidebar={sidebarHook.isLoadingSidebar}
                        savedRecommendations={sidebarHook.savedRecommendations}
                        isLoadingSaved={sidebarHook.isLoadingSaved}
                        onShowUsersList={(type) => sidebarHook.showUsersList(type)}
                        onShowSavedList={sidebarHook.showSavedList}
                        onShowProfile={() => sidebarHook.setSidebarView('profile')}
                        onItemClick={(recId) => router.push(`/?rec=${recId}`)}
                    />
                )}

                {/* Ana İçerik - Diğer Kullanıcının Profili */}
                <main className="flex-1">
                    <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
                        {/* Profil Bilgileri */}
                        <div className="flex items-start gap-4 mb-6">
                            <div className="relative w-20 h-20 rounded-full border-3 border-primary p-1">
                                <Image
                                    src={profileAvatar}
                                    alt={profileUser.name || 'Kullanıcı'}
                                    width={80}
                                    height={80}
                                    className="rounded-full object-cover"
                                    unoptimized
                                />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div>
                                        <h2 className="text-2xl font-bold text-light">{profileUser.name || "İsimsiz"}</h2>
                                        {profileUser.username && (
                                            <p className="text-base text-muted">@{profileUser.username}</p>
                                        )}
                                    </div>
                                </div>
                                {profileUser.bio && (
                                    <p className="text-sm text-muted mt-2">{profileUser.bio}</p>
                                )}
                            </div>
                        </div>

                        {/* İstatistikler */}
                        <div className="bg-dark rounded-2xl p-5 mb-6 border border-border">
                            <div className="flex justify-around items-center">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-primary">{profileUser.recommendationsCount || recommendations.length}</p>
                                    <p className="text-sm text-muted font-medium">Tavsiye</p>
                                </div>
                                <div className="w-px h-10 bg-border"></div>
                                <Link href={`/profil/${userId}/takipciler`} className="text-center">
                                    <p className="text-2xl font-bold text-primary">{profileUser.followersCount || 0}</p>
                                    <p className="text-sm text-muted font-medium">Takipçi</p>
                                </Link>
                                <div className="w-px h-10 bg-border"></div>
                                <Link href={`/profil/${userId}/takip-edilenler`} className="text-center">
                                    <p className="text-2xl font-bold text-primary">{profileUser.followingCount || 0}</p>
                                    <p className="text-sm text-muted font-medium">Takip</p>
                                </Link>
                            </div>
                        </div>

                        {/* Takip Et Butonu */}
                        {authUser && authUser.uid !== userId && (
                            <div className="mb-6">
                                <button
                                    onClick={handleFollowToggle}
                                    disabled={followLoading}
                                    className={`w-full font-bold py-3 px-4 rounded-xl transition-colors ${
                                        isFollowing
                                            ? 'bg-dark text-primary border border-border hover:bg-primary/20'
                                            : 'bg-primary text-light hover:bg-primary-dark'
                                    } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {followLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="spinner-sm"></div>
                                            <span>İşleniyor...</span>
                                        </span>
                                    ) : (
                                        isFollowing ? 'Takibi Bırak' : 'Takip Et'
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Tavsiyeler */}
                        <div className="space-y-4">
                            {recommendations.length > 0 ? (
                                recommendations.map((item) => (
                                    <div key={item.id} onClick={() => router.push(`/?rec=${item.id}`)}>
                                        <RecommendationCard
                                            rec={item}
                                            currentUserData={{ uid: authUser?.uid }}
                                            onLike={() => handleLike(item)}
                                            onSave={() => handleSave(item)}
                                            onDelete={null}
                                        />
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10">
                                    <div className="w-20 h-20 bg-dark rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <i className="fas fa-lightbulb text-3xl text-primary"></i>
                                    </div>
                                    <p className="text-muted">Bu kullanıcının henüz hiç tavsiyesi yok.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
