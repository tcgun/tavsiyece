'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getAvatarUrlWithFallback } from '../../utils';

export default function Sidebar({
  userProfile,
  profileAvatar,
  recommendationsCount,
  followersCount,
  followingCount,
  categories,
  sidebarView,
  sidebarUsers,
  isLoadingSidebar,
  savedRecommendations,
  isLoadingSaved,
  onShowUsersList,
  onShowSavedList,
  onShowProfile,
  onItemClick
}) {
  return (
    <aside className="w-full lg:w-80 flex-shrink-0">
      <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl lg:sticky lg:top-24">
        {sidebarView === 'profile' ? (
          <>
            {/* Profil Fotoğrafı ve Bilgiler */}
            <div className="text-center mb-4 sm:mb-6 relative">
              <div className="relative inline-block">
                {onShowProfile ? (
                  <button onClick={onShowProfile} className="relative block mx-auto">
                    <Image
                      src={profileAvatar}
                      alt={userProfile?.name || 'Kullanıcı'}
                      width={110}
                      height={110}
                      className="rounded-full object-cover mx-auto mb-3 sm:mb-4 border-4 border-dark shadow-xl w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28"
                      unoptimized
                    />
                  </button>
                ) : (
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
                )}
                <Link
                  href="/ayarlar/profili-duzenle"
                  className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-primary text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:bg-primary-dark transition-all duration-300 shadow-md border-2 border-dark"
                  title="Profili Düzenle"
                  aria-label="Profili Düzenle"
                >
                  <i className="fas fa-pencil-alt text-[10px] sm:text-xs"></i>
                </Link>
              </div>
              {onShowProfile ? (
                <button onClick={onShowProfile} className="block w-full text-left">
                  <h2 className="text-lg sm:text-xl font-extrabold text-light hover:text-primary transition-colors truncate px-2">
                    {userProfile?.name || 'İsimsiz'}
                  </h2>
                </button>
              ) : (
                <Link href="/profil" className="block">
                  <h2 className="text-lg sm:text-xl font-extrabold text-light hover:text-primary transition-colors truncate px-2">
                    {userProfile?.name || 'İsimsiz'}
                  </h2>
                </Link>
              )}
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
                  onClick={() => onShowUsersList('followers')}
                  className="cursor-pointer"
                >
                  <p className="text-2xl sm:text-3xl font-extrabold text-primary">
                    {followersCount}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted font-semibold mt-1">Takipçi</p>
                </button>
                <button
                  onClick={() => onShowUsersList('following')}
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
                onClick={onShowSavedList}
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
                onClick={onShowProfile}
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
                      onClick={() => onItemClick(rec.id)}
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
                onClick={onShowProfile}
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
  );
}

