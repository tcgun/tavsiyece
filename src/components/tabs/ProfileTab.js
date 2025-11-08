'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { collection, doc, documentId, getDoc, getDocs, orderBy, query, where, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { getFollowers, getFollowing } from '../../services/firebase/userService';
import { isRecommendationSaved, likeRecommendation, saveRecommendation, unlikeRecommendation, unsaveRecommendation } from '../../services/firebase/recommendationService';
import { getAvatarUrlWithFallback } from '../../utils/avatarUtils';
import RecommendationCard from '../RecommendationCard';

export default function ProfileTab({
    userProfile,
    authUser,
    onLike,
    onSave,
    onDelete,
    onShowSettings,
    onShowFollowers,
    onShowFollowing,
    onItemClick
}) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('recommendations');
    const [userRecommendations, setUserRecommendations] = useState([]);
    const [savedRecommendations, setSavedRecommendations] = useState([]);
    const [loadingSaved, setLoadingSaved] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [followers, setFollowers] = useState([]);
    const [following, setFollowing] = useState([]);

    const currentUserId = authUser?.uid;

    // Tavsiyeleri çek
    useEffect(() => {
        if (!currentUserId || !userProfile) return;

        const fetchRecommendations = async () => {
            setIsLoading(true);
            try {
                const recQuery = query(
                    collection(db, 'recommendations'),
                    where('userId', '==', currentUserId),
                    orderBy('createdAt', 'desc')
                );
                const recSnapshot = await getDocs(recQuery);
                
                const recommendationIds = recSnapshot.docs.map(doc => doc.id);
                const countsMap = new Map();
                const likedRecommendationIds = new Set();

                if (recommendationIds.length > 0 && authUser?.uid) {
                    const likesPromises = recommendationIds.map(async (recId) => {
                        const likeRef = doc(db, 'recommendations', recId, 'likes', authUser.uid);
                        const likeSnap = await getDoc(likeRef);
                        return { recId, isLiked: likeSnap.exists() };
                    });
                    const likesResults = await Promise.all(likesPromises);
                    likesResults.forEach(({ recId, isLiked }) => {
                        if (isLiked) likedRecommendationIds.add(recId);
                    });

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
                        image: data.image || data.imageUrl || null,
                        imageUrl: data.imageUrl || data.image || null,
                        user: {
                            name: userProfile?.name || userProfile?.username || 'Kullanıcı',
                            avatar: getAvatarUrlWithFallback(userProfile?.photoURL, userProfile?.name, userProfile?.username),
                        },
                        isLiked: isLiked,
                        likeCount: counts.likeCount,
                        commentCount: counts.commentCount,
                        createdAt: data.createdAt,
                    });
                });
                setUserRecommendations(fetchedRecs);
            } catch (err) {
                console.error("Tavsiyeler çekilirken hata:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecommendations();
    }, [currentUserId, userProfile, authUser?.uid]);

    // Takipçi ve takip edilenleri çek (sadece liste için, sayılar userProfile'den geliyor)
    useEffect(() => {
        if (!currentUserId) return;

        const fetchFollowData = async () => {
            try {
                const [followersList, followingList] = await Promise.all([
                    getFollowers(currentUserId, 1000),
                    getFollowing(currentUserId, 1000)
                ]);
                setFollowers(followersList);
                setFollowing(followingList);
            } catch (err) {
                console.error("Takipçi/takip edilen çekilirken hata:", err);
            }
        };

        fetchFollowData();
    }, [currentUserId, userProfile]);

    // Kaydedilen tavsiyeleri çek
    useEffect(() => {
        if (activeTab === 'saved' && savedRecommendations.length === 0 && !loadingSaved && currentUserId) {
            const fetchSavedRecommendations = async () => {
                setLoadingSaved(true);
                try {
                    const savedRecsRef = collection(db, 'users', currentUserId, 'savedRecommendations');
                    const savedSnap = await getDocs(savedRecsRef);
                    const savedIds = savedSnap.docs.map(doc => doc.id);

                    if (savedIds.length > 0) {
                        const batchSize = 10;
                        const fetchedSavedRecs = [];
                        
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

                        const countsMap = new Map();
                        const likedRecommendationIds = new Set();

                        if (allRecs.length > 0 && authUser?.uid) {
                            const likesPromises = allRecs.map(async (rec) => {
                                const likeRef = doc(db, 'recommendations', rec.id, 'likes', authUser.uid);
                                const likeSnap = await getDoc(likeRef);
                                return { recId: rec.id, isLiked: likeSnap.exists() };
                            });
                            const likesResults = await Promise.all(likesPromises);
                            likesResults.forEach(({ recId, isLiked }) => {
                                if (isLiked) likedRecommendationIds.add(recId);
                            });

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
                                image: rec.image || rec.imageUrl || null,
                                imageUrl: rec.imageUrl || rec.image || null,
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
                
                // Kullanıcının recommendationsCount'unu azalt
                try {
                    const userRef = doc(db, 'users', authUser.uid);
                    await updateDoc(userRef, {
                        recommendationsCount: increment(-1)
                    });
                } catch (error) {
                    console.error("RecommendationsCount güncellenirken hata:", error);
                }
                
                setUserRecommendations(prev => prev.filter(rec => rec.id !== postId));
            } catch (error) {
                console.error("Tavsiye silinirken hata:", error);
                alert("Tavsiye silinirken bir hata oluştu.");
            }
        }
    };

    if (!userProfile) {
        return (
            <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
                <div className="flex justify-center py-12">
                    <div className="loader"></div>
                </div>
            </div>
        );
    }

    const profileAvatar = getAvatarUrlWithFallback(userProfile.photoURL, userProfile.name, userProfile.username);

    return (
        <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-light">@{userProfile.username}</h1>
                <button 
                    onClick={onShowSettings}
                    className="text-muted hover:text-primary p-2 rounded-xl hover:bg-card transition-colors"
                >
                    <i className="fas fa-cog text-lg"></i>
                </button>
            </div>

            {/* Profil Bilgileri */}
            <div className="flex items-start gap-4 mb-6">
                <Link href="/ayarlar/profili-duzenle">
                    <div className="relative w-20 h-20 rounded-full border-3 border-primary p-1">
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
                            <h2 className="text-2xl font-bold text-light">{userProfile.name || "İsimsiz"}</h2>
                            {userProfile.username && (
                                <p className="text-base text-muted">@{userProfile.username}</p>
                            )}
                        </div>
                        <Link 
                            href="/ayarlar/profili-duzenle"
                            className="flex items-center gap-2 bg-primary text-light font-semibold px-4 py-2 rounded-full hover:bg-primary-dark transition-colors"
                        >
                            <i className="fas fa-edit text-sm"></i>
                            <span>Düzenle</span>
                        </Link>
                    </div>
                    {userProfile.bio && (
                        <p className="text-sm text-muted mt-2">{userProfile.bio}</p>
                    )}
                </div>
            </div>

            {/* İstatistikler */}
            <div className="bg-dark rounded-2xl p-5 mb-6 border border-border">
                <div className="flex justify-around items-center">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{userProfile.recommendationsCount || userRecommendations.length}</p>
                        <p className="text-sm text-muted font-medium">Tavsiye</p>
                    </div>
                    <div className="w-px h-10 bg-border"></div>
                    <button 
                        onClick={onShowFollowers}
                        className="text-center hover:opacity-80 transition-opacity"
                    >
                        <p className="text-2xl font-bold text-primary">
                            {userProfile?.followersCount !== undefined && userProfile?.followersCount !== null 
                                ? userProfile.followersCount 
                                : (followers.length > 0 ? followers.length : 0)}
                        </p>
                        <p className="text-sm text-muted font-medium">Takipçi</p>
                    </button>
                    <div className="w-px h-10 bg-border"></div>
                    <button 
                        onClick={onShowFollowing}
                        className="text-center hover:opacity-80 transition-opacity"
                    >
                        <p className="text-2xl font-bold text-primary">
                            {userProfile?.followingCount !== undefined && userProfile?.followingCount !== null 
                                ? userProfile.followingCount 
                                : (following.length > 0 ? following.length : 0)}
                        </p>
                        <p className="text-sm text-muted font-medium">Takip</p>
                    </button>
                </div>
            </div>

            {/* Sekmeler */}
            <div className="flex border-b border-border mb-4">
                <button
                    onClick={() => setActiveTab('recommendations')}
                    className={`flex-1 py-3 text-center font-semibold border-b-2 transition-colors ${
                        activeTab === 'recommendations'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted'
                    }`}
                >
                    Tavsiyeler
                </button>
                <button
                    onClick={() => setActiveTab('saved')}
                    className={`flex-1 py-3 text-center font-semibold border-b-2 transition-colors flex items-center justify-center gap-2 ${
                        activeTab === 'saved'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted'
                    }`}
                >
                    <i className="fas fa-bookmark"></i>
                </button>
            </div>

            {/* Sekme İçeriği */}
            {activeTab === 'recommendations' && (
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="spinner-sm"></div>
                        </div>
                    ) : userRecommendations.length > 0 ? (
                        userRecommendations.map((item) => (
                            <div key={item.id} onClick={() => onItemClick && onItemClick(item.id)}>
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
                            <div className="w-20 h-20 bg-dark rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <i className="fas fa-lightbulb text-3xl text-primary"></i>
                            </div>
                            <p className="text-muted">Henüz hiç tavsiye eklenmemiş.</p>
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
                            <div key={item.id} onClick={() => onItemClick && onItemClick(item.id)}>
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
                                <i className="fas fa-bookmark text-3xl text-primary"></i>
                            </div>
                            <p className="text-muted">Henüz kaydedilmiş tavsiyen yok.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

