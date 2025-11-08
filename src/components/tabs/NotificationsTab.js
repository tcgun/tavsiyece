'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { formatRelativeTime } from '../../utils';

export default function NotificationsTab({
  notifications,
  isLoading,
  markAllAsRead,
  handleMarkAsRead,
  onItemClick
}) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        <div className="flex justify-center py-12">
          <div className="spinner-sm"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
      <div className="p-6 border-b border-border bg-dark flex justify-between items-center">
        <h3 className="text-2xl font-extrabold text-light flex items-center gap-2">
          <i className="fas fa-bell text-primary"></i>
          <span>Bildirimler</span>
        </h3>
        {notifications.some(n => !n.isRead) && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-card text-primary hover:bg-primary/20 hover:border-primary/50 transition-all duration-300 border border-border"
          >
            <i className="fas fa-check-double mr-2"></i>
            Tümünü Okundu İşaretle
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-28 h-28 bg-dark rounded-3xl flex items-center justify-center mb-6">
            <i className="fas fa-bell-slash text-5xl text-primary"></i>
          </div>
          <h2 className="text-2xl font-extrabold text-light mb-3">Henüz bir bildirimin yok.</h2>
          <p className="text-sm text-muted text-center max-w-md leading-relaxed">
            Yeni tavsiyeler keşfetmeye ve insanlarla etkileşime geçmeye ne dersin?
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {notifications.map(notif => {
            const handleNotifClick = async () => {
              await handleMarkAsRead(notif.id);
              if (notif.linkPath === '/tavsiye/[id]' && notif.linkParams?.id && onItemClick) {
                onItemClick(notif.linkParams.id);
              }
            };

            return (
              <button
                key={notif.id}
                onClick={handleNotifClick}
                className={`w-full flex items-start gap-4 p-5 hover:bg-dark transition-all duration-300 group ${
                  !notif.isRead ? 'bg-dark border-l-4 border-primary' : ''
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Image
                    src={notif.sender.avatar}
                    alt={notif.sender.name}
                    width={52}
                    height={52}
                    className="relative rounded-full object-cover ring-2 ring-dark group-hover:ring-primary/50 transition-all duration-300"
                    unoptimized
                  />
                  {!notif.isRead && (
                    <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-primary ring-2 ring-dark shadow-lg animate-pulse"></span>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-light text-sm leading-relaxed">
                    <span className="font-extrabold text-primary">{notif.sender.name}</span>
                    {` ${notif.message}`}
                    {notif.commentText && (
                      <span className="text-muted italic block mt-1 pl-4 border-l-2 border-primary/50">
                        {`"${notif.commentText}"`}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted mt-2 flex items-center gap-2">
                    <i className="fas fa-clock text-[10px]"></i>
                    {formatRelativeTime(notif.createdAt)}
                  </p>
                </div>
                {notif.imageUrl && (
                  <div className="relative flex-shrink-0">
                    <Image
                      src={notif.imageUrl}
                      alt="İlgili gönderi"
                      width={56}
                      height={56}
                      className="relative rounded-xl object-cover ring-2 ring-dark group-hover:ring-primary/50 transition-all duration-300"
                      unoptimized
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

