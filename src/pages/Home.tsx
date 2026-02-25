import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ReportModal from '../components/ReportModal';
import { problemService } from '../services/problemService';
import { solutionService } from '../services/solutionService';
import { topicService } from '../services/topicService';
import { constantService } from '../services/constantService';
import type { ProblemDetailDto, Topic, City } from '../types';

const Home = () => {
  // --- VERİ STATE'LERİ (SAYFALAMA İÇİN) ---
  const [feedProblems, setFeedProblems] = useState<ProblemDetailDto[]>([]); 
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
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
  const [filters, setFilters] = useState({ searchText: '', cityCode: '' });
  
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [reportTarget, setReportTarget] = useState<{type: 'Problem', id: number} | null>(null);

  const currentUserId = parseInt(localStorage.getItem('userId') || '0');

  // SAYFA İLK YÜKLENDİĞİNDE SABİT VERİLERİ (VİTRİN, KATEGORİ) ÇEK
  useEffect(() => {
      loadInitialData();
  }, []);

  // KATEGORİ VEYA ŞEHİR DEĞİŞTİĞİNDE SAYFAYI 1'E ÇEKİP LİSTEYİ YENİLE
  useEffect(() => {
      if (page !== 1) {
          setPage(1); // Bu state değişimi aşağıdaki useEffect'i tetikleyecek
      } else {
          fetchFeedProblems(1); // Zaten 1. sayfadaysak direkt yenile
      }
      setHasMore(true);
  }, [activeCategory, filters.cityCode]);

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
              topicService.getAll(),
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
          }
      } catch (err) { 
          console.error(err); 
      } finally { 
          setLoading(false); 
          setIsLoadingMore(false);
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
      problemService.incrementView(problemId).catch(() => {});
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
                              to={`/problem/${item._type === 'Problem' ? item.id : item.problemId}`} 
                              key={`slide-${item.id}-${idx}`}
                              onClick={() => item._type === 'Problem' && handleProblemClick(item.id)}
                              className="w-[300px] shrink-0 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-blue-400/30 rounded-3xl p-5 transition-all duration-300 group flex flex-col h-[170px] shadow-xl hover:shadow-blue-900/20"
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
                <button 
                    key={t.id} onClick={() => setActiveCategory(t.id)}
                    className={`shrink-0 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${activeCategory === t.id ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 border-transparent' : 'bg-white text-gray-600 border border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'}`}
                >
                    {t.name}
                </button>
            ))}
        </div>

        {/* DETAYLI FİLTRE & BAŞLIK */}
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 p-2 rounded-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></span>
                Güncel Akış
            </h1>
            <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)} 
                className={`flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm ${isFilterOpen ? 'bg-indigo-900 text-white shadow-indigo-900/20' : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100'}`}
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
                        <input type="text" placeholder="Hangi sorunu arıyorsun?" className="w-full px-5 py-3.5 bg-white border border-indigo-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition" value={filters.searchText} onChange={e => setFilters({...filters, searchText: e.target.value})} />
                    </div>
                    <div className="w-full md:w-64">
                        <label className="block text-xs font-black text-indigo-800 uppercase tracking-wider mb-2">Şehir Filtresi</label>
                        <select className="w-full px-5 py-3.5 bg-white border border-indigo-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition" value={filters.cityCode} onChange={e => setFilters({...filters, cityCode: e.target.value})}>
                            <option value="">Tüm Türkiye</option>
                            {cities.map(c => <option key={c.key} value={c.value}>{c.text}</option>)}
                        </select>
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
                    const isResolved = prob.isResolvedByExpert;

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
                                <Link to={`/user/${prob.senderId}`} className="h-14 w-14 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-100 to-blue-50 flex items-center justify-center font-black text-indigo-700 text-xl shadow-inner border border-indigo-200/50 shrink-0 ring-2 ring-white hover:ring-indigo-300 transition">
                                    {prob.senderImageUrl ? (
                                        <img 
                                            src={`/uploads/profiles/${prob.senderImageUrl}`} 
                                            alt={prob.senderUsername} 
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + prob.senderUsername + '&background=random' }}
                                        />
                                    ) : (
                                        <span>{prob.senderUsername[0].toUpperCase()}</span>
                                    )}
                                </Link>

                                <div>
                                    <Link to={`/user/${prob.senderId}`} className="font-bold text-gray-900 text-base hover:text-indigo-600 transition">@{prob.senderUsername}</Link>
                                    <div className="text-xs font-medium text-gray-500 mt-1 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        {new Date(prob.sendDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} 
                                        <span className="text-indigo-200 mx-1">•</span>
                                        <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        {prob.cityName}
                                    </div>
                                </div>
                            </div>
                            
                            {/* ÜÇ NOKTA MENÜSÜ */}
                            <div className="relative">
                                <button onClick={() => setOpenMenuId(openMenuId === prob.id ? null : prob.id)} className="p-2 text-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                </button>
                                {openMenuId === prob.id && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-indigo-50 py-2 z-50">
                                        <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)}></div>
                                        <div className="relative z-50">
                                            {prob.senderId !== currentUserId && currentUserId !== 0 && (
                                                <button onClick={() => { setReportTarget({type: 'Problem', id: prob.id}); setOpenMenuId(null); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                    🚩 Şikayet Et
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* KART İÇERİĞİ */}
                        <div className="px-7 pb-4">
                            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg mb-4 inline-block border border-indigo-100/50 shadow-sm">{prob.topicName}</span>
                            <Link to={`/problem/${prob.id}`} onClick={() => handleProblemClick(prob.id)} className="block group">
                                <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-3 group-hover:text-indigo-600 transition duration-300">{prob.title}</h3>
                                <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3">{prob.description}</p>
                                
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
                            <Link to={`/problem/${prob.id}`} onClick={() => handleProblemClick(prob.id)} className={`font-bold text-sm px-5 sm:px-6 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 ${isResolved ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/20' : 'bg-white border border-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600'}`}>
                                Detaylar
                                <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                            </Link>
                        </div>

                    </div>
                )})}

                {/* YENİ EKLENEN "DAHA FAZLA YÜKLE" BUTONU */}
                {hasMore && feedProblems.length > 0 && (
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
                )}
            </div>
        )}
      </main>

      {/* ŞİKAYET MODALI */}
      {reportTarget && (
          <ReportModal isOpen={!!reportTarget} onClose={() => setReportTarget(null)} targetType={reportTarget.type} targetId={reportTarget.id} />
      )}
    </div>
  );
};

export default Home;