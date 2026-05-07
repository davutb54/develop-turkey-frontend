import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

interface Props {
  /** true → mobil liste modu (hamburger menü içinde), false → dropdown modu */
  mobile?: boolean;
  onClose?: () => void;
}

const NotificationBell = ({ mobile = false, onClose }: Props) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Dropdown dışına tıklandığında kapat
  useEffect(() => {
    if (mobile) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobile]);

  const handleClick = async (id: number, link?: string | null) => {
    await markAsRead(id);
    setOpen(false);
    onClose?.();
    if (link) navigate(link);
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
  };

  // Bildirim tipine göre renk çizgisi ve ikon
  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'AdminWarning': return { border: 'border-l-4 border-red-500', icon: '⚠️', label: 'Sistem Uyarısı' };
      case 'SolutionApproved': return { border: 'border-l-4 border-green-500', icon: '✅', label: 'Çözüm Onaylandı' };
      case 'SolutionRejected': return { border: 'border-l-4 border-orange-500', icon: '❌', label: 'Çözüm Reddedildi' };
      case 'ContentRemoved': return { border: 'border-l-4 border-red-400', icon: '🗑️', label: 'İçerik Kaldırıldı' };
      case 'ContentModified': return { border: 'border-l-4 border-yellow-500', icon: '✏️', label: 'İçerik Düzenlendi' };
      case 'SolutionAdded': return { border: 'border-l-4 border-blue-500', icon: '💡', label: 'Yeni Çözüm' };
      case 'CommentAdded': return { border: 'border-l-4 border-purple-500', icon: '💬', label: 'Yeni Yorum' };
      case 'SolutionHighlighted': return { border: 'border-l-4 border-yellow-400', icon: '⭐', label: 'Öne Çıkarıldı' };
      case 'FollowedProblemNewSolution': return { border: 'border-l-4 border-fuchsia-500', icon: '🔔', label: 'Takip Edilen Sorun' };
      case 'FollowedProblemHighlighted': return { border: 'border-l-4 border-fuchsia-400', icon: '✨', label: 'Takip Edilen Sorun' };
      case 'FollowedProblemSolutionApproved': return { border: 'border-l-4 border-fuchsia-600', icon: '🎓', label: 'Takip Edilen Sorun' };
      case 'RoleChanged': return { border: 'border-l-4 border-indigo-500', icon: '🎖️', label: 'Yetki Güncellendi' };
      case 'AdminInfo': return { border: 'border-l-4 border-green-400', icon: 'ℹ️', label: 'Sistem Bilgisi' };
      default: return { border: 'border-l-4 border-slate-300', icon: '🔔', label: 'Bildirim' };
    }
  };

  const recent = notifications.slice(0, 6);

  // ----------------------------------------------------------------
  // MOBİL MODU — hamburger menü içine yerleşik liste
  // ----------------------------------------------------------------
  if (mobile) {
    return (
      <div className="px-5 py-3 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
            Bildirimler
            {unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="text-[10px] font-bold text-blue-500 hover:text-blue-700"
            >
              Tümünü Oku
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">Bildirim yok.</p>
        ) : (
          <div className="space-y-1">
            {recent.map((n) => {
              const { border, icon, label } = getNotificationStyle(n.type);
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n.id, n.referenceLink)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition text-sm flex items-start gap-2.5 ${border}
                    ${n.isRead ? 'bg-gray-50 text-gray-600' : 'bg-blue-50 text-gray-800 font-medium'}`}
                >
                  <span className="mt-0.5 text-base leading-none flex-shrink-0">{icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-500/70 mb-0.5">{label}</span>
                    <span className="block font-semibold truncate">{n.title}</span>
                    <span className="block text-xs text-gray-500 truncate">{n.message}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={() => { navigate('/notifications'); onClose?.(); }}
          className="mt-2 w-full text-center text-xs font-bold text-blue-500 hover:text-blue-700 py-1"
        >
          Tüm bildirimleri gör →
        </button>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // MASAÜSTÜ MODU — floating dropdown
  // ----------------------------------------------------------------
  return (
    <div ref={ref} className="relative">
      {/* Çan butonu */}
      <button
        id="notification-bell-btn"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl transition hover:bg-black/5 active:scale-95"
        aria-label="Bildirimler"
      >
        <svg
          className="w-5 h-5 text-current"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002
               6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388
               6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3
               3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Okunmamış badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white
                           text-[10px] font-black rounded-full flex items-center justify-center px-1
                           ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown paneli */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100
                     z-[200] overflow-hidden animate-fade-in-down"
        >
          {/* Başlık */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/60">
            <span className="text-xs font-black text-gray-700 uppercase tracking-widest">
              Bildirimler
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-[11px] font-bold text-blue-500 hover:text-blue-700 transition"
              >
                Tümünü Oku
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-gray-50">
            {recent.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-gray-400">
                <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002
                       6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388
                       6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3
                       3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="text-sm font-medium">Bildirim yok</span>
              </div>
            ) : (
              recent.map((n) => {
                const { border, icon, label } = getNotificationStyle(n.type);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n.id, n.referenceLink)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition hover:bg-gray-50 ${border}
                      ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                  >
                    <span className="mt-0.5 text-base leading-none flex-shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-0.5">{label}</p>
                      <p className={`text-sm truncate ${!n.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(n.createdAt).toLocaleDateString('tr-TR', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50/60">
            <button
              onClick={() => { setOpen(false); navigate('/notifications'); }}
              className="w-full text-center text-xs font-bold text-blue-600 hover:text-blue-800 transition py-0.5"
            >
              Tüm Bildirimleri Gör →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
