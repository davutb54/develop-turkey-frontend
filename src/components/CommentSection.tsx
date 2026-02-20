import { useState, useEffect } from 'react';
import { commentService } from '../services/commentService';
import type { CommentDetailDto } from '../types';
import { Link } from 'react-router-dom'; // Profile gitmek için eklendi

interface Props {
    solutionId: number;
}

const CommentSection = ({ solutionId }: Props) => {
    const [comments, setComments] = useState<CommentDetailDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    
    // Ana yorum state'i
    const [newComment, setNewComment] = useState('');
    
    // Alt yorum (Yanıt) state'leri
    const [replyingTo, setReplyingTo] = useState<number | null>(null); // Hangi yoruma yanıt veriliyor?
    const [replyText, setReplyText] = useState('');

    const loadComments = async () => {
        if (!isOpen) return;
        setLoading(true);
        try {
            const result = await commentService.getListBySolution(solutionId);
            if (result.data.success) {
                setComments(result.data.data);
            }
        } catch (err) {
            console.error("Yorumlar yüklenemedi", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && comments.length === 0) {
            loadComments();
        }
    }, [isOpen]);

    // Ortak Yorum Gönderme Fonksiyonu
    const handleSendComment = async (e: React.FormEvent, parentId: number | null = null) => {
        e.preventDefault();
        const userId = localStorage.getItem('userId');
        if (!userId) {
            alert("Yorum yapmak için giriş yapmalısınız.");
            return;
        }

        const textToSend = parentId ? replyText : newComment;
        if (!textToSend.trim()) return;

        try {
            const result = await commentService.add({
                solutionId,
                senderId: parseInt(userId), //
                text: textToSend,
                parentCommentId: parentId
            });

            if (result.data.success) {
                if (parentId) {
                    setReplyText('');
                    setReplyingTo(null); // Yanıt kutusunu kapat
                } else {
                    setNewComment('');
                }
                loadComments(); // Listeyi yenile
            }
        } catch (err) {
            alert("Yorum gönderilemedi.");
        }
    };

    // Yorumları Filtreleme (Sadece 1 seviye derinlik)
    const mainComments = comments.filter(c => c.parentCommentId === null);
    const getSubComments = (parentId: number) => comments.filter(c => c.parentCommentId === parentId);

    return (
        <div className="mt-4 border-t pt-2">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                {isOpen ? 'Yorumları Gizle' : 'Yorumları Göster'}
            </button>

            {isOpen && (
                <div className="mt-3 bg-gray-50 p-4 rounded-lg animate-fade-in-down">
                    {/* YORUM LİSTESİ */}
                    {loading ? (
                        <div className="text-xs text-gray-500 mb-4">Yükleniyor...</div>
                    ) : (
                        <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-2">
                            {mainComments.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">Henüz yorum yok. İlk yorumu sen yap!</p>
                            ) : (
                                mainComments.map(comment => (
                                    <div key={comment.id} className="text-sm border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                                        
                                        {/* ANA YORUM */}
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2">
                                                {/* İSME TIKLAYINCA PROFİLE GİT */}
                                                <Link to={`/user/${comment.senderId}`} className="font-bold text-gray-900 hover:text-blue-600 hover:underline">
                                                    {comment.senderUsername}
                                                </Link>
                                                {comment.senderIsExpert && (
                                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-sm font-bold uppercase">Uzman</span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {new Date(comment.sendDate).toLocaleDateString('tr-TR')}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 mb-2">{comment.text}</p>
                                        
                                        {/* YANITLA BUTONU (Sadece ana yorumlarda çıkar) */}
                                        <button 
                                            onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                            className="text-xs text-blue-600 font-medium hover:underline mb-2"
                                        >
                                            {replyingTo === comment.id ? 'İptal' : 'Yanıtla'}
                                        </button>

                                        {/* YANIT YAZMA KUTUSU */}
                                        {replyingTo === comment.id && (
                                            <form onSubmit={(e) => handleSendComment(e, comment.id)} className="flex gap-2 mb-3 mt-1 ml-4">
                                                <input 
                                                    type="text" 
                                                    className="flex-1 text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:border-blue-500"
                                                    placeholder={`${comment.senderUsername} kullanıcısına yanıt ver...`}
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    autoFocus
                                                />
                                                <button type="submit" className="bg-blue-600 text-white text-xs px-3 py-1 rounded-md hover:bg-blue-700" disabled={!replyText.trim()}>
                                                    Yanıtla
                                                </button>
                                            </form>
                                        )}

                                        {/* ALT YORUMLARI LİSTELE (İçeriden başlar) */}
                                        <div className="ml-6 border-l-2 border-gray-200 pl-3 mt-2 space-y-3">
                                            {getSubComments(comment.id).map(sub => (
                                                <div key={sub.id} className="text-sm bg-gray-100 p-2 rounded-md">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-2">
                                                            {/* ALT YORUM SAHİBİ PROFİL LİNKİ */}
                                                            <Link to={`/user/${sub.senderId}`} className="font-bold text-gray-800 text-xs hover:text-blue-600 hover:underline">
                                                                {sub.senderUsername}
                                                            </Link>
                                                        </div>
                                                        <span className="text-[10px] text-gray-400">
                                                            {new Date(sub.sendDate).toLocaleDateString('tr-TR')}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-600 text-xs">{sub.text}</p>
                                                    {/* Alt yoruma "Yanıtla" butonu koymadığımız için sonsuz döngü engellendi */}
                                                </div>
                                            ))}
                                        </div>

                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* ANA YORUM YAZMA FORMU */}
                    <form onSubmit={(e) => handleSendComment(e, null)} className="flex gap-2 border-t pt-4">
                        <input 
                            type="text" 
                            className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Ana yoruma katkıda bulun..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                        />
                        <button type="submit" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700 transition" disabled={!newComment.trim()}>
                            Gönder
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default CommentSection;