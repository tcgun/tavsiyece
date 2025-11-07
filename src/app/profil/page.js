'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { collection, doc, documentId, getDoc, getDocs, orderBy, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { getFollowers, getFollowing, getUserProfile } from '../../services/firebase/userService';
import { isRecommendationSaved, likeRecommendation, saveRecommendation, unlikeRecommendation, unsaveRecommendation } from '../../services/firebase/recommendationService';
import { getAvatarUrlWithFallback } from '../../utils/avatarUtils';
import { formatRelativeTime } from '../../utils/dateUtils';
import RecommendationCard from '../../components/RecommendationCard';
import AddToListModal from '../../components/AddToListModal';

export default function ProfilePage() {
    const { user: authUser, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('recommendations');
    
    // Dinamik State'ler
    const [userProfile, setUserProfile] = useState(null);
    const [userRecommendations, setUserRecommendations] = useState([]);
    const [savedRecommendations, setSavedRecommendations] = useState([]);
    const [loadingSaved, setLoadingSaved] = useState(false);
    const [followers, setFollowers] = useState([]);
    const [following, setFollowing] = useState([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecId, setSelectedRecId] = useState(null);

    const currentUserId = authUser?.uid;

     useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            
            if (!currentUserId) {
                setError("Kullanıcı bulunamadı. Lütfen giriş yapın.");
                setIsLoading(false);
                return;
            }

            try {
                // 1. Kullanıcı profilini çek
                const userRef = doc(db, 'users', currentUserId);
                const userSnap = await getDoc(userRef);

                let profileData = null;
                if (userSnap.exists()) {
                    profileData = { id: userSnap.id, ...userSnap.data() };
                    setUserProfile(profileData);
                } else {
                    setError("Profil bilgileri bulunamadı.");
                    setIsLoading(false);
                    return;
                }

                // 2. Kullanıcının tavsiyelerini çek
                const recQuery = query(
                    collection(db, 'recommendations'),
                    where('userId', '==', currentUserId),
                    orderBy('createdAt', 'desc')
                );
                const recSnapshot = await getDocs(recQuery);
                
                // Beğeni ve yorum sayılarını batch olarak çek
                const recommendationIds = recSnapshot.docs.map(doc => doc.id);
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
                recSnapshot.forEach((doc) => {
                    const data = doc.data();
                    const counts = countsMap.get(doc.id) || { likeCount: 0, commentCount: 0 };
                    const isLiked = likedRecommendationIds.has(doc.id);
                    
                    fetchedRecs.push({
                        id: doc.id,
                        title: data.title || 'Başlıksız',
                        text: data.text || '',
                        category: data.category || 'Kategori Yok',
                        userId: currentUserId || '',
                        image: data.image || null,
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
                setUserRecommendations(fetchedRecs);
                
                // 3. Takipçi ve takip edilen listelerini çek
                const [followersList, followingList] = await Promise.all([
                    getFollowers(currentUserId, 10),
                    getFollowing(currentUserId, 10),
                ]);
                setFollowers(followersList);
                setFollowing(followingList);
                
            } catch (err) {
                console.error("Profil verisi çekme hatası:", err.message);
                setError("Profil yüklenirken bir hata oluştu.");
            } finally {
                setIsLoading(false);
            }
        };

        if (!authLoading && currentUserId) {
            fetchData();
        } else if (!authLoading && !currentUserId) {
            router.push('/giris');
        }
    }, [currentUserId, authLoading, router, authUser?.uid]);

    // Kaydedilen tavsiyeleri yeniden yükle
    useEffect(() => {
        if (activeTab === 'saved' && savedRecommendations.length === 0 && !loadingSaved) {
            const fetchSavedRecommendations = async () => {
                if (!currentUserId) return;
                
                setLoadingSaved(true);
                try {
                    const savedRecsRef = collection(db, 'users', currentUserId, 'savedRecommendations');
                    const savedSnap = await getDocs(savedRecsRef);
                    const savedIds = savedSnap.docs.map(doc => doc.id);

                    if (savedIds.length > 0) {
                        const batchSize = 10;
                        const fetchedSavedRecs = [];
                        
                        // Paralel sorgularla tüm kaydedilenleri çek
                        const promises = [];
                        for (let i = 0; i < savedIds.length; i += batchSize) {
                            const batch = savedIds.slice(i, i + batchSize);
                            const savedRecsQuery = query(
                                collection(db, 'recommendations'),
                                where(documentId(), 'in', batch)
                            );
                            promises.push(getDocs(savedRecsQuery));
                        }
                        
                        const snapshots = await Promise.all(promises);
                        const allRecs = [];
                        snapshots.forEach(snapshot => {
                            snapshot.forEach((doc) => {
                                allRecs.push({ id: doc.id, ...doc.data() });
                            });
                        });

                        // Beğeni ve yorum sayılarını batch olarak çek
                        const countsMap = new Map();
                        const likedRecommendationIds = new Set();

                        if (allRecs.length > 0 && authUser?.uid) {
                            // Beğeni durumunu kontrol et
                            const likesPromises = allRecs.map(async (rec) => {
                                const likeRef = doc(db, 'recommendations', rec.id, 'likes', authUser.uid);
                                const likeSnap = await getDoc(likeRef);
                                return { recId: rec.id, isLiked: likeSnap.exists() };
                            });
                            const likesResults = await Promise.all(likesPromises);
                            likesResults.forEach(({ recId, isLiked }) => {
                                if (isLiked) likedRecommendationIds.add(recId);
                            });

                            // Beğeni ve yorum sayılarını çek
                            const countPromises = allRecs.map(async (rec) => {
                                try {
                                    const [likesSnap, commentsSnap] = await Promise.all([
                                        getDocs(collection(db, 'recommendations', rec.id, 'likes')),
                                        getDocs(collection(db, 'recommendations', rec.id, 'comments'))
                                    ]);
                                    return {
                                        id: rec.id,
                                        likeCount: likesSnap.size,
                                        commentCount: commentsSnap.size
                                    };
                                } catch (error) {
                                    console.error(`Sayılar çekilirken hata (${rec.id}):`, error);
                                    return { id: rec.id, likeCount: 0, commentCount: 0 };
                                }
                            });

                            const counts = await Promise.all(countPromises);
                            counts.forEach(count => {
                                countsMap.set(count.id, { likeCount: count.likeCount, commentCount: count.commentCount });
                            });
                        }

                        // Kullanıcı bilgilerini çek
                        const userIds = [...new Set(allRecs.map(rec => rec.userId).filter(Boolean))];
                        const userMap = new Map();
                        
                        await Promise.all(
                            userIds.map(async (userId) => {
                                try {
                                    const userRef = doc(db, 'users', userId);
                                    const userSnap = await getDoc(userRef);
                                    if (userSnap.exists()) {
                                        userMap.set(userId, { id: userSnap.id, ...userSnap.data() });
                                    }
                                } catch (error) {
                                    console.error(`Kullanıcı bilgisi çekilirken hata (${userId}):`, error);
                                }
                            })
                        );

                        // RecommendationCardData formatına dönüştür
                        allRecs.forEach((rec) => {
                            const counts = countsMap.get(rec.id) || { likeCount: 0, commentCount: 0 };
                            const isLiked = likedRecommendationIds.has(rec.id);
                            const recUser = rec.userId ? userMap.get(rec.userId) : null;
                            
                            fetchedSavedRecs.push({
                                id: rec.id,
                                title: rec.title || 'Başlıksız',
                                text: rec.text || '',
                                category: rec.category || 'Kategori Yok',
                                userId: rec.userId || '',
                                image: rec.image || null,
                                user: {
                                    name: recUser?.name || recUser?.username || 'Kullanıcı',
                                    avatar: getAvatarUrlWithFallback(recUser?.photoURL, recUser?.name, recUser?.username),
                                },
                                isLiked: isLiked,
                                likeCount: counts.likeCount,
                                commentCount: counts.commentCount,
                                createdAt: rec.createdAt,
                            });
                        });
                        
                        setSavedRecommendations(fetchedSavedRecs);
                    } else {
                        setSavedRecommendations([]);
                    }
                } catch (error) {
                    console.error('Kaydedilen tavsiyeler yüklenirken hata oluştu:', error);
                    setSavedRecommendations([]);
                } finally {
                    setLoadingSaved(false);
                }
            };
            
            fetchSavedRecommendations();
        }
    }, [activeTab, currentUserId, authUser?.uid, loadingSaved, savedRecommendations.length]);

    const handleLike = async (item) => {
        if (!authUser?.uid) return;
        
        try {
            if (item.isLiked) {
                await unlikeRecommendation(authUser.uid, item.id);
                if (activeTab === 'recommendations') {
                    setUserRecommendations(prev => prev.map(rec => 
                        rec.id === item.id 
                            ? { ...rec, isLiked: false, likeCount: Math.max(0, (rec.likeCount || 0) - 1) }
                            : rec
                    ));
                } else {
                    setSavedRecommendations(prev => prev.map(rec => 
                        rec.id === item.id 
                            ? { ...rec, isLiked: false, likeCount: Math.max(0, (rec.likeCount || 0) - 1) }
                            : rec
                    ));
                }
            } else {
                await likeRecommendation(authUser.uid, item.id);
                if (activeTab === 'recommendations') {
                    setUserRecommendations(prev => prev.map(rec => 
                        rec.id === item.id 
                            ? { ...rec, isLiked: true, likeCount: (rec.likeCount || 0) + 1 }
                            : rec
                    ));
                } else {
                    setSavedRecommendations(prev => prev.map(rec => 
                        rec.id === item.id 
                            ? { ...rec, isLiked: true, likeCount: (rec.likeCount || 0) + 1 }
                            : rec
                    ));
                }
            }
        } catch (error) {
            console.error('Beğeni hatası:', error);
            alert(error.message || 'Beğeni işlemi başarısız oldu.');
        }
    };

    const handleSave = async (item) => {
        if (!authUser?.uid) return;
        
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

    const handleDeleteRecommendation = async (postId) => {
        if (!authUser?.uid) return;

        const recommendationToDelete = userRecommendations.find(rec => rec.id === postId);
        if (!recommendationToDelete || recommendationToDelete.userId !== authUser.uid) {
            alert("Bu tavsiyeyi silme yetkiniz yok.");
            return;
        }

        if (window.confirm("Bu tavsiyeyi silmek istediğinizden emin misiniz?")) {
            try {
                const postRef = doc(db, "recommendations", postId);
                await deleteDoc(postRef);
                setUserRecommendations(prev => prev.filter(rec => rec.id !== postId));
            } catch (error) {
                console.error("Tavsiye silinirken hata:", error);
                alert("Tavsiye silinirken bir hata oluştu.");
            }
        }
    };

    // Yüklenme veya Hata Durumu
    if (authLoading || isLoading) {
        return (
            <div className="w-full min-h-screen bg-[#1C1424] flex items-center justify-center">
                <div className="loader"></div>
            </div>
        );
    }

    if (error || !userProfile || !currentUserId) {
        return (
            <div className="w-full min-h-screen bg-[#1C1424] flex flex-col items-center justify-center p-4">
                <i className="fas fa-exclamation-circle text-4xl text-red-500 mb-4"></i>
                <p className="text-red-500 text-center">{error || "Profil bulunamadı."}</p>
            </div>
        );
    }

    const profileImageUrl = userProfile.photoURL;
    const profileAvatar = getAvatarUrlWithFallback(profileImageUrl, userProfile.name, userProfile.username);

    return (
        <main className="w-full min-h-screen bg-[#1C1424] pb-20">
            <header className="sticky top-0 z-10 bg-[#1C1424]/90 backdrop-blur-sm shadow-sm border-b border-[rgba(255,255,255,0.1)]">
                 <div className="p-4 flex justify-between items-center">
                    <div className="w-10"></div>
                    <h1 className="text-xl font-bold text-[#f8fafc]">@{userProfile.username}</h1>
                    <Link href="/ayarlar" className="text-[#9ca3af] hover:bg-[#2a1f3d] w-10 h-10 flex items-center justify-center rounded-full transition-colors">
                        <i className="fas fa-cog text-lg"></i>
                    </Link>
                </div>
            </header>

            <div className="p-4">
            {/* Profil Bilgileri */}
                <div className="flex items-start gap-4 mb-6">
                    <Link href="/ayarlar/profili-duzenle">
                        <div className="relative w-20 h-20 rounded-full border-3 border-[#BA68C8] p-1">
                    <Image
                                src={profileAvatar}
                                alt={userProfile.name || 'Kullanıcı'}
                                width={80}
                                height={80}
                                className="rounded-full object-cover"
                                unoptimized
                            />
                        </div>
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                                <h2 className="text-2xl font-bold text-[#f8fafc]">{userProfile.name || "İsimsiz"}</h2>
                                {userProfile.username && (
                                    <p className="text-base text-[#9ca3af]">@{userProfile.username}</p>
                                )}
                            </div>
                            <Link 
                                href="/ayarlar/profili-duzenle"
                                className="flex items-center gap-2 bg-[#BA68C8] text-white font-semibold px-4 py-2 rounded-full hover:bg-[#9c4fb8] transition-colors"
                            >
                                <i className="fas fa-edit text-sm"></i>
                                <span>Düzenle</span>
                            </Link>
                        </div>
                        {userProfile.bio && (
                            <p className="text-sm text-[#9ca3af] mt-2">{userProfile.bio}</p>
                        )}
                    </div>
                </div>

                    {/* İstatistikler */}
                <div className="bg-[#2a1f3d] rounded-2xl p-5 mb-6 border border-[rgba(255,255,255,0.1)]">
                    <div className="flex justify-around items-center">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-[#BA68C8]">{userProfile.recommendationsCount || userRecommendations.length}</p>
                            <p className="text-sm text-[#9ca3af] font-medium">Tavsiye</p>
                        </div>
                        <div className="w-px h-10 bg-[rgba(255,255,255,0.1)]"></div>
                        <Link href={`/profil/${currentUserId}/takipciler`} className="text-center">
                            <p className="text-2xl font-bold text-[#BA68C8]">{userProfile.followersCount || followers.length}</p>
                            <p className="text-sm text-[#9ca3af] font-medium">Takipçi</p>
                        </Link>
                        <div className="w-px h-10 bg-[rgba(255,255,255,0.1)]"></div>
                        <Link href={`/profil/${currentUserId}/takip-edilenler`} className="text-center">
                            <p className="text-2xl font-bold text-[#BA68C8]">{userProfile.followingCount || following.length}</p>
                            <p className="text-sm text-[#9ca3af] font-medium">Takip</p>
                        </Link>
                </div>
            </div>

            {/* Sekmeler */}
                <div className="flex border-b border-[rgba(255,255,255,0.1)] mb-4">
                    <button
                        onClick={() => setActiveTab('recommendations')}
                        className={`flex-1 py-3 text-center font-semibold border-b-2 transition-colors ${
                            activeTab === 'recommendations'
                                ? 'border-[#BA68C8] text-[#BA68C8]'
                                : 'border-transparent text-[#9ca3af]'
                        }`}
                    >
                        Tavsiyeler
                    </button>
                    <button
                        onClick={() => setActiveTab('saved')}
                        className={`flex-1 py-3 text-center font-semibold border-b-2 transition-colors flex items-center justify-center gap-2 ${
                            activeTab === 'saved'
                                ? 'border-[#BA68C8] text-[#BA68C8]'
                                : 'border-transparent text-[#9ca3af]'
                        }`}
                    >
                        <i className="fas fa-bookmark"></i>
                    </button>
            </div>

                {/* Sekme İçeriği */}
                {activeTab === 'recommendations' && (
                    <div className="space-y-4">
                        {userRecommendations.length > 0 ? (
                            userRecommendations.map((item) => (
                                <div key={item.id} onClick={() => router.push(`/tavsiye/${item.id}`)}>
                                <RecommendationCard
                                        rec={item}
                                        currentUserData={{ uid: authUser?.uid }}
                                        onLike={() => handleLike(item)}
                                        onSave={() => handleSave(item)}
                                        onDelete={handleDeleteRecommendation}
                                    />
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-[#9ca3af]">Henüz hiç tavsiye eklenmemiş.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'saved' && (
                    <div className="space-y-4">
                        {loadingSaved ? (
                            <div className="flex justify-center py-8">
                                <div className="spinner-sm"></div>
                                    </div>
                        ) : savedRecommendations.length > 0 ? (
                            savedRecommendations.map((item) => (
                                <div key={item.id} onClick={() => router.push(`/tavsiye/${item.id}`)}>
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
                                <p className="text-[#9ca3af]">Henüz kaydedilmiş tavsiyen yok.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isModalOpen && authUser && (
                <AddToListModal
                    recommendationId={selectedRecId}
                    userId={authUser.uid}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </main>
    );
}
