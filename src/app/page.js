'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { collection, doc, documentId, getDoc, getDocs, limit, orderBy, query, where, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { getFollowers, getFollowing, getUserProfile } from '../services/firebase/userService';
import { createLikeNotification } from '../services/firebase/notificationService';
import { isRecommendationSaved, likeRecommendation, saveRecommendation, unlikeRecommendation, unsaveRecommendation } from '../services/firebase/recommendationService';
import { getAvatarUrlWithFallback, formatRelativeTime, normalizeText } from '../utils';
import RecommendationCard from '../components/RecommendationCard';
import RecommendationDetailModal from '../components/RecommendationDetailModal';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';
import { markAllNotificationsAsRead, markNotificationAsRead } from '../services/firebase/notificationService';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export default function HomePage() {
    const { user: authUser, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const unreadCount = useUnreadNotifications();

    // Ana state'ler
    const [activeTab, setActiveTab] = useState('following'); // 'following', 'popular', 'explore', 'notifications'
    const [recommendations, setRecommendations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Profil state'leri
    const [userProfile, setUserProfile] = useState(null);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [recommendationsCount, setRecommendationsCount] = useState(0);
    const [categories, setCategories] = useState([]);
    
    // Keşfet state'leri
    const [trendingItems, setTrendingItems] = useState([]);
    const [featuredUsers, setFeaturedUsers] = useState([]);
    const [popularUsers, setPopularUsers] = useState([]);
    const [activeUserTab, setActiveUserTab] = useState('new');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [recommendationResults, setRecommendationResults] = useState([]);
    const [userResults, setUserResults] = useState([]);
    const [myFollowingIds, setMyFollowingIds] = useState(new Set());
    
    // Bildirimler state'leri
    const [notifications, setNotifications] = useState([]);
    
    // Sidebar view state ('profile', 'followers', 'following', 'saved')
    const [sidebarView, setSidebarView] = useState('profile');
    const [sidebarUsers, setSidebarUsers] = useState([]);
    const [isLoadingSidebar, setIsLoadingSidebar] = useState(false);
    const [savedRecommendations, setSavedRecommendations] = useState([]);
    const [isLoadingSaved, setIsLoadingSaved] = useState(false);
    
    // Tavsiye detay modal state
    const [selectedRecId, setSelectedRecId] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Kategorileri çek
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                // Önce order field'ı ile dene
                try {
                    const catQuery = query(collection(db, 'categories'), orderBy('order', 'asc'));
                    const catSnapshot = await getDocs(catQuery);
                    if (!catSnapshot.empty) {
                        const fetchedCategories = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        setCategories(fetchedCategories);
                        return;
                    }
                } catch (orderError) {
                    // order field yoksa veya permission hatası varsa normal çek
                    if (orderError.code === 'permission-denied') {
                        console.log("Kategoriler için yetki hatası:", orderError);
                        setCategories([]);
                        return;
                    }
                }
                
                // order field yoksa normal çek
                try {
                    const catQuery = query(collection(db, 'categories'));
                    const catSnapshot = await getDocs(catQuery);
                    const fetchedCategories = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setCategories(fetchedCategories);
                } catch (queryError) {
                    if (queryError.code === 'permission-denied') {
                        console.log("Kategoriler için yetki hatası:", queryError);
                    } else {
                        console.error("Kategoriler çekilirken hata:", queryError);
                    }
                    setCategories([]);
                }
            } catch (err) {
                console.error("Kategoriler çekilirken genel hata:", err);
                setCategories([]);
            }
        };
        fetchCategories();
    }, []);

    // Profil bilgilerini çek
    useEffect(() => {
        const fetchProfile = async () => {
            if (!authUser?.uid) return;
            
            try {
                const profile = await getUserProfile(authUser.uid);
                if (profile) {
                    setUserProfile(profile);
                    setRecommendationsCount(profile.recommendationsCount || 0);
                    
                    // Takipçi ve takip sayılarını çek
                    const [followersList, followingList] = await Promise.all([
                        getFollowers(authUser.uid, 1000),
                        getFollowing(authUser.uid, 1000)
                    ]);
                    setFollowersCount(profile.followersCount || followersList.length);
                    setFollowingCount(profile.followingCount || followingList.length);
                }
            } catch (err) {
                console.error("Profil çekilirken hata:", err);
            }
        };
        
        if (!authLoading && authUser) {
            fetchProfile();
        }
    }, [authUser, authLoading]);

    // Takip listesini çek (keşfet için)
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

    // Takip edilen kullanıcıların tavsiyelerini çek
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
                    limit(20)
                );
                recPromises.push(getDocs(recsQueryBatch));
            }
            
            const snapshots = await Promise.all(recPromises);
            snapshots.forEach(snapshot => {
                snapshot.forEach((doc) => {
                    allRecsData.push({ id: doc.id, ...doc.data() });
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
                    image: rec.image || null,
                    category: rec.category || 'Kategori Yok',
                    userId: rec.userId || '',
                    user: { name: finalUsername, avatar: finalAvatar },
                    isLiked: isLiked,
                    likeCount: counts.likeCount,
                    commentCount: counts.commentCount,
                    createdAt: rec.createdAt,
                };
            }).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            
            setRecommendations(fetchedData);
        } catch (err) {
            console.error("Takip edilenlerin tavsiyelerini çekerken hata:", err);
            setError('Tavsiyeler yüklenemedi. Lütfen tekrar deneyin.');
        } finally {
            setIsLoading(false);
        }
    }, [authUser?.uid]);

    // Popüler/Algoritma tavsiyelerini çek (giriş yapmamış kullanıcılar için de çalışır)
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
                            // Permission hatası durumunda boş snapshot döndür
                            if (err.code === 'permission-denied') {
                                console.log("Kullanıcı bilgileri çekilemedi (yetki hatası):", err);
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
                    // Beğeni durumu çekilemezse devam et (giriş yapmamış kullanıcılar için normal)
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
                        // Permission hatası durumunda sessizce devam et
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
                    image: rec.image || null,
                    category: rec.category || 'Kategori Yok',
                    userId: rec.userId || '',
                    user: { name: finalUsername, avatar: finalAvatar },
                    isLiked: isLiked,
                    likeCount: counts.likeCount,
                    commentCount: counts.commentCount,
                    createdAt: rec.createdAt,
                };
            });
            
            setRecommendations(fetchedData);
        } catch (err) {
            console.error("Popüler tavsiyeler çekerken hata:", err);
            // Permission hatası ise kullanıcıya göster, diğer hatalar için genel mesaj
            if (err.code === 'permission-denied') {
                setError('Bu içeriğe erişmek için giriş yapmanız gerekiyor.');
            } else {
                setError('Tavsiyeler yüklenemedi. Lütfen tekrar deneyin.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [authUser?.uid]);

    // Keşfet verilerini çek
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
                // trending collection yoksa boş bırak
                setTrendingItems([]);
            }
            
            // myFollowingIds'i güncel olarak çek (dependency'den kaldırıldı)
            let currentFollowingIds = new Set();
            try {
                const followingQuery = query(collection(db, 'users', authUser.uid, 'following'));
                const followingSnapshot = await getDocs(followingQuery);
                followingSnapshot.docs.forEach(doc => {
                    currentFollowingIds.add(doc.id);
                });
            } catch (err) {
                // Hata durumunda boş Set kullan
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

    // Bildirimleri çek
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
            setIsLoading(false);
        } catch (err) {
            console.error('Bildirimler çekilirken hata:', err);
            setError('Bildirimler yüklenemedi: ' + err.message);
            setIsLoading(false);
        }
    }, [authUser?.uid]);

    // Arama fonksiyonu
    const performSearch = async (term) => {
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
                        image: data.image || null,
                    });
                });
                setRecommendationResults(recs);
            } catch (recError) {
                // keywords field yoksa boş bırak
                console.log("Tavsiye araması yapılamadı:", recError);
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
                // username_lowercase field yoksa boş bırak
                console.log("Kullanıcı araması yapılamadı:", userError);
                setUserResults([]);
            }
        } catch (err) {
            console.error("Arama hatası:", err);
            setUserResults([]);
            setRecommendationResults([]);
        }
    };

    // Tab değiştiğinde içeriği yükle
    useEffect(() => {
        if (authLoading) return;
        
        if (authUser) {
            if (activeTab === 'following') {
                fetchFollowingRecommendations();
            } else if (activeTab === 'popular') {
                fetchPopularRecommendations();
            } else if (activeTab === 'explore') {
                fetchExploreData();
            } else if (activeTab === 'notifications') {
                fetchNotifications();
            }
        } else {
            // Giriş yapmamış kullanıcılar için sadece popüler tavsiyeleri göster
            if (activeTab === 'popular' || activeTab === 'following') {
                fetchPopularRecommendations();
            }
        }
    }, [activeTab, authUser, authLoading, fetchFollowingRecommendations, fetchPopularRecommendations, fetchExploreData, fetchNotifications]);

    // activeUserTab değiştiğinde keşfet verilerini yenile
    useEffect(() => {
        if (activeTab === 'explore' && authUser?.uid) {
            fetchExploreData();
        }
    }, [activeUserTab, activeTab, authUser?.uid, fetchExploreData]);

    const handleLike = useCallback(async (recId) => {
        if (!authUser?.uid) {
            router.push('/giris');
            return;
        }
        const recToUpdate = recommendations.find(r => r.id === recId);
        if (!recToUpdate) return;

        try {
            if (recToUpdate.isLiked) {
                await unlikeRecommendation(authUser.uid, recId);
            } else {
                await likeRecommendation(authUser.uid, recId);
                if (recToUpdate.userId && recToUpdate.userId !== authUser.uid) {
                    const currentUserProfile = await getUserProfile(authUser.uid);
                    if (currentUserProfile) {
                        await createLikeNotification(
                            recId,
                            recToUpdate.userId,
                            authUser.uid,
                            currentUserProfile.name || currentUserProfile.username || 'Kullanıcı',
                            getAvatarUrlWithFallback(currentUserProfile.photoURL, currentUserProfile.name, currentUserProfile.username),
                            recToUpdate.title,
                            recToUpdate.image
                        );
                    }
                }
            }
            setRecommendations(prev => prev.map(rec => 
                rec.id === recId 
                    ? { ...rec, isLiked: !rec.isLiked, likeCount: rec.isLiked ? Math.max(0, rec.likeCount - 1) : rec.likeCount + 1 }
                    : rec
            ));
        } catch (error) {
            console.error("Beğenme işlemi sırasında hata:", error);
            alert(error.message || "Beğenme işlemi başarısız oldu.");
        }
    }, [authUser?.uid, recommendations, router]);

    const handleSave = useCallback(async (recId) => {
        if (!authUser?.uid) {
            router.push('/giris');
            return;
        }
        const isCurrentlySaved = await isRecommendationSaved(authUser.uid, recId);
        try {
            if (isCurrentlySaved) {
                await unsaveRecommendation(authUser.uid, recId);
            } else {
                await saveRecommendation(authUser.uid, recId);
            }
        } catch (error) {
            console.error("Kaydetme işlemi sırasında hata:", error);
        }
    }, [authUser?.uid, router]);

    const handleDeleteRecommendation = useCallback(async (postId) => {
        if (!authUser?.uid) return;

        const recommendationToDelete = recommendations.find(rec => rec.id === postId);
        if (!recommendationToDelete || recommendationToDelete.userId !== authUser.uid) {
            alert("Bu tavsiyeyi silme yetkiniz yok.");
            return;
        }

        if (window.confirm("Bu tavsiyeyi silmek istediğinizden emin misiniz?")) {
            try {
                const postRef = doc(db, "recommendations", postId);
                await deleteDoc(postRef);
                setRecommendations(prev => prev.filter(rec => rec.id !== postId));
            } catch (error) {
                console.error("Tavsiye silinirken hata:", error);
                alert("Tavsiye silinirken bir hata oluştu.");
            }
        }
    }, [authUser?.uid, recommendations]);

    // Takip et/takipten çık
    const handleFollowToggle = async (userId) => {
        if (!authUser?.uid || userId === authUser.uid) return;
        
        const { writeBatch, serverTimestamp } = await import('firebase/firestore');
        const batch = writeBatch(db);
        const followingRef = doc(db, 'users', authUser.uid, 'following', userId);
        const followerRef = doc(db, 'users', userId, 'followers', authUser.uid);
        
        const isFollowing = myFollowingIds.has(userId);
        
        try {
            if (isFollowing) {
                batch.delete(followingRef);
                batch.delete(followerRef);
                setMyFollowingIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(userId);
                    return newSet;
                });
            } else {
                batch.set(followingRef, { createdAt: serverTimestamp() });
                batch.set(followerRef, { createdAt: serverTimestamp() });
                setMyFollowingIds(prev => new Set([...prev, userId]));
            }
            await batch.commit();
        } catch (err) {
            console.error("Takip etme hatası:", err);
        }
    };

    // Bildirim okundu işaretle
    const handleMarkAsRead = async (notificationId) => {
        if (!authUser?.uid) return;
        try {
            await markNotificationAsRead(authUser.uid, notificationId);
            setNotifications(prev => prev.map(n => 
                n.id === notificationId ? { ...n, isRead: true } : n
            ));
        } catch (err) {
            console.warn('Bildirim okundu olarak işaretlenemedi:', err);
        }
    };

    // Tüm bildirimleri okundu işaretle
    const markAllAsRead = async () => {
        if (!authUser?.uid || notifications.length === 0) return;
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        try {
            await markAllNotificationsAsRead(authUser.uid);
        } catch (err) {
            console.warn('Tüm bildirimler okundu olarak işaretlenemedi:', err);
        }
    };

    // Çıkış yap
    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/giris');
        } catch (error) {
            console.error("Çıkış yaparken hata oluştu:", error);
            alert("Çıkış yapılırken bir hata oluştu.");
        }
    };

    // Takipçi/Takip listesini sidebar'da göster
    const showUsersList = async (type) => {
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
    };

    // Kaydedilenler listesini çek
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

    // Kaydedilenler view'ını aç
    const showSavedList = () => {
        setSidebarView('saved');
        if (savedRecommendations.length === 0) {
            fetchSavedRecommendations();
        }
    };

    // Tavsiye detay modalını aç
    const openDetailModal = (recId) => {
        setSelectedRecId(recId);
        setShowDetailModal(true);
    };

    // Tavsiye detay modalını kapat
    const closeDetailModal = () => {
        setShowDetailModal(false);
        setSelectedRecId(null);
    };

    if (authLoading || (isLoading && !userProfile && authUser)) {
        return (
            <div className="w-full min-h-screen bg-dark flex items-center justify-center">
                <div className="loader"></div>
            </div>
        );
    }

    const profileAvatar = userProfile ? getAvatarUrlWithFallback(userProfile.photoURL, userProfile.name, userProfile.username) : 'https://ui-avatars.com/api/?name=?&background=random';

    return (
        <div className="w-full min-h-screen bg-dark antialiased">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-dark/95 backdrop-blur-xl shadow-lg shadow-black/20 border-b border-border">
                <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                        {/* Arama ve Bildirim Butonları - Sol Taraf */}
                        {authUser && (
                            <>
                                <button
                                    onClick={() => {
                                        if (activeTab === 'explore') {
                                            setActiveTab('following');
                                        } else {
                                            setActiveTab('explore');
                                        }
                                    }}
                                    className={`relative p-2.5 sm:p-3 rounded-xl transition-all duration-300 flex-shrink-0 ${
                                        activeTab === 'explore' 
                                            ? 'text-light bg-primary shadow-lg shadow-primary/30' 
                                            : 'text-muted hover:bg-card hover:text-primary'
                                    }`}
                                    title="Keşfet"
                                    aria-label="Keşfet"
                                >
                                    <i className="fas fa-search text-base sm:text-lg"></i>
                                </button>
                                <button
                                    onClick={() => {
                                        if (activeTab === 'notifications') {
                                            setActiveTab('following');
                                        } else {
                                            setActiveTab('notifications');
                                        }
                                    }}
                                    className={`relative p-2.5 sm:p-3 rounded-xl transition-all duration-300 flex-shrink-0 ${
                                        activeTab === 'notifications' 
                                            ? 'text-light bg-primary shadow-lg shadow-primary/30' 
                                            : 'text-muted hover:bg-card hover:text-primary'
                                    }`}
                                    title="Bildirimler"
                                    aria-label="Bildirimler"
                                >
                                    <i className="fas fa-bell text-base sm:text-lg"></i>
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[18px] h-4 sm:h-5 px-1 sm:px-1.5 rounded-full bg-error text-white text-[10px] sm:text-xs flex items-center justify-center font-bold shadow-lg ring-2 ring-dark animate-pulse">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>
                            </>
                        )}
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2 group min-w-0 flex-shrink">
                            <span className="text-lg sm:text-xl lg:text-2xl font-extrabold text-light group-hover:text-primary transition-colors truncate">
                                Tavsiyece
                            </span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        {authUser ? (
                            <>
                                <Link
                                    href="/profil"
                                    className="p-2.5 sm:p-3 rounded-xl text-muted hover:bg-card hover:text-primary transition-all duration-300"
                                    title="Profil"
                                    aria-label="Profil"
                                >
                                    <i className="fas fa-user text-base sm:text-lg"></i>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-error/20 text-error hover:bg-error/30 transition-all duration-300 font-semibold text-xs sm:text-sm border border-error/30 whitespace-nowrap"
                                    title="Çıkış Yap"
                                    aria-label="Çıkış Yap"
                                >
                                    <span className="hidden sm:inline">Çıkış</span>
                                    <i className="fas fa-sign-out-alt sm:hidden"></i>
                                </button>
                            </>
                        ) : (
                            <Link
                                href="/giris"
                                className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-primary text-light hover:bg-primary-dark transition-all duration-300 font-semibold text-xs sm:text-sm whitespace-nowrap"
                            >
                                <span className="hidden sm:inline">Giriş Yap</span>
                                <span className="sm:hidden">Giriş</span>
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
                {/* Sol Sidebar - Profil (sadece giriş yapmış kullanıcılar için) */}
                {authUser && (
                    <aside className="w-full lg:w-80 flex-shrink-0">
                        <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl lg:sticky lg:top-24">
                            {sidebarView === 'profile' ? (
                                <>
                                    {/* Profil Fotoğrafı ve Bilgiler */}
                                    <div className="text-center mb-4 sm:mb-6 relative">
                                        <div className="relative inline-block">
                                            <Link href="/profil" className="relative block">
                                                <Image
                                                    src={profileAvatar}
                                                    alt={userProfile?.name || 'Kullanıcı'}
                                                    width={110}
                                                    height={110}
                                                    className="rounded-full object-cover mx-auto mb-3 sm:mb-4 border-4 border-dark shadow-xl w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28"
                                                    unoptimized
                                                />
                                            </Link>
                                            <Link
                                                href="/ayarlar/profili-duzenle"
                                                className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-primary text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:bg-primary-dark transition-all duration-300 shadow-md border-2 border-dark"
                                                title="Profili Düzenle"
                                                aria-label="Profili Düzenle"
                                            >
                                                <i className="fas fa-pencil-alt text-[10px] sm:text-xs"></i>
                                            </Link>
                                        </div>
                                        <Link href="/profil" className="block">
                                            <h2 className="text-lg sm:text-xl font-extrabold text-light hover:text-primary transition-colors truncate px-2">
                                                {userProfile?.name || 'İsimsiz'}
                                            </h2>
                                        </Link>
                                        {userProfile?.username && (
                                            <p className="text-xs sm:text-sm text-muted mt-1 truncate">@{userProfile.username}</p>
                                        )}
                                        {userProfile?.bio && (
                                            <p className="text-xs sm:text-sm text-muted mt-2 sm:mt-3 leading-relaxed px-2 line-clamp-2 bio-text">{userProfile.bio}</p>
                                        )}
                                    </div>

                                    {/* İstatistikler */}
                                    <div className="bg-dark rounded-xl sm:rounded-2xl p-3 sm:p-5 mb-4 sm:mb-6 border border-border">
                                        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                                            <div>
                                                <p className="text-2xl sm:text-3xl font-extrabold text-primary">
                                                    {recommendationsCount}
                                                </p>
                                                <p className="text-[10px] sm:text-xs text-muted font-semibold mt-1">Tavsiye</p>
                                            </div>
                                            <button
                                                onClick={() => showUsersList('followers')}
                                                className="cursor-pointer"
                                            >
                                                <p className="text-2xl sm:text-3xl font-extrabold text-primary">
                                                    {followersCount}
                                                </p>
                                                <p className="text-[10px] sm:text-xs text-muted font-semibold mt-1">Takipçi</p>
                                            </button>
                                            <button
                                                onClick={() => showUsersList('following')}
                                                className="cursor-pointer"
                                            >
                                                <p className="text-2xl sm:text-3xl font-extrabold text-primary">
                                                    {followingCount}
                                                </p>
                                                <p className="text-[10px] sm:text-xs text-muted font-semibold mt-1">Takip</p>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Kaydedilenler */}
                                    <div className="mb-6">
                                        <button
                                            onClick={showSavedList}
                                            className="w-full px-4 py-3 rounded-xl bg-dark border border-border hover:bg-primary/20 hover:border-primary/50 transition-all duration-300 text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <i className="fas fa-bookmark text-primary"></i>
                                                <span className="font-semibold text-light">Kaydedilenler</span>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Kategoriler */}
                                    <div>
                                        <h4 className="font-bold mb-4 text-light flex items-center gap-2">
                                            <i className="fas fa-tags text-primary"></i>
                                            <span>Kategoriler</span>
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {categories.length > 0 ? (
                                                categories.map((category) => (
                                                    <span
                                                        key={category.id}
                                                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-dark text-primary border border-border hover:bg-primary/20 hover:border-primary/50 transition-all duration-300 cursor-default"
                                                    >
                                                        {category.name}
                                                    </span>
                                                ))
                                            ) : (
                                                <p className="text-xs text-muted italic">Henüz kategori eklenmemiş</p>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : sidebarView === 'saved' ? (
                                <>
                                    {/* Kaydedilenler Header */}
                                    <div className="mb-5 flex items-center gap-3 pb-4 border-b border-border">
                                        <button
                                            onClick={() => setSidebarView('profile')}
                                            className="w-10 h-10 rounded-xl bg-card hover:bg-primary/20 border border-border flex items-center justify-center transition-all duration-300"
                                            title="Geri Dön"
                                        >
                                            <i className="fas fa-arrow-left text-light"></i>
                                        </button>
                                        <h3 className="text-xl font-extrabold text-light flex-1">
                                            Kaydedilenler
                                        </h3>
                                    </div>

                                    {/* Kaydedilenler Listesi */}
                                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-2 -mr-2">
                                        {isLoadingSaved ? (
                                            <div className="flex justify-center py-12">
                                                <div className="spinner-sm"></div>
                                            </div>
                                        ) : savedRecommendations.length === 0 ? (
                                            <div className="text-center py-12">
                                                <div className="w-20 h-20 bg-card rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                    <i className="fas fa-bookmark text-3xl text-primary"></i>
                                                </div>
                                                <p className="text-muted text-sm font-medium">
                                                    Henüz kaydedilen tavsiyen yok.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {savedRecommendations.map((rec) => (
                                                    <div
                                                        key={rec.id}
                                                        onClick={() => openDetailModal(rec.id)}
                                                        className="p-3 rounded-xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all duration-300"
                                                    >
                                                        <h4 className="font-bold text-light text-sm mb-1 truncate">{rec.title || 'Başlıksız'}</h4>
                                                        <p className="text-xs text-muted truncate">{rec.text?.substring(0, 50)}...</p>
                                                        {rec.category && (
                                                            <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs bg-primary/20 text-primary">
                                                                {rec.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Kullanıcı Listesi Header */}
                                    <div className="mb-5 flex items-center gap-3 pb-4 border-b border-border">
                                        <button
                                            onClick={() => setSidebarView('profile')}
                                            className="w-10 h-10 rounded-xl bg-card hover:bg-primary/20 border border-border flex items-center justify-center transition-all duration-300"
                                            title="Geri Dön"
                                        >
                                            <i className="fas fa-arrow-left text-light"></i>
                                        </button>
                                        <h3 className="text-xl font-extrabold text-light flex-1">
                                            {sidebarView === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}
                                        </h3>
                                    </div>

                                    {/* Kullanıcı Listesi */}
                                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-2 -mr-2">
                                        {isLoadingSidebar ? (
                                            <div className="flex justify-center py-12">
                                                <div className="spinner-sm"></div>
                                            </div>
                                        ) : sidebarUsers.length === 0 ? (
                                            <div className="text-center py-12">
                                                <div className="w-20 h-20 bg-dark rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                    <i className="fas fa-users text-3xl text-primary"></i>
                                                </div>
                                                <p className="text-muted text-sm font-medium">
                                                    {sidebarView === 'followers' 
                                                        ? 'Henüz hiç takipçin yok.' 
                                                        : 'Henüz kimseyi takip etmiyorsun.'}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {sidebarUsers.map((user) => (
                                                    <Link
                                                        key={user.id}
                                                        href={`/profil/${user.id}`}
                                                        className="flex items-center gap-3 p-3 rounded-xl bg-dark border border-border hover:bg-primary/20 hover:border-primary/50 transition-all duration-300"
                                                    >
                                                        <Image
                                                            src={getAvatarUrlWithFallback(user.avatar, user.name, user.username)}
                                                            alt={user.name}
                                                            width={44}
                                                            height={44}
                                                            className="rounded-full object-cover flex-shrink-0"
                                                            unoptimized
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-light text-sm truncate">
                                                                {user.name}
                                                            </p>
                                                            <p className="text-xs text-muted truncate">
                                                                @{user.username}
                                                            </p>
                                                        </div>
                                                        <i className="fas fa-chevron-right text-muted text-xs flex-shrink-0"></i>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </aside>
                )}

                {/* Kategoriler (giriş yapmamış kullanıcılar için) */}
                {!authUser && (
                    <aside className="w-full lg:w-80 flex-shrink-0">
                        <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl lg:sticky lg:top-24">
                            <div>
                                <h4 className="font-bold mb-4 text-light flex items-center gap-2">
                                    <i className="fas fa-tags text-primary"></i>
                                    <span>Kategoriler</span>
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {categories.length > 0 ? (
                                        categories.map((category) => (
                                            <span
                                                key={category.id}
                                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-dark text-primary border border-border hover:bg-primary/20 hover:border-primary/50 transition-all duration-300 cursor-default"
                                            >
                                                {category.name}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-xs text-muted italic">Henüz kategori eklenmemiş</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </aside>
                )}

                {/* Ana İçerik */}
                <main className="flex-1">
                    {/* Tab Butonları - Sadece Tavsiye sekmeleri için */}
                    {(activeTab === 'following' || activeTab === 'popular') && (
                        <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-1.5 sm:p-2 mb-4 sm:mb-6 shadow-xl">
                            <div className="flex gap-1.5 sm:gap-2">
                                {authUser ? (
                                    <>
                                        <button
                                            onClick={() => setActiveTab('following')}
                                            className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 ${
                                                activeTab === 'following'
                                                    ? 'bg-primary text-light shadow-lg shadow-primary/30'
                                                    : 'bg-dark text-muted hover:bg-primary/20 hover:text-primary border border-border'
                                            }`}
                                        >
                                            <i className="fas fa-home mr-1 sm:mr-2"></i>
                                            <span className="hidden sm:inline">Ana Akış</span>
                                            <span className="sm:hidden">Ana</span>
                                            <span className="hidden md:inline"> ({categories.length || 6})</span>
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('popular')}
                                            className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 ${
                                                activeTab === 'popular'
                                                    ? 'bg-primary text-light shadow-lg shadow-primary/30'
                                                    : 'bg-dark text-muted hover:bg-primary/20 hover:text-primary border border-border'
                                            }`}
                                        >
                                            <i className="fas fa-fire mr-1 sm:mr-2"></i>
                                            <span className="hidden sm:inline">Popüler</span>
                                            <span className="sm:hidden">Pop</span>
                                            <span className="hidden md:inline"> ({categories.length || 6})</span>
                                        </button>
                                        <button
                                            onClick={() => router.push('/yeni-tavsiye')}
                                            className="flex-1 sm:flex-none py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm bg-dark text-muted hover:bg-primary/20 hover:text-primary border border-border transition-all duration-300"
                                        >
                                            <i className="fas fa-plus sm:mr-2"></i>
                                            <span className="hidden sm:inline">Yeni Tavsiye</span>
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setActiveTab('popular')}
                                        className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 ${
                                            activeTab === 'popular'
                                                ? 'bg-primary text-light shadow-lg shadow-primary/30'
                                                : 'bg-dark text-muted hover:bg-primary/20 hover:text-primary border border-border'
                                        }`}
                                    >
                                        <i className="fas fa-fire mr-1 sm:mr-2"></i>
                                        <span className="hidden sm:inline">Popüler Tavsiyeler</span>
                                        <span className="sm:hidden">Popüler</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* İçerik Alanı */}
                    {error && (
                        <div className="bg-error/20 border border-error/30 rounded-2xl p-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-error/30 flex items-center justify-center flex-shrink-0">
                                    <i className="fas fa-exclamation-circle text-error"></i>
                                </div>
                                <p className="text-error text-sm font-medium">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Keşfet İçeriği */}
                    {activeTab === 'explore' && !authUser && (
                        <div className="bg-card border border-border rounded-2xl p-12 shadow-xl text-center">
                            <div className="w-28 h-28 bg-dark rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <i className="fas fa-lock text-5xl text-primary"></i>
                            </div>
                            <h2 className="text-2xl font-extrabold text-light mb-3">Giriş Yapmanız Gerekiyor</h2>
                            <p className="text-sm text-muted mb-8 max-w-md mx-auto">Keşfet özelliğini kullanmak ve daha fazlasına erişmek için lütfen giriş yapın.</p>
                            <Link
                                href="/giris"
                                className="inline-block px-8 py-3.5 rounded-xl bg-primary text-light hover:bg-primary-dark transition-all duration-300 font-bold text-sm"
                            >
                                <i className="fas fa-sign-in-alt mr-2"></i>
                                Giriş Yap
                            </Link>
                        </div>
                    )}
                    {activeTab === 'explore' && authUser && (
                        <div className="space-y-6">
                            {/* Arama Çubuğu */}
                            <div className="bg-card border border-border rounded-2xl p-1 shadow-xl">
                                <div className="relative">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 z-10">
                                        <i className="fas fa-search text-primary text-lg"></i>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Tavsiye, kullanıcı, kategori ara..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            if (e.target.value.trim()) {
                                                performSearch(e.target.value);
                                            } else {
                                                setIsSearching(false);
                                                setUserResults([]);
                                                setRecommendationResults([]);
                                            }
                                        }}
                                        className="w-full pl-14 pr-5 py-4 bg-dark border-2 border-transparent rounded-xl text-light placeholder-muted focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/20 transition-all duration-300 font-medium"
                                    />
                                </div>
                            </div>

                            {/* Arama Sonuçları */}
                            {isSearching && (
                                <div className="space-y-8">
                                    <div>
                                        <h3 className="text-2xl font-extrabold text-light mb-5 flex items-center gap-2">
                                            <i className="fas fa-users text-primary"></i>
                                            <span>Kullanıcılar</span>
                                            {userResults.length > 0 && (
                                                <span className="text-sm font-normal text-muted">({userResults.length})</span>
                                            )}
                                        </h3>
                                        {userResults.length > 0 ? (
                                            <div className="space-y-3">
                                                {userResults.map(user => (
                                                    <div key={user.id} className="bg-card border border-border rounded-2xl p-4 shadow-xl flex items-center gap-4">
                                                        <Link href={`/profil/${user.id}`}>
                                                            <Image
                                                                src={getAvatarUrlWithFallback(user.avatar, user.name, user.username)}
                                                                alt={user.name}
                                                                width={60}
                                                                height={60}
                                                                className="rounded-full object-cover"
                                                                unoptimized
                                                            />
                                                        </Link>
                                                        <div className="flex-1">
                                                            <Link href={`/profil/${user.id}`}>
                                                                <p className="font-bold text-light hover:text-primary transition-colors">{user.name}</p>
                                                                <p className="text-sm text-muted">@{user.username}</p>
                                                            </Link>
                                                        </div>
                                                        <button
                                                            onClick={() => handleFollowToggle(user.id)}
                                                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                                                                myFollowingIds.has(user.id)
                                                                    ? 'bg-dark text-primary border border-border'
                                                                    : 'bg-primary text-light hover:bg-primary-dark'
                                                            }`}
                                                        >
                                                            {myFollowingIds.has(user.id) ? 'Takip Ediliyor' : 'Takip Et'}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="bg-card border border-border rounded-2xl p-8 text-center">
                                                <i className="fas fa-user-slash text-4xl text-muted mb-3"></i>
                                                <p className="text-muted font-medium">Eşleşen kullanıcı bulunamadı.</p>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="text-2xl font-extrabold text-light mb-5 flex items-center gap-2">
                                            <i className="fas fa-lightbulb text-primary"></i>
                                            <span>Tavsiyeler</span>
                                            {recommendationResults.length > 0 && (
                                                <span className="text-sm font-normal text-muted">({recommendationResults.length})</span>
                                            )}
                                        </h3>
                                        {recommendationResults.length > 0 ? (
                                            <div className="space-y-3">
                                                {recommendationResults.map(rec => (
                                                    <button
                                                        key={rec.id}
                                                        onClick={() => openDetailModal(rec.id)}
                                                        className="w-full bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-primary/50 transition-all duration-300 cursor-pointer"
                                                    >
                                                        {rec.image && (
                                                            <Image
                                                                src={rec.image}
                                                                alt={rec.title}
                                                                width={60}
                                                                height={60}
                                                                className="rounded-xl object-cover"
                                                                unoptimized
                                                            />
                                                        )}
                                                        <div className="flex-1 text-left">
                                                            <p className="font-bold text-light truncate">{rec.title}</p>
                                                            <p className="text-sm text-muted flex items-center gap-2 mt-1">
                                                                <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-xs font-semibold">{rec.category}</span>
                                                            </p>
                                                        </div>
                                                        <i className="fas fa-chevron-right text-muted flex-shrink-0"></i>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="bg-card border border-border rounded-2xl p-8 text-center">
                                                <i className="fas fa-inbox text-4xl text-muted mb-3"></i>
                                                <p className="text-muted font-medium">Eşleşen tavsiye bulunamadı.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Keşfet İçeriği (Arama yapılmadığında) */}
                            {!isSearching && (
                                <>
                                    {/* Kategoriler */}
                                    <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                                        <h3 className="text-2xl font-extrabold text-light mb-5 flex items-center gap-2">
                                            <i className="fas fa-tags text-primary"></i>
                                            <span>Kategoriler</span>
                                        </h3>
                                        <div className="flex flex-wrap gap-3">
                                            {categories.length > 0 ? (
                                                categories.map((category) => (
                                                    <button
                                                        key={category.id}
                                                        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-dark text-primary border border-border hover:bg-primary hover:text-light transition-all duration-300"
                                                    >
                                                        {category.name}
                                                    </button>
                                                ))
                                            ) : (
                                                <p className="text-sm text-muted italic">Henüz kategori eklenmemiş</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Trend Öğeler */}
                                    {trendingItems.length > 0 && (
                                        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                                            <h3 className="text-2xl font-extrabold text-light mb-5 flex items-center gap-2">
                                                <i className="fas fa-fire text-primary"></i>
                                                <span>Trend Tavsiyeler</span>
                                            </h3>
                                            <div className="overflow-x-auto pb-2 -mb-2">
                                                <div className="flex gap-4 pb-4">
                                                    {trendingItems.map((item) => (
                                                        <div key={item.id} onClick={() => openDetailModal(item.id)} className="bg-dark border border-border rounded-2xl p-5 min-w-[300px] shadow-xl cursor-pointer">
                                                            {item.image && (
                                                                <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-4">
                                                                    <Image
                                                                        src={item.image}
                                                                        alt={item.title}
                                                                        fill
                                                                        className="object-cover"
                                                                        unoptimized
                                                                    />
                                                                </div>
                                                            )}
                                                            <h3 className="text-lg font-extrabold text-light mb-2">{item.title}</h3>
                                                            <p className="text-sm text-muted leading-relaxed">{item.description}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Kullanıcılar */}
                                    <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                                        <div className="flex gap-2 mb-5 p-1 bg-dark rounded-xl">
                                            <button
                                                onClick={() => setActiveUserTab('new')}
                                                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                                                    activeUserTab === 'new'
                                                        ? 'bg-primary text-light'
                                                        : 'text-muted hover:text-primary'
                                                }`}
                                            >
                                                <i className="fas fa-user-plus mr-2"></i>
                                                Yeni
                                            </button>
                                            <button
                                                onClick={() => setActiveUserTab('popular')}
                                                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                                                    activeUserTab === 'popular'
                                                        ? 'bg-primary text-light'
                                                        : 'text-muted hover:text-primary'
                                                }`}
                                            >
                                                <i className="fas fa-star mr-2"></i>
                                                Popüler
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            {isLoading ? (
                                                <div className="flex justify-center py-12">
                                                    <div className="spinner-sm"></div>
                                                </div>
                                            ) : (
                                                (activeUserTab === 'new' ? featuredUsers : popularUsers).map((user) => (
                                                    <div key={user.id} className="bg-dark border border-border rounded-xl p-4 flex items-center gap-4">
                                                        <Link href={`/profil/${user.id}`}>
                                                            <Image
                                                                src={getAvatarUrlWithFallback(user.avatar, user.name, user.username)}
                                                                alt={user.name}
                                                                width={56}
                                                                height={56}
                                                                className="rounded-full object-cover"
                                                                unoptimized
                                                            />
                                                        </Link>
                                                        <div className="flex-1">
                                                            <Link href={`/profil/${user.id}`}>
                                                                <p className="font-bold text-light hover:text-primary transition-colors">{user.name}</p>
                                                                <p className="text-sm text-muted truncate">{user.bio || `@${user.username}`}</p>
                                                            </Link>
                                                        </div>
                                                        <button
                                                            onClick={() => handleFollowToggle(user.id)}
                                                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                                                                myFollowingIds.has(user.id)
                                                                    ? 'bg-dark text-primary border border-border'
                                                                    : 'bg-primary text-light hover:bg-primary-dark'
                                                            }`}
                                                        >
                                                            {myFollowingIds.has(user.id) ? 'Takip Ediliyor' : 'Takip Et'}
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Bildirimler İçeriği */}
                    {activeTab === 'notifications' && !authUser && (
                        <div className="bg-card border border-border rounded-2xl p-12 shadow-xl text-center">
                            <div className="w-28 h-28 bg-dark rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <i className="fas fa-lock text-5xl text-primary"></i>
                            </div>
                            <h2 className="text-2xl font-extrabold text-light mb-3">Giriş Yapmanız Gerekiyor</h2>
                            <p className="text-sm text-muted mb-8 max-w-md mx-auto">Bildirimleri görmek ve daha fazlasına erişmek için lütfen giriş yapın.</p>
                            <Link
                                href="/giris"
                                className="inline-block px-8 py-3.5 rounded-xl bg-primary text-light hover:bg-primary-dark transition-all duration-300 font-bold text-sm"
                            >
                                <i className="fas fa-sign-in-alt mr-2"></i>
                                Giriş Yap
                            </Link>
                        </div>
                    )}
                    {activeTab === 'notifications' && authUser && (
                        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-border bg-dark flex justify-between items-center">
                                <h3 className="text-2xl font-extrabold text-light flex items-center gap-2">
                                    <i className="fas fa-bell text-primary"></i>
                                    <span>Bildirimler</span>
                                </h3>
                                {notifications.some(n => !n.isRead) && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="px-4 py-2 rounded-xl text-sm font-bold bg-card text-primary hover:bg-primary/20 hover:border-primary/50 transition-all duration-300 border border-border"
                                    >
                                        <i className="fas fa-check-double mr-2"></i>
                                        Tümünü Okundu İşaretle
                                    </button>
                                )}
                            </div>

                            {isLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="spinner-sm"></div>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 px-4">
                                    <div className="w-28 h-28 bg-dark rounded-3xl flex items-center justify-center mb-6">
                                        <i className="fas fa-bell-slash text-5xl text-primary"></i>
                                    </div>
                                    <h2 className="text-2xl font-extrabold text-light mb-3">Henüz bir bildirimin yok.</h2>
                                    <p className="text-sm text-muted text-center max-w-md leading-relaxed">
                                        Yeni tavsiyeler keşfetmeye ve insanlarla etkileşime geçmeye ne dersin?
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {notifications.map(notif => {
                                        const handleNotifClick = async () => {
                                            await handleMarkAsRead(notif.id);
                                            if (notif.linkPath === '/tavsiye/[id]') {
                                                router.push(`/tavsiye/${notif.linkParams.id}`);
                                            }
                                        };

                                        return (
                                            <button
                                                key={notif.id}
                                                onClick={handleNotifClick}
                                                className={`w-full flex items-start gap-4 p-5 hover:bg-dark transition-all duration-300 group ${
                                                    !notif.isRead ? 'bg-dark border-l-4 border-primary' : ''
                                                }`}
                                            >
                                                <div className="relative flex-shrink-0">
                                                    <Image
                                                        src={notif.sender.avatar}
                                                        alt={notif.sender.name}
                                                        width={52}
                                                        height={52}
                                                        className="relative rounded-full object-cover ring-2 ring-dark group-hover:ring-primary/50 transition-all duration-300"
                                                        unoptimized
                                                    />
                                                    {!notif.isRead && (
                                                        <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-primary ring-2 ring-dark shadow-lg animate-pulse"></span>
                                                    )}
                                                </div>
                                                <div className="flex-1 text-left min-w-0">
                                                    <p className="text-light text-sm leading-relaxed">
                                                        <span className="font-extrabold text-primary">{notif.sender.name}</span>
                                                        {` ${notif.message}`}
                                                        {notif.commentText && (
                                                            <span className="text-muted italic block mt-1 pl-4 border-l-2 border-primary/50">{`"${notif.commentText}"`}</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-muted mt-2 flex items-center gap-2">
                                                        <i className="fas fa-clock text-[10px]"></i>
                                                        {formatRelativeTime(notif.createdAt)}
                                                    </p>
                                                </div>
                                                {notif.imageUrl && (
                                                    <div className="relative flex-shrink-0">
                                                        <Image
                                                            src={notif.imageUrl}
                                                            alt="İlgili gönderi"
                                                            width={56}
                                                            height={56}
                                                            className="relative rounded-xl object-cover ring-2 ring-dark group-hover:ring-primary/50 transition-all duration-300"
                                                            unoptimized
                                                        />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tavsiyeler İçeriği */}
                    {(activeTab === 'following' || activeTab === 'popular') && (
                        <>
                            {isLoading ? (
                                <div className="space-y-8">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="bg-card border border-border rounded-2xl p-6 shadow-xl animate-pulse">
                                            <div className="flex items-center space-x-4 mb-4">
                                                <div className="w-14 h-14 rounded-full bg-white/10"></div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-4 bg-white/10 rounded-lg w-2/4"></div>
                                                    <div className="h-3 bg-white/10 rounded-lg w-1/4"></div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="h-6 bg-white/10 rounded-lg w-3/4"></div>
                                                <div className="h-4 bg-white/10 rounded-lg w-full"></div>
                                                <div className="h-4 bg-white/10 rounded-lg w-5/6"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : recommendations.length === 0 ? (
                                <div className="text-center py-16 bg-card border border-border rounded-2xl shadow-xl">
                                    <div className="w-28 h-28 bg-dark rounded-3xl flex items-center justify-center mx-auto mb-6">
                                        <i className={`fas ${activeTab === 'following' ? 'fa-user-friends' : 'fa-fire'} text-5xl text-primary`}></i>
                                    </div>
                                    <h2 className="text-2xl font-extrabold text-light mb-3">
                                        {activeTab === 'following' 
                                            ? 'Henüz tavsiye yok'
                                            : 'Popüler tavsiye bulunamadı'}
                                    </h2>
                                    <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
                                        {activeTab === 'following' 
                                            ? 'Takip ettiğin kullanıcılar henüz tavsiye paylaşmamış. Yeni insanları keşfetmeye ne dersin?'
                                            : 'Popüler tavsiyeler henüz yüklenemedi. Biraz sonra tekrar kontrol edebilirsin.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {recommendations.map(rec => (
                                        <div key={rec.id} onClick={() => openDetailModal(rec.id)} className="cursor-pointer">
                                            <RecommendationCard
                                                rec={rec}
                                                currentUserData={{ uid: authUser?.uid }}
                                                onLike={() => handleLike(rec.id)}
                                                onSave={() => handleSave(rec.id)}
                                                onDelete={handleDeleteRecommendation}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>

            {showDetailModal && selectedRecId && authUser && (
                <RecommendationDetailModal
                    recId={selectedRecId}
                    userId={authUser.uid}
                    onClose={closeDetailModal}
                />
            )}
        </div>
    );
}
