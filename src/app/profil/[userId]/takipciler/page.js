'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, getDoc, getDocs, query } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { useAuth } from '../../../../contexts/AuthContext';
import { getAvatarUrlWithFallback } from '../../../../utils/avatarUtils';
import Header from '../../../../components/layout/Header';
import Sidebar from '../../../../components/layout/Sidebar';
import { useUnreadNotifications } from '../../../../hooks/useUnreadNotifications';
import { useSidebar } from '../../../../hooks/useSidebar';
import { getFollowers, getFollowing, getUserProfile } from '../../../../services/firebase/userService';

export default function FollowersPage() {
    const params = useParams();
    const router = useRouter();
    const { user: authUser, isLoading: authLoading } = useAuth();
    const unreadCount = useUnreadNotifications();
    const { userId } = params;

    const [followers, setFollowers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [profileUser, setProfileUser] = useState(null);
    
    // Sidebar için state'ler
    const [categories, setCategories] = useState([]);
    const [userProfile, setUserProfile] = useState(null);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [recommendationsCount, setRecommendationsCount] = useState(0);
    const sidebarHook = useSidebar(authUser);

    // Kategorileri çek
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const catQuery = query(collection(db, 'categories'));
                const catSnapshot = await getDocs(catQuery);
                const fetchedCategories = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCategories(fetchedCategories);
            } catch (err) {
                setCategories([]);
            }
        };
        fetchCategories();
    }, []);

    // Kendi profil bilgilerini çek (Sidebar için)
    useEffect(() => {
        const fetchProfile = async () => {
            if (!authUser?.uid) return;
            
            try {
                const profile = await getUserProfile(authUser.uid);
                if (profile) {
                    setUserProfile(profile);
                    setRecommendationsCount(profile.recommendationsCount || 0);
                    
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

    // Takipçileri çek
    useEffect(() => {
        const fetchFollowers = async () => {
            if (!userId) return;
            setLoading(true);

            try {
                // Profil kullanıcısını çek
                const profileData = await getUserProfile(userId);
                if (profileData) {
                    setProfileUser(profileData);
                }

                // Takipçileri çek
                const followersList = await getFollowers(userId, 1000);
                setFollowers(followersList.map(user => ({
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    photoURL: user.avatar,
                    avatar: user.avatar
                })));
            } catch (err) {
                console.error("Takipçiler çekilirken hata:", err);
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            fetchFollowers();
        }
    }, [userId, authLoading]);
    
    if (authLoading || loading) {
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
                showBackButton={true}
                backHref={`/profil/${userId}`}
                unreadCount={unreadCount}
            />

            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
                {/* Sol Sidebar */}
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
                        onShowProfile={() => sidebarHook.setSidebarView('profile')}
                        onItemClick={(recId) => router.push(`/?rec=${recId}`)}
                    />
                )}

                {/* Ana İçerik */}
                <main className="flex-1">
                    <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
                        <h1 className="text-2xl font-bold text-light mb-6">Takipçiler</h1>

                        {followers.length > 0 ? (
                            <div className="space-y-3">
                                {followers.map(followUser => (
                                    <Link 
                                        key={followUser.id} 
                                        href={followUser.id === authUser?.uid ? '/profil' : `/profil/${followUser.id}`} 
                                        className="flex items-center gap-4 p-4 rounded-xl bg-dark border border-border hover:bg-primary/20 hover:border-primary/50 transition-all duration-300"
                                    >
                                        <Image
                                            src={getAvatarUrlWithFallback(followUser.photoURL, followUser.name, followUser.username)}
                                            alt={followUser.name}
                                            width={56}
                                            height={56}
                                            className="rounded-full object-cover"
                                            unoptimized
                                        />
                                        <div className="flex-1">
                                            <p className="font-bold text-light">{followUser.name}</p>
                                            <p className="text-sm text-muted">@{followUser.username}</p>
                                        </div>
                                        <i className="fas fa-chevron-right text-muted"></i>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <div className="w-20 h-20 bg-dark rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <i className="fas fa-users text-3xl text-primary"></i>
                                </div>
                                <p className="text-muted">Bu kullanıcının hiç takipçisi yok.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
