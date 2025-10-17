'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { doc, getDoc, getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const RecommendationCard = ({ rec, currentUserData, onLike, onSave }) => {
    const [author, setAuthor] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentCount, setCommentCount] = useState(0);

    useEffect(() => {
        const getAuthorData = async () => {
            if (!rec.userId) return;
            const userDoc = await getDoc(doc(db, "users", rec.userId));
            if (userDoc.exists()) {
                setAuthor({ uid: userDoc.id, ...userDoc.data() });
            }
        };

        const getCommentsData = async () => {
            const commentsRef = collection(db, "recommendations", rec.id, "comments");
            const q = query(commentsRef, orderBy("createdAt", "desc"), limit(2));
            const querySnapshot = await getDocs(q);
            const commentsData = querySnapshot.docs.map(doc => doc.data()).reverse();
            setComments(commentsData);

            const countSnapshot = await getDocs(commentsRef);
            setCommentCount(countSnapshot.size);
        };

        getAuthorData();
        getCommentsData();
    }, [rec.id, rec.userId]);

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

    const postDate = rec.createdAt?.seconds ? new Date(rec.createdAt.seconds * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : 'Tarih bilinmiyor';
    const isLiked = currentUserData && rec.likes?.includes(currentUserData.uid);
    const isSaved = currentUserData && currentUserData.savedRecommendations?.includes(rec.id);
    const likeCount = rec.likes ? rec.likes.length : 0;
    const profileLink = rec.userId === currentUserData.uid ? `/profil` : `/profil/${rec.userId}`;
    const postTitle = rec.title || rec.businessName || '';
    const postText = rec.text || '';
    
    // DÜZELTME: Tüm linkler artık tavsiyenin kendi detay sayfasına gidiyor.
    const detailLink = `/tavsiye/${rec.id}`;

    return (
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 overflow-hidden">
            <div className="p-5">
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                        <Link href={profileLink}>
                            <Image 
                                className="w-12 h-12 rounded-full object-cover" 
                                src={author.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name)}&background=random&color=fff`} 
                                alt={author.name}
                                width={48}
                                height={48}
                                unoptimized
                            />
                        </Link>
                        <div>
                            <Link href={profileLink} className="font-bold text-gray-900 hover:underline">{author.name}</Link>
                            <p className="text-xs text-gray-500">{postDate}</p>
                        </div>
                    </div>
                     <span className={`px-3 py-1 rounded-full text-xs font-semibold ${rec.listLink ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                        {rec.category}
                    </span>
                </div>
                <div className="block mt-4 cursor-pointer" onClick={() => window.location.href=detailLink}>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">{postTitle}</h3>
                    <p className="text-gray-600 text-sm">{postText}</p>
                    {/* YENİ: Eğer bu bir liste tavsiyesi ise, içinde ayrı bir link göster */}
                    {rec.listLink && (
                        <div className="mt-3">
                            <Link href={rec.listLink} className="text-sm font-semibold text-teal-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                                Listeyi Görüntüle →
                            </Link>
                        </div>
                    )}
                </div>
            </div>
            {rec.imageUrl && (
                <Link href={detailLink}>
                    <Image 
                        src={rec.imageUrl} 
                        className="w-full h-64 object-cover" 
                        alt="Tavsiye görseli"
                        width={600}
                        height={256}
                        priority
                    />
                </Link>
            )}
            <div className="px-3 pt-2 pb-1">
                <div className="flex items-center justify-between text-gray-500">
                    <button onClick={() => onLike(rec.id)} className={`like-btn flex items-center gap-2 transition-colors p-2 rounded-lg ${isLiked ? 'text-pink-500' : 'hover:text-pink-500'}`}>
                        <i className={`${isLiked ? 'fas' : 'far'} fa-heart text-lg`}></i>
                        <span className="text-sm font-semibold">{likeCount > 0 ? likeCount : ''}</span>
                    </button>
                    <Link href={detailLink} className="flex items-center gap-2 hover:text-blue-500 transition-colors p-2 rounded-lg">
                        <i className="far fa-comment-dots text-lg"></i>
                        <span className="text-sm font-semibold">{commentCount}</span>
                    </Link>
                    <button onClick={() => onSave(rec.id)} className={`save-btn flex items-center gap-2 transition-colors p-2 rounded-lg ${isSaved ? 'text-yellow-500' : 'hover:text-yellow-500'}`}>
                        <i className={`${isSaved ? 'fas' : 'far'} fa-bookmark text-lg`}></i>
                    </button>
                     <button className="flex items-center gap-2 hover:text-purple-500 transition-colors p-2 rounded-lg">
                        <i className="fas fa-share-alt text-lg"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecommendationCard;