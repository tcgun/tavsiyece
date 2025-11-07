'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { doc, getDoc, onSnapshot, collection, query, orderBy, getDocs, addDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getAvatarUrlWithFallback, formatRelativeTime } from '../utils';
import { createNotification } from '../services/firebase/notificationService';
import { isRecommendationSaved, saveRecommendation, unsaveRecommendation } from '../services/firebase/recommendationService';

const RecommendationDetailModal = ({ recId, userId, onClose }) => {
    const [recommendation, setRecommendation] = useState(null);
    const [author, setAuthor] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingComment, setIsSavingComment] = useState(false);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [likeCount, setLikeCount] = useState(0);

    // Kullanıcı bilgisini çek
    useEffect(() => {
        if (!userId) {
            setCurrentUserData(null);
            return;
        }
        const userRef = doc(db, "users", userId);
        const unsub = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
                setCurrentUserData({ uid: snap.id, ...snap.data() });
            } else {
                setCurrentUserData(null);
            }
        }, (error) => {
            console.error("Kullanıcı bilgisi alınırken hata:", error);
            setCurrentUserData(null);
        });
        return () => unsub();
    }, [userId]);

    // Tavsiye ve yorumları çek
    useEffect(() => {
        if (!recId) return;
        
        setIsLoading(true);
        const recRef = doc(db, "recommendations", recId);
        const unsubRec = onSnapshot(recRef, async (snap) => {
            if (snap.exists()) {
                const recData = { id: snap.id, ...snap.data() };
                setRecommendation(recData);
                setIsLiked(recData.likes?.includes(userId) || false);
                setLikeCount(recData.likes?.length || 0);

                // Yazar bilgisini çek
                try {
                    const authorDoc = await getDoc(doc(db, "users", recData.userId));
                    if (authorDoc.exists()) {
                        setAuthor({ uid: authorDoc.id, ...authorDoc.data() });
                    } else {
                        setAuthor(null);
                    }
                } catch (error) {
                    console.error("Yazar bilgisi alınırken hata:", error);
                    setAuthor(null);
                }

                // Kaydedilme durumunu kontrol et
                if (userId) {
                    try {
                        const saved = await isRecommendationSaved(userId, recId);
                        setIsSaved(saved);
                    } catch (error) {
                        console.error("Kaydedilme durumu kontrol edilirken hata:", error);
                        setIsSaved(false);
                    }
                }

                setIsLoading(false);
            } else {
                setIsLoading(false);
                setRecommendation(null);
            }
        }, (error) => {
            console.error("Tavsiye bilgisi alınırken hata:", error);
            setIsLoading(false);
            setRecommendation(null);
        });

        // Yorumları çek
        const commentsRef = collection(db, "recommendations", recId, "comments");
        const commentsQuery = query(commentsRef, orderBy("createdAt", "desc"));
        const unsubComments = onSnapshot(commentsQuery, (snapshot) => {
            const commentsData = [];
            snapshot.forEach((doc) => {
                commentsData.push({ id: doc.id, ...doc.data() });
            });
            setComments(commentsData);
        }, (error) => {
            console.error("Yorumlar alınırken hata:", error);
            setComments([]);
        });

        return () => {
            unsubRec();
            unsubComments();
        };
    }, [recId, userId]);

    // Beğeni
    const handleLike = async () => {
        if (!userId || !recommendation) return;
        
        const recRef = doc(db, "recommendations", recId);
        const newLikes = recommendation.likes || [];
        const isCurrentlyLiked = newLikes.includes(userId);

        try {
            if (isCurrentlyLiked) {
                await updateDoc(recRef, { likes: arrayRemove(userId) });
                setIsLiked(false);
                setLikeCount(prev => prev - 1);
            } else {
                await updateDoc(recRef, { likes: arrayUnion(userId) });
                setIsLiked(true);
                setLikeCount(prev => prev + 1);

                // Bildirim oluştur
                if (recommendation.userId !== userId && author) {
                    await createNotification({
                        recipientId: recommendation.userId,
                        senderId: userId,
                        senderName: currentUserData?.name || 'Bilinmeyen Kullanıcı',
                        senderPhotoURL: currentUserData?.photoURL || null,
                        message: `tavsiyeni beğendi.`,
                        link: `/tavsiye/${recId}`,
                        imageUrl: recommendation.imageUrl,
                        type: 'Begeniler'
                    });
                }
            }
        } catch (error) {
            console.error("Beğeni hatası:", error);
        }
    };

    // Kaydet
    const handleSave = async () => {
        if (!userId) return;
        
        try {
            if (isSaved) {
                await unsaveRecommendation(userId, recId);
                setIsSaved(false);
            } else {
                await saveRecommendation(userId, recId);
                setIsSaved(true);
            }
        } catch (error) {
            console.error("Kaydetme hatası:", error);
        }
    };

    // Yorum ekle
    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!userId || !commentText.trim() || isSavingComment) return;

        setIsSavingComment(true);
        try {
            const commentsRef = collection(db, "recommendations", recId, "comments");
            await addDoc(commentsRef, {
                userId,
                text: commentText.trim(),
                createdAt: serverTimestamp(),
                userName: currentUserData?.name || 'Bilinmeyen Kullanıcı',
                userPhotoURL: currentUserData?.photoURL || null,
            });

            // Bildirim oluştur
            if (recommendation.userId !== userId && author) {
                await createNotification({
                    recipientId: recommendation.userId,
                    senderId: userId,
                    senderName: currentUserData?.name || 'Bilinmeyen Kullanıcı',
                    senderPhotoURL: currentUserData?.photoURL || null,
                    message: `tavsiyene yorum yaptı: "${commentText.trim().substring(0, 50)}${commentText.trim().length > 50 ? '...' : ''}"`,
                    link: `/tavsiye/${recId}`,
                    imageUrl: recommendation.imageUrl,
                    type: 'Yorumlar'
                });
            }

            setCommentText('');
        } catch (error) {
            console.error("Yorum ekleme hatası:", error);
        } finally {
            setIsSavingComment(false);
        }
    };

    // Yorum sil
    const handleDeleteComment = async (commentId) => {
        if (!userId) return;
        
        try {
            const commentRef = doc(db, "recommendations", recId, "comments", commentId);
            await deleteDoc(commentRef);
        } catch (error) {
            console.error("Yorum silme hatası:", error);
        }
    };

    if (isLoading || !recommendation) {
        return (
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-card rounded-2xl p-8 max-w-2xl w-full">
                    <div className="flex justify-center">
                        <div className="spinner-sm"></div>
                    </div>
                </div>
            </div>
        );
    }

    const displayAuthor = author || { name: 'Bilinmeyen Yazar', photoURL: null, uid: recommendation.userId };
    const postDate = recommendation.createdAt?.seconds
        ? new Date(recommendation.createdAt.seconds * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
        : '';

    return (
        <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div 
                className="bg-card rounded-xl sm:rounded-2xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-border my-2 sm:my-8"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-border p-3 sm:p-4 flex items-center justify-between z-10">
                    <button
                        onClick={onClose}
                        className="text-light hover:text-primary transition-colors p-2 rounded-lg hover:bg-white/10 flex-shrink-0"
                        aria-label="Kapat"
                    >
                        <i className="fas fa-times text-lg sm:text-xl"></i>
                    </button>
                    <h2 className="text-base sm:text-lg font-bold text-light truncate px-2">Tavsiye Detayı</h2>
                    <div className="w-8 sm:w-10"></div>
                </div>

                {/* İçerik */}
                <div>
                    {/* Görsel */}
                    {recommendation.imageUrl && (
                        <div className="relative w-full h-64">
                            <Image
                                src={recommendation.imageUrl}
                                alt={recommendation.title || 'Tavsiye Görseli'}
                                className="object-cover"
                                fill
                                sizes="(max-width: 768px) 100vw, 768px"
                                priority
                                unoptimized
                            />
                        </div>
                    )}

                    {/* Yazar ve Başlık */}
                    <div className="p-5">
                        <div className="flex items-center space-x-3 mb-4">
                            <Link href={`/profil/${displayAuthor.uid}`}>
                                <Image
                                    src={getAvatarUrlWithFallback(displayAuthor.photoURL, displayAuthor.name, displayAuthor.username)}
                                    className="w-12 h-12 rounded-full object-cover"
                                    alt={`${displayAuthor.name || 'Yazar'} profil fotoğrafı`}
                                    width={48}
                                    height={48}
                                    unoptimized
                                />
                            </Link>
                            <div>
                                <Link href={`/profil/${displayAuthor.uid}`} className="font-bold text-light hover:text-primary transition-colors">
                                    {displayAuthor.name || 'Bilinmeyen Yazar'}
                                </Link>
                                <p className="text-xs text-muted">{postDate}</p>
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-light mb-2">{recommendation.title}</h2>
                        <p className="text-sm text-primary mb-3">{recommendation.category || 'Kategorisiz'}</p>
                        <p className="text-light whitespace-pre-wrap leading-relaxed">{recommendation.text}</p>
                    </div>

                    {/* Beğeni ve Kaydet */}
                    <div className="px-5 py-3 border-t border-b border-border flex justify-around items-center">
                        <button
                            onClick={handleLike}
                            disabled={!userId}
                            className={`flex items-center gap-2 transition-colors p-2 rounded-lg ${isLiked ? 'text-primary' : 'text-muted hover:text-primary'} disabled:opacity-50`}
                        >
                            <i className={`${isLiked ? 'fas' : 'far'} fa-heart text-xl`}></i>
                            <span className="text-sm font-semibold">{likeCount}</span>
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={!userId}
                            className={`flex items-center gap-2 transition-colors p-2 rounded-lg ${isSaved ? 'text-primary' : 'text-muted hover:text-primary'} disabled:opacity-50`}
                        >
                            <i className={`${isSaved ? 'fas' : 'far'} fa-bookmark text-xl`}></i>
                            <span className="text-sm font-semibold">{isSaved ? 'Kaydedildi' : 'Kaydet'}</span>
                        </button>
                    </div>

                    {/* Yorumlar */}
                    <div className="p-5">
                        <h3 className="text-lg font-bold text-light mb-4">
                            Yorumlar ({comments.length})
                        </h3>

                        {/* Yorum Ekleme Formu */}
                        {userId && (
                            <form onSubmit={handleAddComment} className="mb-6">
                                <div className="flex gap-3">
                                    <Image
                                        src={getAvatarUrlWithFallback(currentUserData?.photoURL, currentUserData?.name, currentUserData?.username)}
                                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                        alt="Profil"
                                        width={40}
                                        height={40}
                                        unoptimized
                                    />
                                    <div className="flex-1">
                                        <textarea
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            placeholder="Yorum yaz..."
                                            className="w-full bg-white/10 border border-border rounded-xl p-3 text-light placeholder-muted focus:outline-none focus:border-primary resize-none"
                                            rows="3"
                                            disabled={isSavingComment}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!commentText.trim() || isSavingComment}
                                            className="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
                                        >
                                            {isSavingComment ? 'Gönderiliyor...' : 'Yorum Yap'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {/* Yorum Listesi */}
                        <div className="space-y-4">
                            {comments.length === 0 ? (
                                <p className="text-center text-muted py-8">Henüz yorum yapılmamış.</p>
                            ) : (
                                comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3">
                                        <Link href={`/profil/${comment.userId}`}>
                                            <Image
                                                src={getAvatarUrlWithFallback(comment.userPhotoURL, comment.userName, comment.username)}
                                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                                alt={comment.userName}
                                                width={40}
                                                height={40}
                                                unoptimized
                                            />
                                        </Link>
                                        <div className="flex-1">
                                            <div className="bg-white/10 rounded-xl p-3">
                                                <Link href={`/profil/${comment.userId}`} className="font-bold text-light hover:text-primary transition-colors text-sm">
                                                    {comment.userName}
                                                </Link>
                                                <p className="text-light mt-1 text-sm">{comment.text}</p>
                                            </div>
                                            <p className="text-xs text-muted mt-1 ml-3">
                                                {comment.createdAt?.seconds ? formatRelativeTime(comment.createdAt) : 'Az önce'}
                                            </p>
                                        </div>
                                        {comment.userId === userId && (
                                            <button
                                                onClick={() => handleDeleteComment(comment.id)}
                                                className="text-muted hover:text-error transition-colors p-1"
                                                title="Yorumu Sil"
                                            >
                                                <i className="fas fa-trash-alt text-sm"></i>
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecommendationDetailModal;

