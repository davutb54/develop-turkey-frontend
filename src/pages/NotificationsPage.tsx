import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../services/notificationService';
import { useNotifications } from '../context/NotificationContext';
import type { Notification } from '../types';

const PAGE_SIZE = 15;

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { markAsRead, markAllAsRead, unreadCount } = useNotifications();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(async (pageNum: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await notificationService.getAll(pageNum, PAGE_SIZE);
      if (res.data.success) {
        const items = res.data.data ?? [];
        setNotifications((prev) => pageNum === 1 ? items : [...prev, ...items]);
        setHasMore(items.length === PAGE_SIZE);
      }
    } catch {
      /* sessizce yoksay */
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  // İlk yükleme
  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  // Sayfa değişince yükle (sayfa 1 zaten yukarıda yüklendi)
  useEffect(() => {
    if (page > 1) fetchPage(page);
  }, [page, fetchPage]);

  // IntersectionObserver — sonsuz scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 0.1 }
    );
    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading]);

  const handleRead = async (n: Notification) => {
    if (!n.isRead) {
      await markAsRead(n.id);
      setNotifications((prev) =>
        prev.map((item) => item.id === n.id ? { ...item, isRead: true } : item)
      );
    }
    if (n.referenceLink) navigate(n.referenceLink);
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="min-h-screen bg-gray-50/70">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Başlık */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Bildirimler</h1>
            <p className="text-sm text-gray-500 mt-1">
              {unreadCount > 0 ? (
                <span className="text-blue-600 font-semibold">{unreadCount} okunmamış bildirim</span>
              ) : 'Tümü okundu.'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-blue-600
                         text-white rounded-xl shadow-sm hover:bg-blue-700 active:scale-95 transition"
            >
              Tümünü Oku
            </button>
          )}
        </div>

        {/* Yükleniyor (ilk yükleme) */}
        {initialLoad && (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse flex gap-4 shadow-sm border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Boş durum */}
        {!initialLoad && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-4">
            <svg className="w-16 h-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002
                   6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388
                   6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3
                   3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-xl font-bold text-gray-500">Henüz bildirim yok</p>
            <p className="text-sm text-gray-400">Yeni etkinlikler burada görünecek.</p>
          </div>
        )}

        {/* Bildirim Listesi */}
        {!initialLoad && notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleRead(n)}
                className={`w-full text-left rounded-2xl border px-5 py-4 flex items-start gap-4
                            shadow-sm transition hover:shadow-md active:scale-[0.99]
                            ${n.isRead
                    ? 'bg-white border-gray-100 hover:border-gray-200'
                    : 'bg-blue-50/60 border-blue-100 hover:border-blue-200'
                  }`}
              >
                {/* Unread dot */}
                <span className={`mt-2 w-2.5 h-2.5 rounded-full flex-shrink-0
                  ${n.isRead ? 'bg-gray-200' : 'bg-blue-500'}`}
                />

                {/* İçerik */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold truncate
                      ${n.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                      {n.title}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.message}</p>
                  <p className="text-[11px] text-gray-400 mt-2">
                    {new Date(n.createdAt).toLocaleDateString('tr-TR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>

                {/* Ok (link varsa) */}
                {n.referenceLink && (
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            ))}

            {/* Sonsuz scroll tetikleyicisi */}
            <div ref={sentinelRef} className="h-8" />

            {/* Yükleniyor spinnerı (sayfa sonu) */}
            {loading && !initialLoad && (
              <div className="flex justify-center py-4">
                <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}

            {!hasMore && notifications.length > 0 && (
              <p className="text-center text-xs text-gray-400 py-4 font-medium">
                — Tüm bildirimler yüklendi —
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
