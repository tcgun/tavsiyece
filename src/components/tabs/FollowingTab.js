'use client';

import React from 'react';
import RecommendationCard from '../RecommendationCard';

export default function FollowingTab({
  recommendations,
  isLoading,
  error,
  authUser,
  onLike,
  onSave,
  onDelete,
  onComment
}) {
  if (isLoading) {
    return (
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
    );
  }

  if (error) {
    return (
      <div className="bg-error/20 border border-error/30 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-error/30 flex items-center justify-center flex-shrink-0">
            <i className="fas fa-exclamation-circle text-error"></i>
          </div>
          <p className="text-error text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-16 bg-card border border-border rounded-2xl shadow-xl">
        <div className="w-28 h-28 bg-dark rounded-3xl flex items-center justify-center mx-auto mb-6">
          <i className="fas fa-user-friends text-5xl text-primary"></i>
        </div>
        <h2 className="text-2xl font-extrabold text-light mb-3">Henüz tavsiye yok</h2>
        <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
          Takip ettiğin kullanıcılar henüz tavsiye paylaşmamış. Yeni insanları keşfetmeye ne dersin?
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {recommendations.map(rec => (
        <div key={rec.id} onClick={() => onComment && onComment(rec.id)} className="cursor-pointer">
          <RecommendationCard
            rec={rec}
            currentUserData={{ uid: authUser?.uid }}
            onLike={() => onLike && onLike(rec.id)}
            onSave={() => onSave && onSave(rec.id)}
            onDelete={onDelete}
            onComment={onComment}
          />
        </div>
      ))}
    </div>
  );
}

