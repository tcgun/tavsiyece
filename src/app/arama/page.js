'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeText } from '../../utils/textUtils';
import { getAvatarUrlWithFallback } from '../../utils/avatarUtils';

// CategoryChip bileşeni
const CategoryChip = ({ category, isActive, onPress }) => {
    return (
        <button
            onClick={onPress}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                isActive 
                    ? 'bg-[#BA68C8] text-white' 
                    : 'bg-[#2a1f3d] text-[#9ca3af] hover:bg-[#3a2f4d]'
            }`}
        >
            {category.name}
        </button>
    );
};

// TrendingCard bileşeni
const TrendingCard = ({ item }) => {
    return (
        <div className="bg-[#2a1f3d] rounded-xl p-4 min-w-[288px] border border-[rgba(255,255,255,0.1)]">
            {item.image && (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-4">
                    <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                </div>
            )}
            <h3 className="text-lg font-bold text-[#f8fafc] mb-1">{item.title}</h3>
            <p className="text-sm text-[#9ca3af]">{item.description}</p>
        </div>
    );
};

// UserCard bileşeni
const UserCard = ({ user, currentUserId }) => {
    const router = useRouter();
    const [isFollowing, setIsFollowing] = useState(user.isFollowing);
    const [isLoading, setIsLoading] = useState(false);

    const handleFollowToggle = async (e) => {
        e.stopPropagation();
        if (!currentUserId || currentUserId === user.id) return;
        
        setIsLoading(true);
        const followingRef = doc(db, 'users', currentUserId, 'following', user.id);
        const followerRef = doc(db, 'users', user.id, 'followers', currentUserId);
        
        try {
            const batch = writeBatch(db);
            if (isFollowing) {
                batch.delete(followingRef);
                batch.delete(followerRef);
            } else {
                batch.set(followingRef, { createdAt: serverTimestamp() });
                batch.set(followerRef, { createdAt: serverTimestamp() });
            }
            await batch.commit();
            setIsFollowing(!isFollowing);
        } catch (err) {
            console.error("Takip etme hatası:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUserPress = () => {
        router.push(`/profil/${user.id}`);
    };

    if (user.id === currentUserId) return null;

    return (
        <div className="bg-[#2a1f3d] rounded-xl p-4 flex items-center gap-4 border border-[rgba(255,255,255,0.1)]">
            <button onClick={handleUserPress} className="flex items-center gap-4 flex-1">
                <Image
                    src={user.avatar}
                    alt={user.name}
                    width={56}
                    height={56}
                    className="rounded-full object-cover"
                    unoptimized
                />
                <div className="flex-1 text-left">
                    <p className="font-bold text-[#f8fafc]">{user.name}</p>
                    <p className="text-sm text-[#9ca3af] truncate">{user.bio || `@${user.username}`}</p>
                </div>
            </button>
            <button
                onClick={handleFollowToggle}
                disabled={isLoading}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    isFollowing
                        ? 'bg-[#BA68C8]/20 text-[#BA68C8]'
                        : 'bg-[#BA68C8] text-white hover:bg-[#9c4fb8]'
                } disabled:opacity-50`}
            >
                {isLoading ? (
                    <div className="spinner-sm"></div>
                ) : (
                    isFollowing ? 'Takip' : 'Takip Et'
                )}
            </button>
        </div>
    );
};

// RecommendationResultItem bileşeni
const RecommendationResultItem = ({ item }) => {
    const router = useRouter();
    
    return (
        <button
            onClick={() => router.push(`/tavsiye/${item.id}`)}
            className="w-full bg-[#2a1f3d] rounded-xl p-4 flex items-center gap-4 border border-[rgba(255,255,255,0.1)] hover:border-[#BA68C8] transition-colors"
        >
            {item.image && (
                <Image
                    src={item.image}
                    alt={item.title}
                    width={50}
                    height={50}
                    className="rounded-lg object-cover"
                    unoptimized
                />
            )}
            <div className="flex-1 text-left">
                <p className="font-semibold text-[#f8fafc] truncate">{item.title}</p>
                <p className="text-sm text-[#9ca3af]">{item.category}</p>
            </div>
            <i className="fas fa-chevron-right text-[#9ca3af]"></i>
        </button>
    );
};

// UserResultItem bileşeni
const UserResultItem = ({ item }) => {
    const router = useRouter();
    
    return (
        <button
            onClick={() => router.push(`/profil/${item.id}`)}
            className="w-full bg-[#2a1f3d] rounded-xl p-4 flex items-center gap-4 border border-[rgba(255,255,255,0.1)] hover:border-[#BA68C8] transition-colors"
        >
            <Image
                src={item.avatar}
                alt={item.name}
                width={50}
                height={50}
                className="rounded-full object-cover"
                unoptimized
            />
            <div className="flex-1 text-left">
                <p className="font-semibold text-[#f8fafc]">{item.name}</p>
                <p className="text-sm text-[#9ca3af]">@{item.username}</p>
            </div>
            <i className="fas fa-chevron-right text-[#9ca3af]"></i>
        </button>
    );
};

export default function ExplorePage() {
    const { user: authUser } = useAuth();
    const router = useRouter();
    const currentUserId = authUser?.uid;

    // State'ler
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [error, setError] = useState(null);
    const [categories, setCategories] = useState([]);
    const [trendingItems, setTrendingItems] = useState([]);
    const [featuredUsers, setFeaturedUsers] = useState([]);
    const [popularUsers, setPopularUsers] = useState([]);
    const [activeUserTab, setActiveUserTab] = useState('new');
    const [activeCategory, setActiveCategory] = useState('all');
    const [myFollowingIds, setMyFollowingIds] = useState(new Set());
    
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    const [recommendationResults, setRecommendationResults] = useState([]);
    const [userResults, setUserResults] = useState([]);

    // 1. useEffect (Takip listesi, Kategoriler, Trendler)
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                if (currentUserId) {
                    const followingQuery = query(collection(db, 'users', currentUserId, 'following'));
                    const followingSnapshot = await getDocs(followingQuery);
                    const followingIds = followingSnapshot.docs.map(doc => doc.id);
                    setMyFollowingIds(new Set(followingIds));
                } else {
                    setMyFollowingIds(new Set());
                }

                const catQuery = query(collection(db, 'categories'), orderBy('order', 'asc'));
                const catSnapshot = await getDocs(catQuery);
                const fetchedCategories = [{ id: 'all', name: 'Tümü' }];
                catSnapshot.forEach(doc => {
                    fetchedCategories.push({ id: doc.id, ...doc.data() });
                });
                setCategories(fetchedCategories);

                const trendQuery = query(collection(db, 'trending'));
                const trendSnapshot = await getDocs(trendQuery);
                const fetchedTrending = [];
                trendSnapshot.forEach(doc => {
                    fetchedTrending.push({ id: doc.id, ...doc.data() });
                });
                setTrendingItems(fetchedTrending);

            } catch (err) {
                console.error("Explore (ilk veri) çekilirken hata:", err);
                setError("Veriler yüklenemedi: " + err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, [currentUserId]);

    // 2. useEffect (Yeni Kullanıcılar)
    useEffect(() => {
        if (isLoading) {
            setIsLoadingUsers(false);
            return;
        }
        
        const fetchFeaturedUsers = async () => {
            try {
                setIsLoadingUsers(true);
                const userQuery = query(
                    collection(db, 'users'), 
                    orderBy('createdAt', 'desc'), 
                    limit(5)
                );
                const userSnapshot = await getDocs(userQuery);
                const fetchedUsers = [];
                userSnapshot.forEach(doc => {
                    const data = doc.data();
                    const avatar = data.photoURL || getAvatarUrlWithFallback(null, data.name, data.username);
                    
                    fetchedUsers.push({
                        id: doc.id,
                        name: data.name || 'İsimsiz',
                        username: data.username || 'kullaniciadi',
                        bio: data.bio || '',
                        avatar: avatar,
                        isFollowing: myFollowingIds.has(doc.id), 
                    });
                });
                setFeaturedUsers(fetchedUsers);
            } catch (err) {
                console.error("Explore (kullanıcı) çekilirken hata:", err);
                setError(prevError => prevError || "Yeni kullanıcılar yüklenemedi.");
            } finally {
                setIsLoadingUsers(false);
            }
        };
        
        const fetchPopularUsers = async () => {
            try {
                const userQuery = query(
                    collection(db, 'users'), 
                    orderBy('followersCount', 'desc'), 
                    limit(5)
                );
                const userSnapshot = await getDocs(userQuery);
                const fetchedUsers = [];
                userSnapshot.forEach(doc => {
                    const data = doc.data();
                    const avatar = data.photoURL || getAvatarUrlWithFallback(null, data.name, data.username);
                    
                    fetchedUsers.push({
                        id: doc.id,
                        name: data.name || 'İsimsiz',
                        username: data.username || 'kullaniciadi',
                        bio: data.bio || '',
                        avatar: avatar,
                        isFollowing: myFollowingIds.has(doc.id), 
                    });
                });
                setPopularUsers(fetchedUsers);
            } catch (err) {
                console.error("Explore (popüler kullanıcı) çekilirken hata:", err);
                setError(prevError => prevError || "Popüler kullanıcılar yüklenemedi.");
            }
        };
        
        if (activeUserTab === 'new') {
            fetchFeaturedUsers();
        } else {
            fetchPopularUsers();
        }
    }, [myFollowingIds, isLoading, activeUserTab]);

    // Arama Fonksiyonu
    const performSearch = async (term) => {
        if (!term.trim()) {
            setIsSearching(false);
            setUserResults([]);
            setRecommendationResults([]);
            return;
        }
        setIsSearching(true);
        setIsSearchLoading(true);
        const searchTerm = normalizeText(term);
        
        try {
            // Tavsiyelerde Ara (keywords ile)
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

            // Kullanıcılarda Ara
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
                users.push({
                    id: doc.id,
                    name: data.name,
                    username: data.username,
                    avatar: data.photoURL || getAvatarUrlWithFallback(null, data.name, data.username),
                });
            });
            setUserResults(users);
        } catch (err) {
            console.error("Arama hatası:", err);
            if (err.message && err.message.includes("index")) {
                setError("Arama dizini oluşturuluyor. Lütfen Firebase konsolunu kontrol edin.");
            } else {
                setError("Arama sırasında bir hata oluştu.");
            }
        } finally {
            setIsSearchLoading(false);
        }
    };
    
    // Arama Tetikleyicileri
    const handleSearchQueryChange = (text) => {
        setSearchQuery(text);
        if (text.trim() === '') {
            setIsSearching(false);
            setUserResults([]);
            setRecommendationResults([]);
        }
    };
    
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        performSearch(searchQuery);
    };

    // Yüklenme veya Hata durumu
    if (isLoading) {
        return (
            <div className="w-full min-h-screen bg-[#1C1424] flex items-center justify-center">
                <div className="loader"></div>
            </div>
        );
    }

    if (error && categories.length === 0) {
        return (
            <div className="w-full min-h-screen bg-[#1C1424] flex flex-col items-center justify-center p-4">
                <i className="fas fa-exclamation-circle text-4xl text-red-500 mb-4"></i>
                <p className="text-red-500 text-center">{error}</p>
            </div>
        );
    }

    // Arama Sonuçlarını Render Etme
    const renderSearchResults = () => (
        <div className="p-4 space-y-6">
            {isSearchLoading ? (
                <div className="flex justify-center pt-8">
                    <div className="loader"></div>
                </div>
            ) : (
                <>
                    <div>
                        <h3 className="text-xl font-bold text-[#f8fafc] mb-4">Kullanıcılar</h3>
                        {userResults.length > 0 ? (
                            <div className="space-y-3">
                                {userResults.map(user => (
                                    <UserResultItem key={user.id} item={user} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-[#9ca3af]">Eşleşen kullanıcı bulunamadı.</p>
                        )}
                    </div>

                    <div>
                        <h3 className="text-xl font-bold text-[#f8fafc] mb-4">Tavsiyeler</h3>
                        {recommendationResults.length > 0 ? (
                            <div className="space-y-3">
                                {recommendationResults.map(rec => (
                                    <RecommendationResultItem key={rec.id} item={rec} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-[#9ca3af]">Eşleşen tavsiye bulunamadı.</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );

    // Varsayılan Keşfet İçeriğini Render Etme
    const renderDefaultContent = () => (
        <div className="p-4 space-y-6 pb-20">
            {/* Kategoriler */}
            <div className="overflow-x-auto">
                <div className="flex gap-3 pb-2">
                    {categories.map((category) => (
                        <CategoryChip
                            key={category.id}
                            category={category}
                            isActive={category.id === activeCategory}
                            onPress={() => setActiveCategory(category.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Trend Öğeler */}
            {trendingItems.length > 0 && (
                <div>
                    <div className="overflow-x-auto">
                        <div className="flex gap-4 pb-2">
                            {trendingItems.map((item) => (
                                <TrendingCard key={item.id} item={item} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Kullanıcılar */}
            <div>
                <div className="flex gap-4 mb-4">
                    <button
                        onClick={() => setActiveUserTab('new')}
                        className={`px-4 py-2 border-b-2 transition-colors ${
                            activeUserTab === 'new'
                                ? 'border-[#BA68C8] text-[#BA68C8]'
                                : 'border-transparent text-[#9ca3af]'
                        }`}
                    >
                        Yeni
                    </button>
                    <button
                        onClick={() => setActiveUserTab('popular')}
                        className={`px-4 py-2 border-b-2 transition-colors ${
                            activeUserTab === 'popular'
                                ? 'border-[#BA68C8] text-[#BA68C8]'
                                : 'border-transparent text-[#9ca3af]'
                        }`}
                    >
                        Popüler
                    </button>
                </div>
                
                <div className="space-y-3">
                    {isLoadingUsers ? (
                        <div className="flex justify-center py-8">
                            <div className="spinner-sm"></div>
                        </div>
                    ) : (
                        (activeUserTab === 'new' ? featuredUsers : popularUsers).map((user) => (
                            <UserCard 
                                key={user.id} 
                                user={user}
                                currentUserId={currentUserId}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    // Ana Render
    return (
        <div className="w-full min-h-screen bg-[#1C1424]">
            <header className="sticky top-0 z-10 bg-[#1C1424]/90 backdrop-blur-sm shadow-sm border-b border-[rgba(255,255,255,0.1)]">
                <div className="p-4">
                    <form onSubmit={handleSearchSubmit}>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                <i className="fas fa-search text-[#BA68C8]"></i>
                            </div>
                            <input
                                type="text"
                                placeholder="Tavsiye, kullanıcı, kategori ara..."
                                value={searchQuery}
                                onChange={(e) => handleSearchQueryChange(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-[#2a1f3d] border border-[rgba(255,255,255,0.1)] rounded-xl text-[#f8fafc] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#BA68C8]"
                            />
                        </div>
                    </form>
                </div>
            </header>

            {isSearching ? renderSearchResults() : renderDefaultContent()}
        </div>
    );
}
