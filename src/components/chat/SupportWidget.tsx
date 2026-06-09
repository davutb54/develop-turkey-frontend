import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFeature } from '../../hooks/useFeature';
import { useChat } from '../../context/ChatContext';

interface SupportWidgetProps {
    /** Widget kapatıldığında çağrılır (Navbar dropdown için) */
    onClose?: () => void;
    /** Kompakt mod — Navbar dropdown'da kullanılır */
    compact?: boolean;
}

/**
 * Hiyerarşik destek talebi butonları.
 *
 * Hangi butonu göreceği capability'ye göre belirlenir:
 *  - chat.support_request  → "Destek Al"         (standart kullanıcı → general pool)
 *  - chat.escalate         → "Yöneticiye Ulaş"   (uzman → expert pool)
 *  - chat.contact_admin    → "Admine Ulaş"        (moderatör → moderator pool)
 *  - chat.contact_global_admin → "Global Admini Ara" (kurum admin → admin pool)
 */
const SupportWidget: React.FC<SupportWidgetProps> = ({ onClose, compact = false }) => {
    const { hasCapability } = useAuth();
    const supportEnabled = useFeature<boolean>('Communication.EnableSupportChat', false);
    const chatEnabled    = useFeature<boolean>('Communication.EnableChat', false);
    const { createSupport, setActiveConversation } = useChat();

    const [creating, setCreating] = useState<string | null>(null);
    const [error, setError]       = useState<string | null>(null);

    // Feature flag: ya da genel sohbet açıkken de destek çalışır
    if (!supportEnabled && !chatEnabled) return null;

    // Hangi butonlar görünür
    const canGeneral    = hasCapability('chat.support_request');
    const canEscalate   = hasCapability('chat.escalate');
    const canAdmin      = hasCapability('chat.contact_admin');
    const canGlobal     = hasCapability('chat.contact_global_admin');
    const anyButton     = canGeneral || canEscalate || canAdmin || canGlobal;

    if (!anyButton) return null;

    const handleCreate = async (category: 'general' | 'expert' | 'moderator' | 'admin') => {
        setCreating(category);
        setError(null);
        try {
            const conv = await createSupport(category);
            if (conv) {
                setActiveConversation(conv.id);
                onClose?.();
            } else {
                setError('Destek talebi oluşturulamadı.');
            }
        } catch {
            setError('Bir hata oluştu.');
        } finally {
            setCreating(null);
        }
    };

    const btnBase = compact
        ? 'w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors'
        : 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:scale-[1.01] active:scale-[0.99]';

    return (
        <div className={compact ? '' : 'space-y-2'}>
            {!compact && (
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 px-1">
                    Destek Talebi Oluştur
                </p>
            )}

            {error && (
                <p className="text-red-400 text-xs px-1">{error}</p>
            )}

            {canGeneral && (
                <button
                    onClick={() => handleCreate('general')}
                    disabled={creating === 'general'}
                    className={`${btnBase} ${compact
                        ? 'text-blue-400 hover:bg-blue-500/10'
                        : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20'
                    } disabled:opacity-40`}
                >
                    <span className="text-lg flex-shrink-0">🎧</span>
                    <div className="min-w-0">
                        <p className={compact ? '' : 'font-semibold'}>
                            {creating === 'general' ? 'Oluşturuluyor…' : 'Destek Al'}
                        </p>
                        {!compact && (
                            <p className="text-[11px] text-blue-400/70">Genel destek ekibine ulaş</p>
                        )}
                    </div>
                </button>
            )}

            {canEscalate && (
                <button
                    onClick={() => handleCreate('expert')}
                    disabled={creating === 'expert'}
                    className={`${btnBase} ${compact
                        ? 'text-purple-400 hover:bg-purple-500/10'
                        : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20'
                    } disabled:opacity-40`}
                >
                    <span className="text-lg flex-shrink-0">🏛️</span>
                    <div className="min-w-0">
                        <p className={compact ? '' : 'font-semibold'}>
                            {creating === 'expert' ? 'Oluşturuluyor…' : 'Yöneticiye Ulaş'}
                        </p>
                        {!compact && (
                            <p className="text-[11px] text-purple-400/70">Moderatör kanalına ilet</p>
                        )}
                    </div>
                </button>
            )}

            {canAdmin && (
                <button
                    onClick={() => handleCreate('moderator')}
                    disabled={creating === 'moderator'}
                    className={`${btnBase} ${compact
                        ? 'text-orange-400 hover:bg-orange-500/10'
                        : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/20'
                    } disabled:opacity-40`}
                >
                    <span className="text-lg flex-shrink-0">⚙️</span>
                    <div className="min-w-0">
                        <p className={compact ? '' : 'font-semibold'}>
                            {creating === 'moderator' ? 'Oluşturuluyor…' : 'Admine Ulaş'}
                        </p>
                        {!compact && (
                            <p className="text-[11px] text-orange-400/70">Kurum admin kanalı</p>
                        )}
                    </div>
                </button>
            )}

            {canGlobal && (
                <button
                    onClick={() => handleCreate('admin')}
                    disabled={creating === 'admin'}
                    className={`${btnBase} ${compact
                        ? 'text-red-400 hover:bg-red-500/10'
                        : 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20'
                    } disabled:opacity-40`}
                >
                    <span className="text-lg flex-shrink-0">🌐</span>
                    <div className="min-w-0">
                        <p className={compact ? '' : 'font-semibold'}>
                            {creating === 'admin' ? 'Oluşturuluyor…' : 'Global Admini Ara'}
                        </p>
                        {!compact && (
                            <p className="text-[11px] text-red-400/70">Platform geneli destek kanalı</p>
                        )}
                    </div>
                </button>
            )}
        </div>
    );
};

export default SupportWidget;
