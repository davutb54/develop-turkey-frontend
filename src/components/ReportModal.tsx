import { useState } from 'react';
import { reportService } from '../services/reportService';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetType: 'Problem' | 'Solution' | 'User';
    targetId: number;
}

const ReportModal = ({ isOpen, onClose, targetType, targetId }: ReportModalProps) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const userId = localStorage.getItem('userId');
        
        if (!userId) {
            alert("Şikayet edebilmek için giriş yapmalısınız.");
            return;
        }

        if (reason.trim().length < 10) {
            alert("Lütfen şikayet nedeninizi en az 10 karakter ile açıklayın.");
            return;
        }

        setLoading(true);
        try {
            await reportService.add({
                reporterUserId: parseInt(userId),
                targetType,
                targetId,
                reason
            });
            alert("Şikayetiniz başarıyla yönetime iletildi. Teşekkür ederiz.");
            setReason(''); // Formu temizle
            onClose();     // Modalı kapat
        } catch (err) {
            alert("Şikayet gönderilemedi. Lütfen daha sonra tekrar deneyin.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
                <div className="bg-gradient-to-r from-red-600 to-red-700 p-5 text-white flex justify-between items-center">
                    <h3 className="font-black text-lg flex items-center gap-2 tracking-wide">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        İçeriği Şikayet Et
                    </h3>
                    <button onClick={onClose} className="text-white hover:text-red-200 font-bold text-2xl leading-none">&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8">
                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                        Bu içeriğin topluluk kurallarımızı ihlal ettiğini düşünüyorsanız, lütfen nedenini detaylıca açıklayın. Gereksiz şikayetlerin hesabınızın kısıtlanmasına yol açabileceğini unutmayın.
                    </p>
                    
                    <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wider">Şikayet Nedeni / Açıklama:</label>
                    <textarea 
                        className="w-full border border-gray-300 rounded-2xl p-4 focus:ring-2 focus:ring-red-500 focus:outline-none resize-none h-32 text-sm bg-gray-50 transition-colors"
                        placeholder="Örn: Bu içerikte topluluk kurallarına aykırı / yanıltıcı bilgi bulunmaktadır..."
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        required
                    ></textarea>

                    <div className="mt-8 flex gap-3 justify-end">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition active:scale-95">
                            İptal
                        </button>
                        <button type="submit" disabled={loading} className="px-6 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-md disabled:bg-red-400 active:scale-95 flex items-center gap-2">
                            {loading ? 'Gönderiliyor...' : 'Şikayeti Gönder'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReportModal;