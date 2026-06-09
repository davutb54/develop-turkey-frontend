import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { feedbackService } from '../../../services/feedbackService';
import { useCapability } from '../../../hooks/useCapability';

const FEEDBACK_PAGE_SIZE = 10;

export default function FeedbacksTab() {
    const canRead = useCapability('admin.feedback_read');
    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [feedbackLoading, setFeedbackLoading] = useState(true);
    const [feedbackSearch, setFeedbackSearch] = useState('');
    const [feedbackReadFilter, setFeedbackReadFilter] = useState<string>('');
    const [feedbackPage, setFeedbackPage] = useState(1);
    const [feedbackTotalPages, setFeedbackTotalPages] = useState(1);
    const [feedbackTotalCount, setFeedbackTotalCount] = useState(0);

    useEffect(() => {
        fetchFeedbacks(1);
    }, []);

    const fetchFeedbacks = async (page: number) => {
        setFeedbackLoading(true);
        try {
            const isReadParam = feedbackReadFilter === 'read' ? true
                : feedbackReadFilter === 'unread' ? false
                : undefined;

            const res = await feedbackService.getAllPaged({
                page,
                pageSize: FEEDBACK_PAGE_SIZE,
                searchText: feedbackSearch || undefined,
                isRead: isReadParam,
            });
            if (res.data.success) {
                setFeedbacks(res.data.data);
                setFeedbackTotalPages(res.data.totalPages || 1);
                setFeedbackTotalCount(res.data.totalCount || 0);
                setFeedbackPage(page);
            }
        } catch (err) {
            console.error('Feedbackler yüklenemedi', err);
        } finally {
            setFeedbackLoading(false);
        }
    };

    // Re-fetch when readFilter changes (but not on first render — that's handled by the initial useEffect)
    const handleReadFilterChange = (val: string) => {
        setFeedbackReadFilter(val);
        setTimeout(() => fetchFeedbacks(1), 0);
    };

    return (
        <div className="p-6 md:p-10 animate-fade-in flex flex-col h-full">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">İstek ve Öneriler</h1>
                    <p className="text-slate-500 text-sm mt-1">Kullanıcıların gönderdiği geri bildirimler.</p>
                </div>
                <span className="bg-amber-50 text-amber-700 px-4 py-1.5 rounded-lg text-sm font-bold border border-amber-100 shadow-sm">
                    {feedbackTotalCount} Mesaj
                </span>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <input
                    type="text"
                    placeholder="Konu veya mesaj içinde ara..."
                    className="flex-1 border border-slate-200 shadow-sm p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    value={feedbackSearch}
                    onChange={e => setFeedbackSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') fetchFeedbacks(1); }}
                />
                <select
                    className="border border-slate-200 shadow-sm p-3 rounded-xl text-sm bg-white font-medium text-slate-700"
                    value={feedbackReadFilter}
                    onChange={e => handleReadFilterChange(e.target.value)}
                >
                    <option value="">Tüm Mesajlar</option>
                    <option value="unread">Sadece Okunmamışlar</option>
                    <option value="read">Sadece Okunanlar</option>
                </select>
                <button
                    onClick={() => fetchFeedbacks(1)}
                    className="px-5 py-3 bg-slate-800 text-white font-bold rounded-xl text-sm hover:bg-black transition shadow-md"
                >
                    Ara
                </button>
            </div>

            {/* Message list */}
            {feedbackLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-amber-500" />
                </div>
            ) : (
                <div className="space-y-4 overflow-y-auto max-h-[540px] pr-2 flex-1">
                    {feedbacks.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 font-medium">Henüz hiçbir istek veya öneri gelmedi.</div>
                    ) : (
                        feedbacks.map(fb => (
                            <div
                                key={fb.id}
                                className={`p-6 rounded-3xl border transition shadow-sm relative overflow-hidden ${fb.isRead ? 'bg-white border-slate-200 opacity-80 hover:opacity-100' : 'bg-amber-50/40 border-amber-200'}`}
                            >
                                {!fb.isRead && <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}

                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                    <div>
                                        <h4 className="text-lg font-black text-slate-800">{fb.title}</h4>
                                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                            <Link to={`/user/${fb.userName}`} target="_blank" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition">@{fb.userName}</Link>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-[10px] font-medium text-slate-500">{fb.userEmail}</span>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-[10px] font-medium text-slate-500">{new Date(fb.sendDate).toLocaleString('tr-TR')}</span>
                                        </div>
                                    </div>
                                    {!fb.isRead && canRead && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await feedbackService.markAsRead(fb.id);
                                                    setFeedbacks(prev => prev.map(item => item.id === fb.id ? { ...item, isRead: true } : item));
                                                } catch {
                                                    alert('İşlem başarısız.');
                                                }
                                            }}
                                            className="shrink-0 px-4 py-2 bg-white border border-amber-200 text-amber-600 font-black text-[10px] uppercase tracking-wider rounded-xl shadow-sm hover:bg-amber-50 hover:border-amber-300 transition active:scale-95 flex items-center gap-1.5"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Okundu İşaretle
                                        </button>
                                    )}
                                </div>
                                <div className="bg-white p-5 rounded-2xl text-sm text-slate-700 leading-relaxed border border-slate-100 shadow-sm whitespace-pre-wrap">
                                    {fb.message}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4 px-2">
                <button
                    onClick={() => fetchFeedbacks(feedbackPage - 1)}
                    disabled={feedbackPage <= 1}
                    className="px-4 py-2 bg-white border rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-sm"
                >
                    Önceki
                </button>
                <span className="text-sm font-bold text-slate-600">
                    Sayfa {feedbackPage} / {feedbackTotalPages}
                    <span className="ml-2 text-slate-400 font-normal">({feedbackTotalCount} mesaj)</span>
                </span>
                <button
                    onClick={() => fetchFeedbacks(feedbackPage + 1)}
                    disabled={feedbackPage >= feedbackTotalPages}
                    className="px-4 py-2 bg-white border rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-sm"
                >
                    Sonraki
                </button>
            </div>
        </div>
    );
}
