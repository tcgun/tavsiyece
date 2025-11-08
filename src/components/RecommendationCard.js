'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { doc, getDoc } from 'firebase/firestore'; // Yorumla ilgili importlar kaldırıldı
import { db } from '../firebaseConfig';

const RecommendationCard = ({ rec, currentUserData, onLike, onSave, onDelete }) => {
    const [author, setAuthor] = useState(null);

    // Yazar bilgisini çekme
    useEffect(() => {
        const getAuthorData = async () => {
             if (!rec.userId) return;
             try {
                const userDoc = await getDoc(doc(db, "users", rec.userId));
                if (userDoc.exists()) {
                    setAuthor({ uid: userDoc.id, ...userDoc.data() });
                } else {
                     console.warn("RecommendationCard: Yazar bulunamadı:", rec.userId);
                }
             } catch (error) {
                 console.error("RecommendationCard: Yazar verisi alınırken hata:", error);
             }
        };

        getAuthorData();
    }, [rec.userId]);

    // Yazar yüklenmediyse iskelet göster
    if (!author) {
        return (
            <div className="bg-card rounded-xl p-5 shadow-sm border border-border animate-pulse">
                <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-white/10"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-3 bg-white/10 rounded w-2/4"></div>
                        <div className="h-2 bg-white/10 rounded w-1/4"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Değişken tanımlamaları
    const postDate = rec.createdAt?.seconds ? new Date(rec.createdAt.seconds * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : 'Tarih bilinmiyor';
    // rec.isLiked ve rec.likeCount fetch edilirken geliyor, rec.likes array'i gelmiyor
    const isLiked = rec.isLiked || (currentUserData && rec.likes?.includes(currentUserData.uid));
    const likeCount = rec.likeCount || rec.likes?.length || 0;
    const isOwner = currentUserData && currentUserData.uid === rec.userId;
    const profileLink = isOwner ? `/profil` : `/profil/${rec.userId}`;
    const postTitle = rec.title || ''; // Başlık yoksa boş string
    const postText = rec.text || ''; // Metin yoksa boş string

    // Render kısmı
    return (
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden relative">
            {/* Silme Butonu (Sadece sahibi görür) */}
            {isOwner && onDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(rec.id);
                    }}
                    className="absolute top-3 right-3 text-muted hover:text-error bg-card/70 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center transition-colors z-10"
                    aria-label="Tavsiyeyi Sil"
                >
                    <i className="fas fa-trash-alt text-sm"></i>
                </button>
            )}

            {/* Kart İçeriği */}
            <div className="p-5">
                {/* Yazar Bilgisi ve Kategori */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <Link href={profileLink} onClick={(e) => e.stopPropagation()}>
                            <Image
                                className="w-12 h-12 rounded-full object-cover"
                                src={author.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name || '?')}&background=random&color=fff`}
                                alt={`${author.name || 'Yazar'} profil fotoğrafı`}
                                width={48}
                                height={48}
                                unoptimized
                            />
                        </Link>
                        <div>
                            <Link href={profileLink} onClick={(e) => e.stopPropagation()} className="font-bold text-light hover:text-primary transition-colors">{author.name || 'Bilinmeyen Yazar'}</Link>
                            <p className="text-xs text-muted">{postDate}</p>
                        </div>
                    </div>
                    {/* Kategori Etiketi */}
                     <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                        {rec.category || 'Kategorisiz'}
                    </span>
                </div>

                {/* Başlık ve Metin */}
                <div>
                    <h3 className="text-lg font-bold text-light mb-1">{postTitle}</h3>
                    <p className="text-muted text-sm line-clamp-3 mb-3">{postText}</p>
                </div>

            </div>

            {/* Resim */}
            {rec.imageUrl && (
                <div className="relative w-full h-64">
                    <Image
                        src={rec.imageUrl}
                        className="object-cover"
                        alt={postTitle ? `${postTitle} ile ilgili görsel` : "Tavsiye görseli"}
                        fill
                        sizes="(max-width: 640px) 100vw, 640px"
                        priority={false}
                        unoptimized
                    />
                </div>
            )}

            {/* Alt Butonlar */}
            <div className="px-3 pt-2 pb-1 border-t border-border">
                <div className="flex items-center justify-around text-muted">
                    {/* Beğen Butonu */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onLike && onLike();
                        }} 
                        disabled={!onLike} 
                        className={`flex items-center gap-2 transition-colors p-2 rounded-lg ${isLiked ? 'text-primary' : 'hover:text-primary disabled:opacity-50'}`}
                    >
                        <i className={`${isLiked ? 'fas' : 'far'} fa-heart text-lg`}></i>
                        <span className="text-sm font-semibold">{likeCount > 0 ? likeCount : ''}</span>
                    </button>
                    {/* Kaydet Butonu */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onSave && onSave();
                        }} 
                        disabled={!onSave} 
                        className="flex items-center gap-2 transition-colors p-2 rounded-lg hover:text-primary disabled:opacity-50"
                    >
                       <i className="far fa-bookmark text-lg"></i>
                    </button>
                    {/* Paylaş Butonu */}
                     <button 
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 hover:text-primary transition-colors p-2 rounded-lg"
                    >
                        <i className="fas fa-share-alt text-lg"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecommendationCard;