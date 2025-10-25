'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { doc, getDoc } from 'firebase/firestore'; // Yorumla ilgili importlar kaldırıldı
import { db } from '../firebaseConfig';

const RecommendationCard = ({ rec, currentUserData, onLike, onSave, onDelete }) => {
    const [author, setAuthor] = useState(null);
    // Yorum state'leri kaldırıldı
    // const [comments, setComments] = useState([]);
    // const [commentCount, setCommentCount] = useState(0);

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
        // Yorumları çekme kaldırıldı

    }, [rec.userId]); // Bağımlılık güncellendi

    // Yazar yüklenmediyse iskelet göster
    if (!author) {
        return (
            <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-50 animate-pulse">
                <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-2/4"></div>
                        <div className="h-2 bg-gray-200 rounded w-1/4"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Değişken tanımlamaları
    const postDate = rec.createdAt?.seconds ? new Date(rec.createdAt.seconds * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : 'Tarih bilinmiyor';
    const isLiked = currentUserData && rec.likes?.includes(currentUserData.uid);
    const likeCount = rec.likes?.length || 0;
    const isOwner = currentUserData && currentUserData.uid === rec.userId;
    const profileLink = isOwner ? `/profil` : `/profil/${rec.userId}`;
    const postTitle = rec.title || ''; // Başlık yoksa boş string
    const postText = rec.text || ''; // Metin yoksa boş string
    const detailLink = `/tavsiye/${rec.id}`; // Her zaman detay sayfasına link

    // Render kısmı
    return (
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 overflow-hidden relative">
            {/* Silme Butonu (Sadece sahibi görür) */}
            {isOwner && onDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Arka plandaki linkin tetiklenmesini engelle
                        onDelete(rec.id); // onDelete prop'u ile gelen fonksiyonu çağır
                    }}
                    className="absolute top-3 right-3 text-gray-400 hover:text-red-500 bg-white/70 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center transition-colors z-10"
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
                        <Link href={profileLink}>
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
                            <Link href={profileLink} className="font-bold text-gray-900 hover:underline">{author.name || 'Bilinmeyen Yazar'}</Link>
                            <p className="text-xs text-gray-500">{postDate}</p>
                        </div>
                    </div>
                    {/* Kategori Etiketi */}
                     <span className={`px-3 py-1 rounded-full text-xs font-semibold mr-8 ${rec.listLink ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                        {rec.category || 'Kategorisiz'}
                    </span>
                </div>

                {/* Başlık ve Metin (Detay Sayfasına Linkli) */}
                <Link href={detailLink} className="block group">
                    <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-teal-600 transition-colors">{postTitle}</h3>
                    <p className="text-gray-600 text-sm line-clamp-3 mb-3">{postText}</p>
                </Link>

                {/* Liste Linki (varsa) */}
                {rec.listLink && (
                    <div className="mt-1">
                        {/* İç içe Link hatasını önlemek için bu Link artık dışarıda */}
                        <Link href={rec.listLink} className="text-sm font-semibold text-teal-600 hover:underline">
                            Listeyi Görüntüle →
                        </Link>
                    </div>
                )}
            </div>

            {/* Resim (Detay Sayfasına Linkli) */}
            {rec.imageUrl && (
                <Link href={detailLink}>
                    <div className="relative w-full h-64 block">
                        <Image
                            src={rec.imageUrl}
                            className="object-cover"
                            alt={postTitle ? `${postTitle} ile ilgili görsel` : "Tavsiye görseli"} // İyileştirilmiş alt text
                            fill
                            sizes="(max-width: 640px) 100vw, 640px"
                            priority={false}
                        />
                    </div>
                </Link>
            )}

            {/* Alt Butonlar */}
            <div className="px-3 pt-2 pb-1">
                <div className="flex items-center justify-around text-gray-500"> {/* justify-between yerine justify-around */}
                    {/* Beğen Butonu */}
                    <button onClick={() => onLike && onLike(rec.id)} disabled={!onLike} className={`flex items-center gap-2 transition-colors p-2 rounded-lg ${isLiked ? 'text-pink-500' : 'hover:text-pink-500 disabled:opacity-50'}`}>
                        <i className={`${isLiked ? 'fas' : 'far'} fa-heart text-lg`}></i>
                        <span className="text-sm font-semibold">{likeCount > 0 ? likeCount : ''}</span>
                    </button>
                    {/* Yorum ikonu kaldırıldı */}
                    {/* Kaydet (Modal Aç) Butonu */}
                    <button onClick={() => onSave && onSave(rec.id)} disabled={!onSave} className={`flex items-center gap-2 transition-colors p-2 rounded-lg hover:text-yellow-500 disabled:opacity-50`}>
                       <i className="far fa-bookmark text-lg"></i>
                       {/* Kaydetme durumu modal içinde yönetildiği için yazı kaldırıldı */}
                    </button>
                    {/* Paylaş Butonu */}
                     <button className="flex items-center gap-2 hover:text-purple-500 transition-colors p-2 rounded-lg">
                        <i className="fas fa-share-alt text-lg"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecommendationCard;