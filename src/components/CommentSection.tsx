import { useState, useEffect } from 'react';
import { commentService } from '../services/commentService';
import type { CommentDetailDto } from '../types';
import { Link } from 'react-router-dom';

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

    // Oturum açmış kullanıcının ID'si (Kendi yorumlarını anlaması için)
    const currentUserId = parseInt(localStorage.getItem('userId') || '0');

    // Düzenleme (Edit) state'leri
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editCommentText, setEditCommentText] = useState('');

    const loadComments = async () => {
        // ARTIK BURADAKİ "if (!isOpen) return;" SATIRINI SİLDİK
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

    // YENİ: Bileşen ekrana geldiği an (isOpen'ı beklemeden) yorumları arka planda çek.
    // Böylece sayfa yüklendiğinde butonun üzerinde direkt gerçek sayı yazar.
    useEffect(() => {
        loadComments();
    }, [solutionId]);

    useEffect(() => {
        if (isOpen && comments.length === 0) {
            loadComments();
        }
    }, [isOpen]);

    // Ortak Yorum Gönderme Fonksiyonu (Ana veya Yanıt)
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
                senderId: parseInt(userId),
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
                loadComments(); // Listeyi yenile ki hiyerarşi düzgün kurulsun
            }
        } catch (err) {
            alert("Yorum gönderilemedi.");
        }
    };

    // Ortak Yorum Güncelleme Fonksiyonu
    const handleUpdateComment = async (commentId: number) => {
        try {
            // Not: Senin backend modelinde metin propertysi 'text' mi 'content' mi kontrol et.
            // DTO'nda 'text' ise burayı { id: commentId, text: editCommentText } yapabilirsin. 
            // Burada senin yapına uygun olması için 'text' ve 'content' ikisini de gönderiyorum/alıyorum.
            await commentService.update({ id: commentId, text: editCommentText, content: editCommentText } as any);

            // UI'ı anında güncelle
            setComments((prev) => prev.map(c => c.id === commentId ? { ...c, text: editCommentText } : c));
            setEditingCommentId(null); // Formu kapat
        } catch (err) {
            alert("Yorum güncellenemedi.");
        }
    };

    // Ortak Yorum Silme Fonksiyonu
    const handleDeleteComment = async (id: number) => {
        if (!window.confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;
        try {
            await commentService.delete(id);
            // UI'ı anında güncelle (Alt yorumları da otomatik olarak filtreden düşürürüz veya backend halleder)
            setComments((prev) => prev.filter(c => c.id !== id && c.parentCommentId !== id));
        } catch (err) {
            alert("Yorum silinemedi.");
        }
    };

    // Düzenleme modunu açan yardımcı fonksiyon
    const startEditing = (commentId: number, currentText: string) => {
        setEditingCommentId(commentId);
        setEditCommentText(currentText);
        setReplyingTo(null); // Eğer yanıt kutusu açıksa onu kapat ki karışmasın
    };

    // Yorumları Filtreleme (Sadece 1 seviye derinlik)
    const mainComments = comments.filter(c => c.parentCommentId === null);
    const getSubComments = (parentId: number) => comments.filter(c => c.parentCommentId === parentId);

    return (
        <div className="mt-4 border-t pt-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-sm text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-1.5 transition-colors"
            >
                <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                {isOpen ? 'Yorumları Gizle' : `Yorumlar (${comments.length})`}
            </button>

            {isOpen && (
                <div className="mt-4 bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-200 animate-fade-in-down shadow-inner">
                    {/* YORUM LİSTESİ */}
                    {loading ? (
                        <div className="flex justify-center items-center py-6">
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        <div className="space-y-5 mb-6 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                            {mainComments.length === 0 ? (
                                <div className="text-center py-6">
                                    <span className="text-4xl block mb-2 opacity-50">💭</span>
                                    <p className="text-sm font-medium text-slate-500">Henüz yorum yok. İlk yorumu sen yap!</p>
                                </div>
                            ) : (
                                mainComments.map(comment => (
                                    <div key={comment.id} className="text-sm border-b border-slate-200 pb-5 last:border-0 last:pb-0">

                                        {/* ANA YORUM */}
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-700 text-xs shrink-0">
                                                    {comment.senderUsername[0].toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <Link to={`/user/${comment.senderId}`} className="font-bold text-slate-800 hover:text-indigo-600 hover:underline text-xs">
                                                            @{comment.senderUsername}
                                                        </Link>
                                                        {comment.senderIsExpert && (
                                                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] rounded font-black uppercase tracking-wider">Uzman</span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-medium text-slate-400">
                                                        {new Date(comment.sendDate).toLocaleDateString('tr-TR')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* KULLANICI KENDİ ANA YORUMUYSA İŞLEM BUTONLARI */}
                                            {comment.senderId === currentUserId && editingCommentId !== comment.id && (
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                                                    <button onClick={() => startEditing(comment.id, comment.text)} className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 hover:text-indigo-700 transition">Düzenle</button>
                                                    <button onClick={() => handleDeleteComment(comment.id)} className="text-[10px] font-bold uppercase tracking-wider text-rose-500 hover:text-rose-700 transition">Sil</button>
                                                </div>
                                            )}
                                        </div>

                                        {/* DÜZENLEME FORMU VEYA NORMAL METİN */}
                                        {editingCommentId === comment.id ? (
                                            <div className="mt-2 mb-3 bg-white p-3 rounded-xl border border-indigo-100 shadow-sm animate-fade-in">
                                                <textarea
                                                    className="w-full text-sm border-none focus:ring-0 outline-none resize-none bg-transparent"
                                                    rows={2}
                                                    value={editCommentText}
                                                    onChange={e => setEditCommentText(e.target.value)}
                                                    autoFocus
                                                ></textarea>
                                                <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-50">
                                                    <button onClick={() => setEditingCommentId(null)} className="px-3 py-1.5 bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-slate-200 transition">İptal</button>
                                                    <button onClick={() => handleUpdateComment(comment.id)} className="px-4 py-1.5 bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-sm hover:bg-indigo-700 transition">Kaydet</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-slate-700 text-sm leading-relaxed mb-2 pl-9">{comment.text}</p>

                                                {/* YANITLA BUTONU (Ana yorumlar için) */}
                                                <button
                                                    onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setEditingCommentId(null); }}
                                                    className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-indigo-600 transition ml-9"
                                                >
                                                    {replyingTo === comment.id ? 'İptal' : 'Yanıtla'}
                                                </button>
                                            </div>
                                        )}

                                        {/* YANIT YAZMA KUTUSU */}
                                        {replyingTo === comment.id && (
                                            <form onSubmit={(e) => handleSendComment(e, comment.id)} className="flex gap-2 mt-3 ml-9 animate-fade-in-down bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                                                <input
                                                    type="text"
                                                    className="flex-1 text-sm border-none bg-transparent px-2 py-1 outline-none"
                                                    placeholder={`@${comment.senderUsername} kullanıcısına yanıt ver...`}
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    autoFocus
                                                />
                                                <button type="submit" className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm active:scale-95" disabled={!replyText.trim()}>
                                                    Gönder
                                                </button>
                                            </form>
                                        )}

                                        {/* ALT YORUMLARI LİSTELE */}
                                        <div className="ml-9 border-l-2 border-slate-200 pl-4 mt-4 space-y-4">
                                            {getSubComments(comment.id).map(sub => (
                                                <div key={sub.id} className="relative group">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-500 text-[10px] shrink-0">
                                                                {sub.senderUsername[0].toUpperCase()}
                                                            </div>
                                                            <Link to={`/user/${sub.senderId}`} className="font-bold text-slate-700 text-xs hover:text-indigo-600 hover:underline">
                                                                @{sub.senderUsername}
                                                            </Link>
                                                            <span className="text-[9px] font-medium text-slate-400">
                                                                {new Date(sub.sendDate).toLocaleDateString('tr-TR')}
                                                            </span>
                                                        </div>

                                                        {/* KULLANICI KENDİ ALT YORUMUYSA İŞLEM BUTONLARI */}
                                                        {sub.senderId === currentUserId && editingCommentId !== sub.id && (
                                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                                                                <button onClick={() => startEditing(sub.id, sub.text)} className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 hover:text-indigo-700 transition">Düzenle</button>
                                                                <button onClick={() => handleDeleteComment(sub.id)} className="text-[9px] font-bold uppercase tracking-wider text-rose-500 hover:text-rose-700 transition">Sil</button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* ALT YORUM İÇİN DÜZENLEME FORMU VEYA NORMAL METİN */}
                                                    {editingCommentId === sub.id ? (
                                                        <div className="mt-2 bg-white p-2 rounded-lg border border-indigo-100 shadow-sm animate-fade-in ml-7">
                                                            <textarea
                                                                className="w-full text-xs border-none focus:ring-0 outline-none resize-none bg-transparent"
                                                                rows={2}
                                                                value={editCommentText}
                                                                onChange={e => setEditCommentText(e.target.value)}
                                                                autoFocus
                                                            ></textarea>
                                                            <div className="flex gap-2 justify-end mt-1 pt-1 border-t border-slate-50">
                                                                <button onClick={() => setEditingCommentId(null)} className="px-2 py-1 bg-slate-100 text-slate-600 font-bold text-[9px] uppercase tracking-wider rounded md hover:bg-slate-200 transition">İptal</button>
                                                                <button onClick={() => handleUpdateComment(sub.id)} className="px-3 py-1 bg-indigo-600 text-white font-bold text-[9px] uppercase tracking-wider rounded-md shadow-sm hover:bg-indigo-700 transition">Kaydet</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-slate-600 text-xs ml-7">{sub.text}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* ANA YORUM YAZMA FORMU */}
                    <form onSubmit={(e) => handleSendComment(e, null)} className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-700 text-sm shrink-0 ml-1">
                            {/* Giriş yapmamışsa varsayılan ikon, yapmışsa baş harfi */}
                            {currentUserId ? "B" : "?"}
                        </div>
                        <input
                            type="text"
                            className="flex-1 text-sm border-none bg-transparent py-2 outline-none text-slate-700"
                            placeholder="Çözüm hakkında bir şeyler söyle..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                        />
                        <button type="submit" className="bg-indigo-600 text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-sm active:scale-95" disabled={!newComment.trim()}>
                            Gönder
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default CommentSection;