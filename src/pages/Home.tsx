import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ReportModal from '../components/ReportModal';
import { problemService } from '../services/problemService';
import { solutionService } from '../services/solutionService';
import { topicService } from '../services/topicService';
import { constantService } from '../services/constantService';
import type { ProblemDetailDto, Topic, City } from '../types';
import SearchableSelect from '../components/SearchableSelect';
import { useAuth } from '../context/AuthContext';
import { useCapability } from '../hooks/useCapability';
import { getProfileImageUrl } from '../utils/imageUtils';
import { actionService } from '../services/actionService';
import { useFeature, useInstitution, useTerminology } from '../hooks/useFeature';
import MentionText from '../components/MentionText';
import SocialShare from '../components/SocialShare';
import api from '../services/api';
import type { IDataResult } from '../types';

interface AnnouncementDto {
    id: number;
    title: string;
    content: string;
    targetGroup: string;
    link?: string;
    expiresAt?: string;
}

const Home = () => {
    const infiniteScrollEnabled = useFeature<boolean>('UX.InfiniteScrollEnabled', true);
    const enableFollowSystem = useFeature<boolean>('Social.EnableFollowSystem', true);
    const enableReports = useFeature<boolean>('Moderation.EnableReportSystem', true);
    const enableCustomHierarchy = useFeature<boolean>('Content.EnableCustomHierarchy', false);
    const { cityLabel } = useTerminology();
    const institution = useInstitution();
    const enableSharing = useFeature<boolean>('Social.EnableSharing', true);

    // --- DUYURULAR ---
    const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([]);
    const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<number>>(new Set());

    // --- VERİ STATE'LERİ (SAYFALAMA İÇİN) ---
    const [feedProblems, setFeedProblems] = useState<ProblemDetailDto[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [totalPages, setTotalPages] = useState(1);

    // VİTRİN STATE'LERİ (Filtrelerden bağımsız, en başta bir kere yüklenir)
    const [highlightedProblems, setHighlightedProblems] = useState<any[]>([]);
    const [highlightedSolutions, setHighlightedSolutions] = useState<any[]>([]);
    const [sliderView, setSliderView] = useState<'problem' | 'solution'>('problem');

    const [topics, setTopics] = useState<Topic[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [loading, setLoading] = useState(true);

    // --- FİLTRE VE UI STATE'LERİ ---
    const [activeCategory, setActiveCategory] = useState<number | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState({ searchText: '', cityCode: '', customHierarchyId: '' });
    const [followedTopicIds, setFollowedTopicIds] = useState<number[]>([]);

    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [reportTarget, setReportTarget] = useState<{ type: 'Problem', id: number } | null>(null);

    const { userId } = useAuth();
    const currentUserId = userId || 0;

    // Capability guards
    const canFollowTopic        = useCapability('user.topic_follow');
    const canDeleteOwnProblem   = useCapability('user.problem_delete_own');
    const canReportContent      = useCapability('user.content_report');


    // SAYFA İLK YÜKLENDİĞİNDE SABİT VERİLERİ (VİTRİN, KATEGORİ) ÇEK
    useEffect(() => {
        loadInitialData();
        api.get<IDataResult<AnnouncementDto[]>>('/announcements')
            .then(r => { if (r.data?.success) setAnnouncements(r.data.data ?? []); })
            .catch(() => {});
    }, []);

    // KATEGORİ VEYA ŞEHİR DEĞİŞTİĞİNDE SAYFAYI 1'E ÇEKİP LİSTEYİ YENİLE
    useEffect(() => {
        if (page !== 1) {
            setPage(1); // Bu state değişimi aşağıdaki useEffect'i tetikleyecek
        } else {
            fetchFeedProblems(1); // Zaten 1. sayfadaysak direkt yenile
        }
        setHasMore(true);
    }, [activeCategory, filters.cityCode, filters.customHierarchyId]);

    // SAYFA (PAGE) STATE'İ DEĞİŞTİĞİNDE (Daha Fazla Yükle tıklandığında) VERİ ÇEK
    useEffect(() => {
        if (page !== 1) {
            fetchFeedProblems(page);
        }
    }, [page]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            // Vitrindeki "Öne Çıkanlar"ı bulabilmek için ilk yüklemede pageSize'ı yüksek tutuyoruz (Örn: 100)
            const [topicsRes, citiesRes, allProbsRes, allSolsRes] = await Promise.all([
                topicService.getAllActive(),
                constantService.getCities(),
                problemService.getList({ page: 1, pageSize: 100 }),
                solutionService.getAll()
            ]);

            if (topicsRes.data.success) setTopics(topicsRes.data.data);
            if (citiesRes.data.success) setCities(citiesRes.data.data);

            if (allProbsRes.data.success) {
                setHighlightedProblems(
                    allProbsRes.data.data.filter((p: any) => p.isHighlighted && !p.isDeleted).map((p: any) => ({ ...p, _type: 'Problem' }))
                );
            }
            if (allSolsRes.data.success) {
                setHighlightedSolutions(
                    allSolsRes.data.data.filter((s: any) => s.isHighlighted && !s.isDeleted).map((s: any) => ({ ...s, _type: 'Solution' }))
                );
            }

            if (currentUserId !== 0 && topicsRes.data.success) {
                Promise.all(topicsRes.data.data.map((t: any) => actionService.checkTopicFollow(t.id)))
                    .then(results => {
                        const followedIds = topicsRes.data.data
                            .filter((_: any, i: number) => results[i]?.data?.isFollowing)
                            .map((t: any) => t.id);
                        setFollowedTopicIds(followedIds);
                    })
                    .catch(() => { });
            }

            // İlk sayfa verisini getir
            await fetchFeedProblems(1);
        } catch (err) { console.error("Veriler yüklenirken hata:", err); }
        finally { setLoading(false); }
    };

    const fetchFeedProblems = async (currentPage: number) => {
        if (currentPage === 1) setLoading(true);
        else setIsLoadingMore(true);

        try {
            // Artık DTO mantığıyla doğrudan objeyi yolluyoruz
            const result = await problemService.getList({
                topicId: activeCategory || undefined,
                cityCode: filters.cityCode ? parseInt(filters.cityCode) : undefined,
                customHierarchyId: filters.customHierarchyId ? parseInt(filters.customHierarchyId) : undefined,
                searchText: filters.searchText || undefined,
                page: currentPage,
                pageSize: 10 // Her sayfada 10 veri gelsin
            });

            if (result.data.success) {
                // Frontend'de sıralama (sort) YAMYORUZ. Backend bizim için en popülerleri sıralayıp gönderdi!
                const incomingProblems = result.data.data;

                if (currentPage === 1) {
                    setFeedProblems(incomingProblems); // Yeni aramaysa listeyi temizle baştan yaz
                } else {
                    setFeedProblems(prev => [...prev, ...incomingProblems]); // Sayfa atladıysa alta ekle
                }

                // Gelen veri 10'dan azsa demek ki veritabanında başka veri kalmadı.
                setHasMore(incomingProblems.length === 10);
                // Klasik sayfalama için toplam sayfa tahmini
                if (incomingProblems.length < 10) {
                    setTotalPages(currentPage);
                } else {
                    setTotalPages(currentPage + 1);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setIsLoadingMore(false);
        }
    };

    const handleToggleTopicFollow = async (topicId: number) => {
        if (!currentUserId || currentUserId === 0) {
            alert("Kategori takip etmek için giriş yapmalısınız.");
            return;
        }
        const isTopicFollowed = followedTopicIds.includes(topicId);

        if (isTopicFollowed) {
            setFollowedTopicIds(prev => prev.filter(id => id !== topicId));
        } else {
            setFollowedTopicIds(prev => [...prev, topicId]);
        }

        try {
            await actionService.toggleTopicFollow(topicId);
        } catch {
            if (isTopicFollowed) {
                setFollowedTopicIds(prev => [...prev, topicId]);
            } else {
                setFollowedTopicIds(prev => prev.filter(id => id !== topicId));
            }
        }
    };

    const handleDeleteOwnProblem = async (id: number) => {
        if (!window.confirm("Bu sorunu silmek istediğinize emin misiniz?")) return;
        try {
            await problemService.delete(id);
            setFeedProblems(prev => prev.filter(p => p.id !== id)); // Ekranda anında kaybolsun
            setOpenMenuId(null);
        } catch {
            alert("Sorun silinemedi.");
        }
    };

    // ARAMA YAPILDIĞINDA
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (page === 1) fetchFeedProblems(1);
        else setPage(1);
        setHasMore(true);
    };

    const handleProblemClick = (problemId: number) => {
        problemService.incrementView(problemId).catch(() => { });
    };

    // VİTRİN SLIDER İÇERİĞİ
    const itemsToDisplay = sliderView === 'problem' ? highlightedProblems : highlightedSolutions;
    const infiniteSliderItems = itemsToDisplay.length > 0 ? [...itemsToDisplay, ...itemsToDisplay, ...itemsToDisplay, ...itemsToDisplay, ...itemsToDisplay] : [];

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#E0E7FF]">
            <style>{`
        @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(calc(-320px * ${itemsToDisplay.length})); } }
        .animate-scroll { animation: scroll ${Math.max(itemsToDisplay.length * 5, 20)}s linear infinite; }
        .slider-track:hover .animate-scroll { animation-play-state: paused; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

            <Navbar />

            {/* DUYURU BANNER'LARI */}
            {announcements
                .filter(a => !dismissedAnnouncements.has(a.id))
                .map(a => (
                    <div key={a.id} className="bg-indigo-600 text-white px-4 py-3 flex items-start gap-3">
                        <span className="text-lg flex-shrink-0">📢</span>
                        <div className="flex-1 min-w-0">
                            <span className="font-semibold mr-2">{a.title}</span>
                            <span className="text-indigo-100 text-sm">{a.content}</span>
                            {a.link && (
                                <a href={a.link} className="ml-2 underline text-indigo-200 text-sm" target="_blank" rel="noreferrer">
                                    Detay →
                                </a>
                            )}
                        </div>
                        <button
                            onClick={() => setDismissedAnnouncements(prev => new Set([...prev, a.id]))}
                            className="flex-shrink-0 text-indigo-200 hover:text-white text-lg leading-none"
                            aria-label="Kapat"
                        >
                            ×
                        </button>
                    </div>
                ))
            }

            {/* ÜST VİTRİN (SLIDER) */}
            <div className="bg-[#0B1120] py-8 border-b border-indigo-900/50 overflow-hidden relative shadow-2xl">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent pointer-events-none"></div>

                <div className="max-w-[1400px] mx-auto px-6 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
                        <h2 className="text-white font-black tracking-[0.2em] text-sm uppercase bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-indigo-100">Vitrin</h2>
                    </div>

                    <div className="bg-white/10 p-1.5 rounded-xl backdrop-blur-md flex items-center border border-white/10 shadow-lg">
                        <button
                            onClick={() => setSliderView('problem')}
                            className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${sliderView === 'problem' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                        >
                            🔥 Öne Çıkan Sorunlar
                        </button>
                        <button
                            onClick={() => setSliderView('solution')}
                            className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${sliderView === 'solution' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                        >
                            💡 Öne Çıkan Çözümler
                        </button>
                    </div>
                </div>

                <div className="slider-track flex w-full relative z-10">
                    {infiniteSliderItems.length > 0 ? (
                        <div className="flex gap-5 animate-scroll whitespace-nowrap px-4 py-2">
                            {infiniteSliderItems.map((item: any, idx: number) => (
                                <Link
                                    to={item._type === 'Problem' ? `/problem/${item.publicId || item.id}` : `/problem/${item.problemPublicId || item.problemId}?solution=${item.publicId || item.id}`}
                                    key={`slide-${item.id}-${idx}`}
                                    onClick={() => item._type === 'Problem' && handleProblemClick(item.id)}
                                    className="w-[260px] sm:w-[300px] shrink-0 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-blue-400/30 rounded-3xl p-5 transition-all duration-300 group flex flex-col h-[160px] sm:h-[170px] shadow-xl hover:shadow-blue-900/20"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider ${item._type === 'Problem' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20' : 'bg-green-500/20 text-green-400 border border-green-500/20'}`}>
                                            {item._type === 'Problem' ? '🔥 Sorun' : '💡 Çözüm'}
                                        </span>
                                        <span className="text-blue-200/70 text-xs font-bold bg-blue-900/30 px-2 py-0.5 rounded-full">@{item.senderUsername}</span>
                                    </div>
                                    <h3 className="text-gray-100 font-bold text-sm leading-relaxed line-clamp-2 mb-auto whitespace-normal group-hover:text-white transition">{item.title}</h3>

                                    <div className="mt-3 flex items-center justify-between text-xs font-medium text-gray-400">
                                        <span>Tarih: {new Date(item.sendDate).toLocaleDateString('tr-TR')}</span>
                                        <div className="flex items-center gap-1 text-white group-hover:text-blue-300 transition">
                                            <span>İncele</span>
                                            <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="w-full text-center py-8 text-gray-500 text-sm font-bold uppercase tracking-widest">
                            Bu kategoride henüz öne çıkan içerik yok.
                        </div>
                    )}
                </div>
            </div>

            {/* ALT KISIM: ANA AKIŞ VE FİLTRELER */}
            <main className="max-w-[1000px] mx-auto py-10 px-4 sm:px-6">

                {/* YATAY KATEGORİ MENÜSÜ */}
                <div className="flex items-center gap-3 mb-8 pb-4 overflow-x-auto scrollbar-hide border-b border-indigo-100/60">
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={`shrink-0 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${activeCategory === null ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 border-transparent' : 'bg-white text-gray-600 border border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'}`}
                    >
                        Tümü
                    </button>
                    {topics.map(t => (
                        <div key={t.id} className={`flex items-center shrink-0 rounded-full border transition-all duration-300 ${activeCategory === t.id ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-blue-50'}`}>
                            <button
                                onClick={() => setActiveCategory(t.id)}
                                className={`pl-6 pr-2 py-2.5 text-sm font-bold outline-none ${activeCategory === t.id ? 'text-white' : 'hover:text-blue-600'}`}
                            >
                                {t.name}
                            </button>
                            {enableFollowSystem && canFollowTopic && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleToggleTopicFollow(t.id); }}
                                    className={`pr-4 pl-2 py-2.5 text-sm outline-none hover:scale-110 transition-transform ${activeCategory === t.id ? 'text-white' : ''}`}
                                    title={followedTopicIds.includes(t.id) ? "Kategori takibini bırak" : "Bu kategoriyi takip et"}
                                >
                                    {followedTopicIds.includes(t.id) ? '🔔' : '🔕'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* DETAYLI FİLTRE & BAŞLIK */}
                <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                    <h1 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-600 p-2 rounded-xl"><svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></span>
                        Güncel Akış
                    </h1>
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`flex items-center gap-2 text-sm font-bold px-4 sm:px-5 py-2.5 rounded-xl transition-all shadow-sm ${isFilterOpen ? 'bg-indigo-900 text-white shadow-indigo-900/20' : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100'}`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                        {isFilterOpen ? 'Filtreleri Kapat' : 'Detaylı Ara'}
                    </button>
                </div>

                {/* RENKLİ FİLTRE PANELİ */}
                {isFilterOpen && (
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-3xl border border-indigo-100 shadow-inner mb-8 animate-fade-in-down">
                        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-5 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-black text-indigo-800 uppercase tracking-wider mb-2">Kelime Ara</label>
                                <input type="text" placeholder="Hangi sorunu arıyorsun?" className="w-full px-5 py-3.5 bg-white border border-indigo-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition" value={filters.searchText} onChange={e => setFilters({ ...filters, searchText: e.target.value })} />
                            </div>
                            {/* Şehir / Hiyerarşi Filtresi */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 pl-1">{cityLabel}</label>
                                {enableCustomHierarchy ? (
                                    <SearchableSelect
                                        options={(() => {
                                            try {
                                                const items = JSON.parse(institution?.customHierarchyJson || '[]') as string[];
                                                return items.map((item, idx) => ({ value: idx, label: item }));
                                            } catch { return []; }
                                        })()}
                                        value={filters.customHierarchyId}
                                        onChange={(val) => setFilters(prev => ({ ...prev, customHierarchyId: String(val) }))}
                                        placeholder={`${cityLabel} Seçiniz`}
                                    />
                                ) : (
                                    <SearchableSelect
                                        options={cities.map(c => ({ value: c.value, label: c.text }))}
                                        value={filters.cityCode}
                                        onChange={(val) => setFilters(prev => ({ ...prev, cityCode: String(val) }))}
                                        placeholder={`${cityLabel} Seçiniz`}
                                    />
                                )}
                            </div>
                            <button type="submit" className="w-full md:w-auto px-10 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/30">Filtrele</button>
                        </form>
                    </div>
                )}

                {/* LİSTELEME (FEED) */}
                {loading && page === 1 ? (
                    <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600"></div></div>
                ) : feedProblems.length === 0 ? (
                    <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-16 text-center border border-indigo-50 shadow-sm">
                        <div className="text-6xl mb-6 drop-shadow-sm">🏜️</div>
                        <h3 className="text-2xl font-black text-indigo-950">Sessizlik...</h3>
                        <p className="text-indigo-600/70 font-medium mt-2">Bu filtrelere veya kategoriye uygun bir sorun bulunamadı.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {feedProblems.map((prob: any) => {
                            const isResolved = prob.isResolvedByExpert || prob.isResolved;

                            return (
                                <div key={prob.id} className={`rounded-3xl shadow-sm transition-all duration-300 hover:shadow-xl relative overflow-hidden ${isResolved ? 'bg-gradient-to-br from-white to-green-50/40 border-2 border-green-300 ring-4 ring-green-50 hover:shadow-green-900/10' : 'bg-white/90 backdrop-blur-sm border border-indigo-50 hover:border-indigo-200 hover:shadow-indigo-900/5'}`}>

                                    {/* UZMAN ÇÖZÜMÜ ROZETİ */}
                                    {isResolved && (
                                        <div className="absolute top-0 right-0 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] font-black tracking-widest uppercase px-5 py-2 rounded-bl-2xl z-20 flex items-center gap-1.5 shadow-lg shadow-green-500/30">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            Çözüldü
                                        </div>
                                    )}

                                    <div className="p-7 flex justify-between items-start relative z-10">
                                        <div className="flex items-center gap-4">

                                            {/* PROFIL FOTOĞRAFI VEYA HARF */}
                                            <Link to={`/user/${prob.senderUsername}`} className="h-14 w-14 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-100 to-blue-50 flex items-center justify-center font-black text-indigo-700 text-xl shadow-inner border border-indigo-200/50 shrink-0 ring-2 ring-white hover:ring-indigo-300 transition">
                                                {prob.senderImageUrl ? (
                                                    <img
                                                        src={getProfileImageUrl(prob.senderImageUrl)}
                                                        alt={prob.senderUsername}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + prob.senderUsername + '&background=random' }}
                                                    />
                                                ) : (
                                                    <span>{prob.senderUsername[0].toUpperCase()}</span>
                                                )}
                                            </Link>

                                            <div>
                                                <Link to={`/user/${prob.senderUsername}`} className="font-bold text-gray-900 text-base hover:text-indigo-600 transition">@{prob.senderUsername}</Link>
                                                <div className="text-xs font-medium text-gray-500 mt-1 flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    {new Date(prob.sendDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                                                    <span className="text-indigo-200 mx-1">•</span>
                                                    <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    {(() => {
                                                        if (prob.customHierarchyId !== null && institution?.customHierarchyJson) {
                                                            try {
                                                                const items = JSON.parse(institution.customHierarchyJson) as string[];
                                                                return items[prob.customHierarchyId] || prob.cityName;
                                                            } catch { return prob.cityName; }
                                                        }
                                                        return prob.cityName;
                                                    })()}
                                                </div>
                                            </div>
                                        </div>

                                        {/* ÜÇ NOKTA MENÜSÜ - İşlem yetkisi varsa VEYA paylaşım aktifse göster */}
                                        {((enableReports && canReportContent && currentUserId !== prob.senderId && currentUserId !== 0) || (prob.senderId === currentUserId && canDeleteOwnProblem) || enableSharing) && (
                                            <div className="relative">
                                                <button onClick={() => setOpenMenuId(openMenuId === prob.id ? null : prob.id)} className="p-2 text-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition">
                                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                                </button>
                                                {openMenuId === prob.id && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-indigo-50 py-2 z-50 animate-fade-in-down">
                                                        <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)}></div>
                                                        <div className="relative z-50">
                                                            {/* BAŞKASININ SORUNUYSA: ŞİKAYET ET */}
                                                            {enableReports && canReportContent && currentUserId !== prob.senderId && currentUserId !== 0 && (
                                                                <button onClick={() => { setReportTarget({ type: 'Problem', id: prob.id }); setOpenMenuId(null); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                                    Şikayet Et
                                                                </button>
                                                            )}

                                                            {/* KENDİ SORUNUYSA: DÜZENLE/SİL */}
                                                            {prob.senderId === currentUserId && (
                                                                <>
                                                                    {canDeleteOwnProblem && (
                                                                        <Link
                                                                            to="/profile"
                                                                            className="block w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                                            Düzenle
                                                                        </Link>
                                                                    )}
                                                                    {canDeleteOwnProblem && (
                                                                        <button onClick={() => handleDeleteOwnProblem(prob.id)} className="w-full text-left px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors">
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                            Sorunu Sil
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}

                                                            {enableSharing && (
                                                                <SocialShare
                                                                    variant="menuItem"
                                                                    url={`/problem/${prob.publicId || prob.id}`}
                                                                    title={prob.title}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* KART İÇERİĞİ */}
                                    <div className="px-7 pb-4">
                                        <div className="flex flex-wrap gap-1.5 my-2">
                                            {prob.topics && prob.topics.length > 0 ? (
                                                prob.topics.map((t: { id: number, name: string }) => (
                                                    <span key={t.id} className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                                                        {t.name}
                                                        {enableFollowSystem && canFollowTopic && (
                                                            <button
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleTopicFollow(t.id); }}
                                                                className="hover:scale-110 transition-transform focus:outline-none"
                                                                title={followedTopicIds.includes(t.id) ? "Kategori takibini bırak" : "Bu kategoriyi takip et"}
                                                            >
                                                                {followedTopicIds.includes(t.id) ? '🔔' : '🔕'}
                                                            </button>
                                                        )}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="bg-gray-50 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                                    Genel
                                                </span>
                                            )}
                                        </div>
                                        <Link to={`/problem/${prob.publicId || prob.id}`} onClick={() => handleProblemClick(prob.id)} className="block group mb-3">
                                            <h3 className="text-xl sm:text-2xl font-black text-gray-900 group-hover:text-indigo-600 transition duration-300 break-words line-clamp-2 sm:line-clamp-none">{prob.title}</h3>
                                        </Link>

                                        <MentionText
                                            text={prob.description}
                                            className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3 block"
                                        />

                                        <Link to={`/problem/${prob.publicId || prob.id}`} onClick={() => handleProblemClick(prob.id)} className="block group">
                                            {prob.imageUrl && (
                                                <div className="w-full h-[250px] sm:h-[320px] bg-indigo-50/50 rounded-2xl overflow-hidden mb-6 border border-indigo-100/50 shadow-inner">
                                                    <img src={`/uploads/problems/${prob.imageUrl}`} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
                                                </div>
                                            )}
                                        </Link>
                                    </div>

                                    {/* KART ALTI BİLGİ VE BUTON */}
                                    <div className={`px-7 py-5 flex items-center justify-between border-t rounded-b-3xl ${isResolved ? 'bg-green-100/30 border-green-200' : 'bg-indigo-50/30 border-indigo-50'}`}>
                                        <div className="flex gap-4 sm:gap-6">
                                            <div className="flex items-center gap-2 text-indigo-900/60 text-sm font-bold bg-white px-3 py-1.5 rounded-xl shadow-sm border border-indigo-50" title="Görüntülenme">
                                                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                {prob.viewCount || 0}
                                            </div>
                                            <div className="flex items-center gap-2 text-indigo-900/60 text-sm font-bold bg-white px-3 py-1.5 rounded-xl shadow-sm border border-indigo-50" title="Çözümler">
                                                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                {prob.solutionCount || 0}
                                            </div>
                                        </div>
                                        <Link to={`/problem/${prob.publicId || prob.id}`} onClick={() => handleProblemClick(prob.id)} className={`font-bold text-sm px-5 sm:px-6 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 ${isResolved ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/20' : 'bg-white border border-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600'}`}>
                                            Detaylar
                                            <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                        </Link>
                                    </div>

                                </div>
                            )
                        })}

                        {/* SAYFALAMA */}
                        {feedProblems.length > 0 && (
                            infiniteScrollEnabled ? (
                                /* Infinite Scroll: "Daha Fazla Yükle" Butonu */
                                hasMore && (
                                    <div className="flex justify-center mt-12 pb-4">
                                        <button
                                            onClick={() => setPage(prev => prev + 1)}
                                            disabled={isLoadingMore}
                                            className="group relative px-8 py-3.5 bg-white border-2 border-indigo-100 text-indigo-600 font-black rounded-2xl shadow-sm hover:border-indigo-600 hover:bg-indigo-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 overflow-hidden"
                                        >
                                            {isLoadingMore ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                    Yükleniyor...
                                                </>
                                            ) : (
                                                <>
                                                    Daha Fazla Sorun Göster
                                                    <svg className="w-5 h-5 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )
                            ) : (
                                /* Klasik Sayfalama: Sayfa Numaraları */
                                <div className="flex justify-center items-center gap-4 mt-12 pb-4">
                                    <button
                                        onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                        disabled={page === 1 || isLoadingMore}
                                        className="px-5 py-2.5 bg-white border-2 border-indigo-100 text-indigo-600 font-bold rounded-xl shadow-sm hover:border-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        ← Önceki
                                    </button>
                                    <span className="text-sm font-bold text-indigo-900 bg-indigo-50 px-4 py-2 rounded-xl">
                                        Sayfa {page} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => { if (hasMore) setPage(prev => prev + 1); }}
                                        disabled={!hasMore || isLoadingMore}
                                        className="px-5 py-2.5 bg-white border-2 border-indigo-100 text-indigo-600 font-bold rounded-xl shadow-sm hover:border-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Sonraki →
                                    </button>
                                </div>
                            )
                        )}
                    </div>
                )}

                {/* --- MOBİL YÜZEN "SORUN EKLE" BUTONU (FLOATING ACTION BUTTON) --- */}
                {/* sm:hidden ile sadece mobilde görünür. z-50 ile her şeyin üstünde durur. */}
                <Link
                    to="/add-problem"
                    className="sm:hidden fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(79,70,229,0.4)] hover:scale-105 active:scale-95 transition-transform"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                </Link>
            </main>

            {/* ŞİKAYET MODALI */}
            {enableReports && reportTarget && (
                <ReportModal isOpen={!!reportTarget} onClose={() => setReportTarget(null)} targetType={reportTarget.type} targetId={reportTarget.id} />
            )}
        </div>
    );
};

export default Home;