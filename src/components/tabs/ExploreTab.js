'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getAvatarUrlWithFallback } from '../../utils';

export default function ExploreTab({
  searchQuery,
  setSearchQuery,
  performSearch,
  isSearching,
  userResults,
  recommendationResults,
  categories,
  trendingItems,
  activeUserTab,
  setActiveUserTab,
  featuredUsers,
  popularUsers,
  myFollowingIds,
  handleFollowToggle,
  isLoading,
  openDetailModal,
  authUser
}) {
  return (
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
              const value = e.target.value;
              setSearchQuery(value);
              if (value.trim()) {
                performSearch(value);
              }
            }}
            className="w-full pl-14 pr-5 py-4 bg-dark border-2 border-transparent rounded-xl text-light placeholder-muted focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/20 transition-all duration-300 font-medium"
          />
        </div>
      </div>

      {/* Arama Sonuçları */}
      {isSearching ? (
        <div className="space-y-8">
          {/* Kullanıcılar */}
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

          {/* Tavsiyeler */}
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
      ) : (
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
                    <div 
                      key={item.id} 
                      onClick={() => openDetailModal(item.id)} 
                      className="bg-dark border border-border rounded-2xl p-5 min-w-[300px] shadow-xl cursor-pointer hover:border-primary/50 transition-all"
                    >
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
  );
}

