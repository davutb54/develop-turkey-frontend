import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from '@microsoft/signalr';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notificationService';
import type { Notification } from '../types';

// ---------------------------------------------------------------------------
// Tip Tanımları
// ---------------------------------------------------------------------------
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: async () => { },
  markAllAsRead: async () => { },
});

// ---------------------------------------------------------------------------
// Özel Toast Bileşeni (Discord tarzı)
// ---------------------------------------------------------------------------
const NotificationToast: React.FC<{
  title: string;
  message: string;
  referenceLink?: string | null;
  onDismiss: () => void;
}> = ({ title, message, referenceLink, onDismiss }) => (
  <div
    className="flex items-start gap-3 bg-[#1e1e2e] border border-[#6c63ff]/40 text-white
                rounded-xl shadow-2xl p-4 w-80 cursor-pointer hover:border-[#6c63ff] transition-all"
    onClick={() => {
      if (referenceLink) window.location.href = referenceLink;
      onDismiss();
    }}
  >
    {/* İkon */}
    <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-[#6c63ff]/20 flex items-center justify-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 text-[#6c63ff]"
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
    </div>

    {/* İçerik */}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-white truncate">{title}</p>
      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{message}</p>
    </div>

    {/* Kapat */}
    <button
      className="text-gray-500 hover:text-white transition-colors text-lg leading-none -mt-0.5"
      onClick={(e) => {
        e.stopPropagation();
        onDismiss();
      }}
    >
      ×
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { userId } = useAuth();
  const connectionRef = useRef<HubConnection | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // — Başlangıçta okunmamışları çek —
  useEffect(() => {
    if (!userId) return;

    notificationService
      .getUnread()
      .then((res) => {
        if (res.data.success) {
          setNotifications(res.data.data ?? []);
          setUnreadCount(res.data.data?.length ?? 0);
        }
      })
      .catch(() => { });
  }, [userId]);

  // — SignalR bağlantısı —
  useEffect(() => {
    // Yalnızca giriş yapılmışsa bağlan
    if (!userId) {
      // Bağlantı açıksa kapat
      connectionRef.current?.stop();
      connectionRef.current = null;
      return;
    }

    // Önceki bağlantı zaten kuruluysa tekrar kurma
    if (connectionRef.current) return;

    const HUB_URL = '/hubs/notification';

    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, {
        withCredentials: true,          // HttpOnly cookie (token) gönder
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    // Sunucudan gelen "ReceiveNotification" olayı
    connection.on('ReceiveNotification', (notification: Notification) => {
      // State güncelle
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Opsiyonel ses (kısa bir "ding")
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } catch {
        // Ses çalınamazsa sessizce devam et
      }

      // Toast popup — type'a göre renk
      if (notification.type === 'AdminWarning') {
        toast.error(`⚠️ ${notification.title}`, { duration: 6000, position: 'bottom-right' });
      } else if (['SolutionApproved', 'SolutionHighlighted', 'RoleChanged', 'AdminInfo'].includes(notification.type)) {
        toast.success(notification.title, { duration: 6000, position: 'bottom-right' });
      } else {
        toast.custom(
          (t) => (
            <NotificationToast
              title={notification.title}
              message={notification.message}
              referenceLink={notification.referenceLink}
              onDismiss={() => toast.dismiss(t.id)}
            />
          ),
          { duration: 6000, position: 'bottom-right' }
        );
      }
    });

    connection
      .start()
      .catch((err) => console.warn('[SignalR] Bağlantı kurulamadı:', err));

    connectionRef.current = connection;

    return () => {
      connection.stop();
      connectionRef.current = null;
    };
  }, [userId]);

  // — İşlevler —
  const markAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { }
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export const useNotifications = () => useContext(NotificationContext);
