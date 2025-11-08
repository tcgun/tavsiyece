'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { getFollowers, getFollowing, getUserProfile } from '../services/firebase/userService';
import { createLikeNotification } from '../services/firebase/notificationService';
import { isRecommendationSaved, likeRecommendation, saveRecommendation, unlikeRecommendation, unsaveRecommendation } from '../services/firebase/recommendationService';
import { getAvatarUrlWithFallback } from '../utils';
import RecommendationDetailModal from '../components/RecommendationDetailModal';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';
import { useRecommendations } from '../hooks/useRecommendations';
import { useNotifications } from '../hooks/useNotifications';
import { useExplore } from '../hooks/useExplore';
import { useSidebar } from '../hooks/useSidebar';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import FollowingTab from '../components/tabs/FollowingTab';
import PopularTab from '../components/tabs/PopularTab';
import ExploreTab from '../components/tabs/ExploreTab';
import NotificationsTab from '../components/tabs/NotificationsTab';
import ProfileTab from '../components/tabs/ProfileTab';
import SettingsTab from '../components/tabs/SettingsTab';
import AddRecommendationModal from '../components/AddRecommendationModal';

export default function HomePage() {
    const { user: authUser, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const unreadCount = useUnreadNotifications();

    // Ana state'ler
    const [activeTab, setActiveTab] = useState('following'); // 'following', 'popular', 'explore', 'notifications', 'profile', 'settings'
    
    // Profil state'leri
    const [userProfile, setUserProfile] = useState(null);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [recommendationsCount, setRecommendationsCount] = useState(0);
    const [categories, setCategories] = useState([]);
    
    // Tavsiye detay modal state
    const [selectedRecId, setSelectedRecId] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    
    // Yeni tavsiye modal state
    const [showAddRecommendationModal, setShowAddRecommendationModal] = useState(false);

    // Custom hooks
    const followingRecommendations = useRecommendations(authUser, 'following');
    const popularRecommendations = useRecommendations(authUser, 'popular');
    const notificationsHook = useNotifications(authUser);
    const exploreHook = useExplore(authUser);
    const sidebarHook = useSidebar(authUser);

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
                // Önce tavsiye sayısını senkronize et (önceki tavsiyeleri de saysın)
                // İzin hatası durumunda sessizce devam et
                let syncedCount = null;
                try {
                    const { syncRecommendationsCount } = await import('../services/firebase/userService');
                    syncedCount = await syncRecommendationsCount(authUser.uid);
                } catch (syncError) {
                    // İzin hatası veya başka bir hata - sessizce devam et
                    console.warn("Tavsiye sayısı senkronize edilemedi (devam ediliyor):", syncError);
                }
                
                const profile = await getUserProfile(authUser.uid);
                if (profile) {
                    // Senkronize edilmiş count'u kullan (eğer varsa), yoksa mevcut count'u kullan
                    const finalCount = syncedCount !== null && syncedCount !== undefined 
                        ? syncedCount 
                        : (profile.recommendationsCount !== undefined && profile.recommendationsCount !== null 
                            ? profile.recommendationsCount 
                            : 0);
                    // Takipçi ve takip sayılarını senkronize et
                    let syncedFollowCounts = null;
                    try {
                        const { syncFollowCounts } = await import('../services/firebase/userService');
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
                    
                    // userProfile state'ini güncellenmiş count'larla birlikte set et
                    setUserProfile({
                        ...profile,
                        recommendationsCount: finalCount,
                        followersCount: finalFollowersCount,
                        followingCount: finalFollowingCount
                    });
                    
                    setRecommendationsCount(finalCount);
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

    // URL'den tab ve rec parametresini oku
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const searchParams = new URLSearchParams(window.location.search);
            const tab = searchParams.get('tab');
            const recId = searchParams.get('rec');
            const validTabs = ['following', 'popular', 'explore', 'notifications', 'profile', 'settings'];
            if (tab && validTabs.includes(tab)) {
                setActiveTab(tab);
            }
            // Rec parametresi varsa modal'ı aç
            if (recId && authUser) {
                setSelectedRecId(recId);
                setShowDetailModal(true);
                // URL'den rec parametresini kaldır (modal açıldıktan sonra)
                const url = new URL(window.location);
                url.searchParams.delete('rec');
                window.history.replaceState({}, '', url);
            }
        }
    }, [authUser]);

    // Tab değiştiğinde URL'yi güncelle
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const url = new URL(window.location);
            if (activeTab === 'following') {
                url.searchParams.delete('tab');
            } else {
                url.searchParams.set('tab', activeTab);
            }
            window.history.replaceState({}, '', url);
        }
    }, [activeTab]);

    // Tab değiştiğinde içeriği yükle
    useEffect(() => {
        if (authLoading) return;
        
        if (authUser) {
            if (activeTab === 'following') {
                followingRecommendations.loadRecommendations();
            } else if (activeTab === 'popular') {
                popularRecommendations.loadRecommendations();
            } else if (activeTab === 'explore') {
                exploreHook.fetchExploreData();
            } else if (activeTab === 'notifications') {
                notificationsHook.fetchNotifications();
            } else if (activeTab === 'profile') {
                // Profil tab'ında profil verilerini yenile
                const refreshProfile = async () => {
                    try {
                        // Tavsiye sayısını senkronize et
                        // İzin hatası durumunda sessizce devam et
                        let syncedCount = null;
                        try {
                            const { syncRecommendationsCount } = await import('../services/firebase/userService');
                            syncedCount = await syncRecommendationsCount(authUser.uid);
                        } catch (syncError) {
                            // İzin hatası veya başka bir hata - sessizce devam et
                            console.warn("Tavsiye sayısı senkronize edilemedi (devam ediliyor):", syncError);
                        }
                        
                        const profile = await getUserProfile(authUser.uid);
                        if (profile) {
                            // Senkronize edilmiş count'u kullan (eğer varsa), yoksa mevcut count'u kullan
                            const finalCount = syncedCount !== null && syncedCount !== undefined 
                                ? syncedCount 
                                : (profile.recommendationsCount !== undefined && profile.recommendationsCount !== null 
                                    ? profile.recommendationsCount 
                                    : 0);
                            
                            // Takipçi ve takip sayılarını senkronize et
                            let syncedFollowCounts = null;
                            try {
                                const { syncFollowCounts } = await import('../services/firebase/userService');
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
                            
                            // userProfile state'ini güncellenmiş count'larla birlikte set et
                            setUserProfile({
                                ...profile,
                                recommendationsCount: finalCount,
                                followersCount: finalFollowersCount,
                                followingCount: finalFollowingCount
                            });
                            
                            setRecommendationsCount(finalCount);
                            setFollowersCount(finalFollowersCount);
                            setFollowingCount(finalFollowingCount);
                        }
                    } catch (err) {
                        console.error("Profil çekilirken hata:", err);
                    }
                };
                refreshProfile();
            }
        } else {
            // Giriş yapmamış kullanıcılar için sadece popüler tavsiyeleri göster
            if (activeTab === 'popular' || activeTab === 'following') {
                popularRecommendations.loadRecommendations();
            }
            // Giriş yapmamış kullanıcılar profil/ayarlar göremez
            if (activeTab === 'profile' || activeTab === 'settings') {
                setActiveTab('popular');
            }
        }
    }, [activeTab, authUser, authLoading]);

    // activeUserTab değiştiğinde keşfet verilerini yenile
    useEffect(() => {
        if (activeTab === 'explore' && authUser?.uid) {
            exploreHook.fetchExploreData();
        }
    }, [exploreHook.activeUserTab, activeTab, authUser?.uid]);

    const handleLike = useCallback(async (recId) => {
        if (!authUser?.uid) {
            router.push('/giris');
            return;
        }
        
        // Hook'lardan tavsiyeyi bul
        const recToUpdate = followingRecommendations.recommendations.find(r => r.id === recId) ||
                          popularRecommendations.recommendations.find(r => r.id === recId);
        
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
                            recToUpdate.imageUrl
                        );
                    }
                }
            }
            
            // Hook'lardaki tavsiyeleri güncelle
            const updates = {
                isLiked: !recToUpdate.isLiked,
                likeCount: recToUpdate.isLiked ? Math.max(0, recToUpdate.likeCount - 1) : recToUpdate.likeCount + 1
            };
            
            followingRecommendations.updateRecommendation(recId, updates);
            popularRecommendations.updateRecommendation(recId, updates);
        } catch (error) {
            console.error("Beğenme işlemi sırasında hata:", error);
            alert(error.message || "Beğenme işlemi başarısız oldu.");
        }
    }, [authUser?.uid, router, followingRecommendations, popularRecommendations]);

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

        // Hook'lardan tavsiyeyi bul
        const recommendationToDelete = followingRecommendations.recommendations.find(rec => rec.id === postId) ||
                                      popularRecommendations.recommendations.find(r => r.id === postId);
        
        if (!recommendationToDelete || recommendationToDelete.userId !== authUser.uid) {
            alert("Bu tavsiyeyi silme yetkiniz yok.");
            return;
        }

        if (window.confirm("Bu tavsiyeyi silmek istediğinizden emin misiniz?")) {
            try {
                const { doc, deleteDoc, updateDoc, increment } = await import('firebase/firestore');
                const { db } = await import('../firebaseConfig');
                const postRef = doc(db, "recommendations", postId);
                await deleteDoc(postRef);
                
                // Kullanıcının recommendationsCount'unu azalt
                try {
                    const userRef = doc(db, 'users', authUser.uid);
                    await updateDoc(userRef, {
                        recommendationsCount: increment(-1)
                    });
                    // State'i de güncelle
                    setRecommendationsCount(prev => Math.max(0, prev - 1));
                } catch (error) {
                    console.error("RecommendationsCount güncellenirken hata:", error);
                }
                
                // Hook'lardan kaldır
                followingRecommendations.removeRecommendation(postId);
                popularRecommendations.removeRecommendation(postId);
            } catch (error) {
                console.error("Tavsiye silinirken hata:", error);
                alert("Tavsiye silinirken bir hata oluştu.");
            }
        }
    }, [authUser?.uid, followingRecommendations, popularRecommendations]);

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

    // Şu anki tavsiyeler (aktif tab'a göre)
    const currentRecommendations = activeTab === 'following' ? followingRecommendations : popularRecommendations;

    if (authLoading || (currentRecommendations.isLoading && !userProfile && authUser)) {
        return (
            <div className="w-full min-h-screen bg-dark flex items-center justify-center">
                <div className="loader"></div>
            </div>
        );
    }

    const profileAvatar = userProfile ? getAvatarUrlWithFallback(userProfile.photoURL, userProfile.name, userProfile.username) : 'https://ui-avatars.com/api/?name=?&background=random';

    return (
        <div className="w-full min-h-screen bg-dark antialiased">
            <Header 
                authUser={authUser}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                unreadCount={unreadCount}
            />

            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
                {/* Sol Sidebar - Component kullanımı */}
                {authUser && (
                    <Sidebar
                        userProfile={userProfile}
                        profileAvatar={profileAvatar}
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
                        onShowProfile={() => {
                            setActiveTab('profile');
                            sidebarHook.setSidebarView('profile');
                        }}
                        onItemClick={(recId) => openDetailModal(recId)}
                    />
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
                                        </button>
                                        <button
                                            onClick={() => setShowAddRecommendationModal(true)}
                                            className="flex-1 sm:flex-none py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm bg-primary text-light hover:bg-primary-dark transition-all duration-300"
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
                    {currentRecommendations.error && (activeTab === 'following' || activeTab === 'popular') && (
                        <div className="bg-error/20 border border-error/30 rounded-2xl p-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-error/30 flex items-center justify-center flex-shrink-0">
                                    <i className="fas fa-exclamation-circle text-error"></i>
                                </div>
                                <p className="text-error text-sm font-medium">{currentRecommendations.error}</p>
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

                    {/* Tab İçerikleri */}
                    {activeTab === 'following' && (
                        <FollowingTab
                            recommendations={followingRecommendations.recommendations}
                            isLoading={followingRecommendations.isLoading}
                            error={followingRecommendations.error}
                            authUser={authUser}
                            onLike={handleLike}
                            onSave={handleSave}
                            onDelete={handleDeleteRecommendation}
                            onComment={openDetailModal}
                        />
                    )}

                    {activeTab === 'popular' && (
                        <PopularTab
                            recommendations={popularRecommendations.recommendations}
                            isLoading={popularRecommendations.isLoading}
                            error={popularRecommendations.error}
                            authUser={authUser}
                            onLike={handleLike}
                            onSave={handleSave}
                            onDelete={handleDeleteRecommendation}
                            onComment={openDetailModal}
                        />
                    )}

                    {activeTab === 'explore' && authUser && (
                        <ExploreTab
                            searchQuery={exploreHook.searchQuery}
                            setSearchQuery={exploreHook.setSearchQuery}
                            performSearch={exploreHook.performSearch}
                            isSearching={exploreHook.isSearching}
                            userResults={exploreHook.userResults}
                            recommendationResults={exploreHook.recommendationResults}
                            categories={categories}
                            trendingItems={exploreHook.trendingItems}
                            activeUserTab={exploreHook.activeUserTab}
                            setActiveUserTab={exploreHook.setActiveUserTab}
                            featuredUsers={exploreHook.featuredUsers}
                            popularUsers={exploreHook.popularUsers}
                            myFollowingIds={exploreHook.myFollowingIds}
                            handleFollowToggle={exploreHook.handleFollowToggle}
                            isLoading={exploreHook.isLoading}
                            openDetailModal={openDetailModal}
                            authUser={authUser}
                        />
                    )}

                    {activeTab === 'notifications' && authUser && (
                        <NotificationsTab
                            notifications={notificationsHook.notifications}
                            isLoading={notificationsHook.isLoading}
                            markAllAsRead={notificationsHook.markAllAsRead}
                            handleMarkAsRead={notificationsHook.markAsRead}
                            onItemClick={openDetailModal}
                        />
                    )}

                    {activeTab === 'profile' && authUser && (
                        <ProfileTab
                            userProfile={userProfile}
                            authUser={authUser}
                            onLike={handleLike}
                            onSave={handleSave}
                            onDelete={handleDeleteRecommendation}
                            onShowSettings={() => setActiveTab('settings')}
                            onShowFollowers={() => router.push(`/profil/${authUser.uid}/takipciler`)}
                            onShowFollowing={() => router.push(`/profil/${authUser.uid}/takip-edilenler`)}
                            onItemClick={openDetailModal}
                        />
                    )}

                    {activeTab === 'settings' && authUser && (
                        <SettingsTab
                            onProfileUpdate={async (profile) => {
                                // Profil güncellendiğinde count'ları da senkronize et
                                try {
                                    let syncedCount = null;
                                    try {
                                        const { syncRecommendationsCount } = await import('../services/firebase/userService');
                                        syncedCount = await syncRecommendationsCount(authUser.uid);
                                    } catch (syncError) {
                                        console.warn("Tavsiye sayısı senkronize edilemedi:", syncError);
                                    }
                                    
                                    let syncedFollowCounts = null;
                                    try {
                                        const { syncFollowCounts } = await import('../services/firebase/userService');
                                        syncedFollowCounts = await syncFollowCounts(authUser.uid);
                                    } catch (syncError) {
                                        console.warn("Takip/takipçi sayıları senkronize edilemedi:", syncError);
                                    }
                                    
                                    const finalCount = syncedCount !== null && syncedCount !== undefined 
                                        ? syncedCount 
                                        : (profile.recommendationsCount !== undefined && profile.recommendationsCount !== null 
                                            ? profile.recommendationsCount 
                                            : 0);
                                    const finalFollowersCount = syncedFollowCounts?.followersCount ?? profile.followersCount ?? 0;
                                    const finalFollowingCount = syncedFollowCounts?.followingCount ?? profile.followingCount ?? 0;
                                    
                                    setUserProfile({
                                        ...profile,
                                        recommendationsCount: finalCount,
                                        followersCount: finalFollowersCount,
                                        followingCount: finalFollowingCount
                                    });
                                    setRecommendationsCount(finalCount);
                                    setFollowersCount(finalFollowersCount);
                                    setFollowingCount(finalFollowingCount);
                                } catch (error) {
                                    console.error("Profil güncellenirken hata:", error);
                                    // Hata olsa bile profil'i güncelle
                                    setUserProfile(profile);
                                    if (profile.recommendationsCount !== undefined) {
                                        setRecommendationsCount(profile.recommendationsCount);
                                    }
                                }
                            }}
                        />
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

            {/* Yeni Tavsiye Modal */}
            {showAddRecommendationModal && authUser && (
                <AddRecommendationModal
                    isOpen={showAddRecommendationModal}
                    onClose={() => setShowAddRecommendationModal(false)}
                    onSuccess={async () => {
                        // Tavsiye eklendikten sonra recommendations'ı yenile
                        if (activeTab === 'following') {
                            followingRecommendations.loadRecommendations();
                        } else if (activeTab === 'popular') {
                            popularRecommendations.loadRecommendations();
                        }
                        // Profil bilgilerini de güncelle (tavsiye sayısı)
                        if (authUser?.uid) {
                            try {
                                const profile = await getUserProfile(authUser.uid);
                                if (profile) {
                                    setRecommendationsCount(profile.recommendationsCount || 0);
                                    setUserProfile(profile);
                                } else {
                                    // Eğer profil bulunamazsa, count'u artır
                                    setRecommendationsCount(prev => prev + 1);
                                }
                            } catch (error) {
                                console.error("Profil güncellenirken hata:", error);
                                // Hata olsa bile count'u artır
                                setRecommendationsCount(prev => prev + 1);
                            }
                        }
                    }}
                />
            )}
        </div>
    );
}
