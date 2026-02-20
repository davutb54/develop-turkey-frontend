import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { userService } from '../services/userService';
import { topicService } from '../services/topicService';
import { problemService } from '../services/problemService';
import { solutionService } from '../services/solutionService';
import { reportService } from '../services/reportService';
import type { AdminDashboardDto, ProblemDetailDto, SolutionDetailDto, LogDto, UserDetailDto, Topic, LogFilterDto, ReportDto } from '../types';
import Navbar from '../components/Navbar';
import { Link, useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  // --- TEMEL VERİ STATE'LERİ ---
  const [stats, setStats] = useState<AdminDashboardDto | null>(null);
  const [users, setUsers] = useState<UserDetailDto[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [problems, setProblems] = useState<ProblemDetailDto[]>([]);
  const [solutions, setSolutions] = useState<SolutionDetailDto[]>([]);
  const [logs, setLogs] = useState<LogDto[]>([]);
  
  // YENİ: Bekleyen Şikayetler State'i
  const [pendingReports, setPendingReports] = useState<ReportDto[]>([]);
  
  // --- ARAMA VE FİLTRE STATE'LERİ ---
  const [userSearch, setUserSearch] = useState('');
  const [userStatus, setUserStatus] = useState('');
  const [problemSearch, setProblemSearch] = useState('');
  const [solutionSearch, setSolutionSearch] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  
  const [logFilter, setLogFilter] = useState<LogFilterDto>({
      type: '', searchText: '', startDate: '', endDate: ''
  });
  const [logCategory, setLogCategory] = useState('');

  // --- SEKME STATE'LERİ ---
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'topics' | 'problems' | 'solutions' | 'reports' | 'logs'>('overview');
  const [reportTab, setReportTab] = useState<'problems' | 'solutions' | 'users'>('problems');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // --- SAYFA YÜKLENDİĞİNDE ---
  useEffect(() => {
    const checkAdmin = async () => {
        const userId = localStorage.getItem('userId');
        if (!userId) { navigate('/login'); return; }
        try {
            const userRes = await userService.getById(parseInt(userId));
            if (!userRes.data.data.isAdmin) {
                alert("Bu sayfaya erişim yetkiniz yok!"); navigate('/'); return;
            }
            loadAllData();
        } catch { navigate('/'); }
    };
    checkAdmin();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, topicsRes, problemsRes, solutionsRes, reportsRes] = await Promise.all([
        adminService.getDashboardStats(),
        userService.getAll(),
        topicService.getAll(),
        problemService.getAll(),
        solutionService.getAll(),
        reportService.getPending() // YENİ: Sadece bekleyen şikayetleri çekiyoruz
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (usersRes.data.success) setUsers(usersRes.data.data);
      if (topicsRes.data.success) setTopics(topicsRes.data.data);
      if (problemsRes.data.success) setProblems(problemsRes.data.data);
      if (solutionsRes.data.success) setSolutions(solutionsRes.data.data);
      if (reportsRes.data.success) setPendingReports(reportsRes.data.data);
      
      fetchLogs(); 
    } catch (err) { console.error("Veriler yüklenemedi", err); } 
    finally { setLoading(false); }
  };

  const fetchLogs = async () => {
      try {
          const filterToSend = { ...logFilter };
          if (filterToSend.endDate) filterToSend.endDate = `${filterToSend.endDate}T23:59:59`;
          const res = await adminService.getLogs(filterToSend);
          if (res.data.success) setLogs(res.data.data);
      } catch (err) { console.error("Loglar çekilemedi", err); }
  };

  // --- DİNAMİK FİLTRELEMELER ---
  const filteredUsers = users.filter(u => {
      const matchSearch = (u.userName + u.name + u.surname + u.email).toLowerCase().includes(userSearch.toLowerCase());
      const matchStatus = userStatus === 'banned' ? u.isBanned : userStatus === 'admin' ? u.isAdmin : true;
      return matchSearch && matchStatus;
  });

  const filteredProblems = problems.filter(p => p.title.toLowerCase().includes(problemSearch.toLowerCase()) || p.senderUsername.toLowerCase().includes(problemSearch.toLowerCase()));
  const filteredSolutions = solutions.filter(s => s.title.toLowerCase().includes(solutionSearch.toLowerCase()) || s.senderUsername.toLowerCase().includes(solutionSearch.toLowerCase()));

  const displayedLogs = logs.filter(log => {
      if (!logCategory) return true;
      const msg = log.message.toLowerCase();
      if (logCategory === 'user') return msg.includes('kullanıcı') || msg.includes('giriş') || msg.includes('kayıt') || msg.includes('şifre') || msg.includes('ban');
      if (logCategory === 'problem') return msg.includes('sorun') || msg.includes('problem');
      if (logCategory === 'solution') return msg.includes('çözüm') || msg.includes('oy');
      if (logCategory === 'system') return log.type === 'Error' || msg.includes('sistem') || msg.includes('veri');
      return true;
  });

  // YENİ: Şikayetleri Türüne Göre Ayırma
  const problemReports = pendingReports.filter(r => r.targetType === 'Problem');
  const solutionReports = pendingReports.filter(r => r.targetType === 'Solution');
  const userReports = pendingReports.filter(r => r.targetType === 'User');

  const topicDistribution = topics.map(t => {
      const count = problems.filter(p => p.topicId === t.id).length;
      return { name: t.name, count };
  }).sort((a,b) => b.count - a.count);

  // --- İŞLEMLER ---
  const handleBanToggle = async (userId: number, isBanned: boolean) => {
      if (!window.confirm(`Kullanıcıyı ${isBanned ? 'açmak' : 'banlamak'} istediğinize emin misiniz?`)) return;
      try {
          if (isBanned) await adminService.unbanUser(userId);
          else await adminService.banUser(userId);
          loadAllData();
      } catch { alert("İşlem başarısız."); }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTopicName.trim()) return;
      try { await topicService.add({ name: newTopicName }); setNewTopicName(''); loadAllData(); } 
      catch { alert("Kategori eklenemedi."); }
  };

  const handleDeleteTopic = async (topic: Topic) => {
      if (!window.confirm(`'${topic.name}' kategorisini silmek istediğinize emin misiniz?`)) return;
      try { await topicService.delete(topic); loadAllData(); } catch { alert("Silinemedi."); }
  };

  const handleDeleteProblem = async (id: number) => {
      if (!window.confirm("Bu sorunu silmek istediğinize emin misiniz?")) return;
      try { await adminService.deleteProblem(id); loadAllData(); } catch { alert("Silinemedi."); }
  };

  const handleDeleteSolution = async (id: number) => {
      if (!window.confirm("Bu çözümü silmek istediğinize emin misiniz?")) return;
      try { await solutionService.delete(id); loadAllData(); } catch { alert("Silinemedi."); }
  };

  // YENİ: Şikayeti Kapatma (İhlal Yok)
  const handleResolveReport = async (reportId: number) => {
      if (!window.confirm("Bu şikayeti 'İhlal Yok / İncelendi' olarak işaretleyip kapatmak istediğinize emin misiniz?")) return;
      try {
          await reportService.resolve(reportId);
          loadAllData(); // Listeyi yenilersek bu şikayet listeden düşer
      } catch { alert("Şikayet kapatılamadı."); }
  };

  // YENİ: Şikayet Edilen İçeriği Silme (Aynı anda şikayeti de kapatır)
  const handleDeleteReportedContent = async (reportId: number, targetType: string, targetId: number) => {
      if (!window.confirm("Bu İÇERİĞİ SİLMEK ve şikayeti kapatmak istediğinize emin misiniz?")) return;
      try {
          if (targetType === 'Problem') await adminService.deleteProblem(targetId);
          if (targetType === 'Solution') await solutionService.delete(targetId);
          // İçerik silindi, şikayeti de kapatıyoruz ki havada kalmasın
          await reportService.resolve(reportId);
          loadAllData();
      } catch { alert("İşlem başarısız oldu."); }
  };

  const handleFilterLogs = (e: React.FormEvent) => { e.preventDefault(); fetchLogs(); };
  const clearLogFilters = () => {
      setLogFilter({ type: '', searchText: '', startDate: '', endDate: '' });
      setLogCategory('');
      setTimeout(fetchLogs, 100); 
  };

  if (loading) return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
              <h2 className="text-xl font-bold text-gray-700">Yönetici Paneli Hazırlanıyor...</h2>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      <Navbar />
      <div className="max-w-screen-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* ÜST BAŞLIK */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                <span className="bg-gradient-to-r from-red-600 to-pink-600 text-white p-2 rounded-xl text-sm shadow-lg uppercase tracking-widest">Komuta Merkezi</span>
                Sistem Yönetimi
            </h1>
            <button onClick={loadAllData} className="flex items-center gap-2 bg-white px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all duration-200 active:scale-95">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Verileri Yenile
            </button>
        </div>

        <div className="flex flex-col xl:flex-row gap-8">
            {/* SOL MENÜ */}
            <div className="w-full xl:w-72 flex flex-col gap-2 shrink-0">
                <button onClick={() => setActiveTab('overview')} className={`p-4 text-left font-bold rounded-2xl transition-all duration-300 ${activeTab === 'overview' ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-xl translate-x-2' : 'bg-white text-gray-600 hover:bg-gray-50 hover:translate-x-1 border border-gray-100 shadow-sm'}`}>📊 Genel Özet</button>
                <button onClick={() => setActiveTab('users')} className={`p-4 text-left font-bold rounded-2xl transition-all duration-300 ${activeTab === 'users' ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-xl translate-x-2' : 'bg-white text-gray-600 hover:bg-gray-50 hover:translate-x-1 border border-gray-100 shadow-sm'}`}>👥 Kullanıcılar <span className="float-right bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{filteredUsers.length}</span></button>
                <button onClick={() => setActiveTab('topics')} className={`p-4 text-left font-bold rounded-2xl transition-all duration-300 ${activeTab === 'topics' ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-xl translate-x-2' : 'bg-white text-gray-600 hover:bg-gray-50 hover:translate-x-1 border border-gray-100 shadow-sm'}`}>📁 Kategoriler <span className="float-right bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{topics.length}</span></button>
                <button onClick={() => setActiveTab('problems')} className={`p-4 text-left font-bold rounded-2xl transition-all duration-300 ${activeTab === 'problems' ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-xl translate-x-2' : 'bg-white text-gray-600 hover:bg-gray-50 hover:translate-x-1 border border-gray-100 shadow-sm'}`}>📝 Sorunlar <span className="float-right bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{filteredProblems.length}</span></button>
                <button onClick={() => setActiveTab('solutions')} className={`p-4 text-left font-bold rounded-2xl transition-all duration-300 ${activeTab === 'solutions' ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-xl translate-x-2' : 'bg-white text-gray-600 hover:bg-gray-50 hover:translate-x-1 border border-gray-100 shadow-sm'}`}>💡 Çözümler <span className="float-right bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{filteredSolutions.length}</span></button>
                <button onClick={() => setActiveTab('reports')} className={`p-4 text-left font-bold rounded-2xl transition-all duration-300 flex justify-between items-center ${activeTab === 'reports' ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-xl translate-x-2' : 'bg-white text-gray-600 hover:bg-gray-50 hover:translate-x-1 border border-gray-100 shadow-sm'}`}>
                    <span>🚨 Şikayet Merkezi</span>
                    {pendingReports.length > 0 && <span className="bg-red-500 text-white text-xs px-2.5 py-1 rounded-full shadow-inner border border-red-600">{pendingReports.length}</span>}
                </button>
                <button onClick={() => setActiveTab('logs')} className={`p-4 text-left font-bold rounded-2xl transition-all duration-300 ${activeTab === 'logs' ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-xl translate-x-2' : 'bg-white text-gray-600 hover:bg-gray-50 hover:translate-x-1 border border-gray-100 shadow-sm'}`}>🛠️ Sistem Logları</button>
            </div>

            {/* SAĞ İÇERİK */}
            <div className="flex-1 bg-white rounded-3xl shadow-xl p-8 overflow-hidden border border-gray-100 min-h-[700px]">
                
                {/* 1. ÖZET (GÖRSEL GRAFİKLİ) */}
                {activeTab === 'overview' && stats && (
                    <div className="animate-fade-in">
                        <h2 className="text-2xl font-black border-b border-gray-100 pb-4 mb-8 text-gray-800">Sistem İstatistikleri</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-6 rounded-3xl text-white shadow-lg shadow-blue-200 relative overflow-hidden transition-transform hover:-translate-y-1">
                                <span className="text-sm font-bold uppercase tracking-wider opacity-80 mb-1 block">Kullanıcılar</span>
                                <span className="text-5xl font-black relative z-10">{stats.totalUsers}</span>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-6 rounded-3xl text-white shadow-lg shadow-green-200 relative overflow-hidden transition-transform hover:-translate-y-1">
                                <span className="text-sm font-bold uppercase tracking-wider opacity-80 mb-1 block">Sorunlar</span>
                                <span className="text-5xl font-black relative z-10">{stats.totalProblems}</span>
                            </div>
                            <div className="bg-gradient-to-br from-purple-500 to-fuchsia-600 p-6 rounded-3xl text-white shadow-lg shadow-purple-200 relative overflow-hidden transition-transform hover:-translate-y-1">
                                <span className="text-sm font-bold uppercase tracking-wider opacity-80 mb-1 block">Çözümler</span>
                                <span className="text-5xl font-black relative z-10">{stats.totalSolutions}</span>
                            </div>
                            <div className="bg-gradient-to-br from-rose-500 to-red-600 p-6 rounded-3xl text-white shadow-lg shadow-red-200 relative overflow-hidden transition-transform hover:-translate-y-1">
                                <span className="text-sm font-bold uppercase tracking-wider opacity-80 mb-1 block">Bekleyen Şikayet</span>
                                <span className="text-5xl font-black relative z-10">{pendingReports.length}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">Kategorilere Göre Sorunlar</h3>
                                <div className="space-y-5">
                                    {topicDistribution.slice(0, 5).map((td, index) => {
                                        const percentage = problems.length > 0 ? Math.round((td.count / problems.length) * 100) : 0;
                                        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500'];
                                        return (
                                            <div key={td.name}>
                                                <div className="flex justify-between text-sm mb-1.5">
                                                    <span className="font-bold text-gray-700">{td.name}</span>
                                                    <span className="text-gray-500 font-medium">{td.count} Sorun <span className="text-xs opacity-70">({percentage}%)</span></span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                                    <div className={`${colors[index % colors.length]} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">Hızlı Durum</h3>
                                    <ul className="space-y-4">
                                        <li className="flex justify-between items-center border-b border-gray-200 pb-3">
                                            <span className="text-gray-600 font-medium">Uzman / Yetkili</span>
                                            <span className="font-black text-gray-900 bg-white px-3 py-1 rounded-lg border shadow-sm">{users.filter(u => u.isExpert || u.isOfficial).length} Kişi</span>
                                        </li>
                                        <li className="flex justify-between items-center border-b border-gray-200 pb-3">
                                            <span className="text-gray-600 font-medium">Banlı Kişiler</span>
                                            <span className="font-black text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-100 shadow-sm">{stats.bannedUsers} Kişi</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. KULLANICILAR */}
                {activeTab === 'users' && (
                    <div className="animate-fade-in flex flex-col h-full">
                        <h2 className="text-2xl font-black border-b border-gray-100 pb-4 mb-6 text-gray-800">Kullanıcı Yönetimi</h2>
                        <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <input type="text" placeholder="İsim, Kullanıcı Adı veya E-Posta Ara..." className="flex-1 border-gray-300 shadow-sm p-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                            <select className="border-gray-300 shadow-sm p-3 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={userStatus} onChange={e => setUserStatus(e.target.value)}>
                                <option value="">Tüm Kullanıcılar</option><option value="banned">Sadece Banlılar</option><option value="admin">Sadece Adminler</option>
                            </select>
                        </div>
                        <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-sm flex-1 max-h-[600px] overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-100 text-sm">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-black text-gray-500 uppercase">Kullanıcı</th>
                                        <th className="px-6 py-4 text-left font-black text-gray-500 uppercase">E-Posta</th>
                                        <th className="px-6 py-4 text-left font-black text-gray-500 uppercase">Durum</th>
                                        <th className="px-6 py-4 text-right font-black text-gray-500 uppercase">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-50">
                                    {filteredUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-blue-50/50">
                                            <td className="px-6 py-4"><Link to={`/user/${u.id}`} className="font-bold text-blue-600 hover:underline">@{u.userName}</Link><div className="text-xs text-gray-500 mt-0.5">{u.name} {u.surname}</div></td>
                                            <td className="px-6 py-4 text-gray-600 font-medium">{u.email}</td>
                                            <td className="px-6 py-4">
                                                {u.isBanned ? <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold border border-red-200">Banlı</span> : <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold border border-green-200">Aktif</span>}
                                                {u.isAdmin && <span className="ml-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-200">Admin</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {!u.isAdmin && ( <button onClick={() => handleBanToggle(u.id, u.isBanned)} className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md active:scale-95 ${u.isBanned ? 'bg-gray-800 hover:bg-black' : 'bg-red-500 hover:bg-red-600'}`}>{u.isBanned ? 'Yasağı Kaldır' : 'Banla'}</button> )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. KATEGORİLER */}
                {activeTab === 'topics' && (
                    <div className="animate-fade-in">
                        <h2 className="text-2xl font-black border-b border-gray-100 pb-4 mb-6 text-gray-800">Kategori Yönetimi</h2>
                        <form onSubmit={handleAddTopic} className="mb-8 flex gap-4 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                            <input type="text" placeholder="Yeni Kategori Adı Yazın..." required className="flex-1 border-gray-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} />
                            <button type="submit" className="bg-blue-600 text-white font-bold px-8 py-3 rounded-xl shadow-md hover:bg-blue-700 active:scale-95">Ekle</button>
                        </form>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {topics.map(topic => (
                                <div key={topic.id} className="flex justify-between items-center bg-white border border-gray-200 shadow-sm p-5 rounded-2xl hover:shadow-md transition">
                                    <span className="font-bold text-gray-800">{topic.name}</span>
                                    <button onClick={() => handleDeleteTopic(topic)} className="text-red-500 bg-red-50 border border-red-100 font-bold hover:bg-red-500 hover:text-white text-sm px-3 py-1.5 rounded-lg">Sil</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. SORUNLAR */}
                {activeTab === 'problems' && (
                    <div className="animate-fade-in flex flex-col h-full">
                        <h2 className="text-2xl font-black border-b border-gray-100 pb-4 mb-6 text-gray-800">Tüm Sorunlar</h2>
                        <div className="mb-6"><input type="text" placeholder="Sorun başlığı veya yazar ara..." className="w-full border-gray-200 shadow-sm p-3 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" value={problemSearch} onChange={e => setProblemSearch(e.target.value)} /></div>
                        <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-sm flex-1 max-h-[600px] overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-100 text-sm">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-black text-gray-500 uppercase">Başlık</th>
                                        <th className="px-6 py-4 text-left font-black text-gray-500 uppercase">Kategori</th>
                                        <th className="px-6 py-4 text-left font-black text-gray-500 uppercase">Yazar</th>
                                        <th className="px-6 py-4 text-right font-black text-gray-500 uppercase">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-50">
                                    {filteredProblems.map(prob => (
                                        <tr key={prob.id} className="hover:bg-blue-50/50">
                                            <td className="px-6 py-4 font-bold text-gray-900"><Link to={`/problem/${prob.id}`} className="hover:underline text-base">{prob.title}</Link><div className="text-xs text-gray-500 mt-1 font-normal">{new Date(prob.sendDate).toLocaleDateString('tr-TR')}</div></td>
                                            <td className="px-6 py-4"><span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-bold border border-gray-200">{prob.topicName}</span></td>
                                            <td className="px-6 py-4 text-blue-600 font-medium">@{prob.senderUsername}</td>
                                            <td className="px-6 py-4 text-right"><button onClick={() => handleDeleteProblem(prob.id)} className="text-red-500 bg-red-50 border border-red-100 font-bold hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl shadow-sm">Sil</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 5. ÇÖZÜMLER */}
                {activeTab === 'solutions' && (
                    <div className="animate-fade-in flex flex-col h-full">
                        <h2 className="text-2xl font-black border-b border-gray-100 pb-4 mb-6 text-gray-800">Tüm Çözümler</h2>
                        <div className="mb-6"><input type="text" placeholder="Çözüm başlığı veya yazar ara..." className="w-full border-gray-200 shadow-sm p-3 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" value={solutionSearch} onChange={e => setSolutionSearch(e.target.value)} /></div>
                        <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-sm flex-1 max-h-[600px] overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-100 text-sm">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-black text-gray-500 uppercase">Çözüm Özeti</th>
                                        <th className="px-6 py-4 text-left font-black text-gray-500 uppercase">Yazar</th>
                                        <th className="px-6 py-4 text-right font-black text-gray-500 uppercase">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-50">
                                    {filteredSolutions.map(sol => (
                                        <tr key={sol.id} className="hover:bg-blue-50/50">
                                            <td className="px-6 py-4"><div className="font-bold text-gray-900 text-base mb-1">{sol.title}</div><Link to={`/problem/${sol.problemId}`} className="text-xs text-blue-500 hover:underline border border-blue-100 bg-blue-50 px-2 py-0.5 rounded">İlgili Sorun'a Git</Link></td>
                                            <td className="px-6 py-4 text-gray-700 font-bold">@{sol.senderUsername}</td>
                                            <td className="px-6 py-4 text-right"><button onClick={() => handleDeleteSolution(sol.id)} className="text-red-500 bg-red-50 border border-red-100 font-bold hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl shadow-sm">Sil</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 6. ŞİKAYET MERKEZİ (TAMAMEN YENİLENDİ - REPORTS TABLOSU BAZLI) */}
                {activeTab === 'reports' && (
                    <div className="animate-fade-in flex flex-col h-full">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-gray-100 pb-4 mb-6 gap-4">
                            <h2 className="text-2xl font-black text-gray-800">Şikayet Merkezi</h2>
                            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-xl text-sm font-bold border border-red-200 shadow-sm">
                                İncelenmeyi Bekleyen {pendingReports.length} Bildirim
                            </div>
                        </div>
                        
                        <div className="flex bg-gray-50 p-2 rounded-2xl mb-8 border border-gray-100 shadow-inner">
                            <button onClick={() => setReportTab('problems')} className={`flex-1 py-3 px-6 font-bold text-sm rounded-xl transition-all ${reportTab === 'problems' ? 'bg-white shadow-md text-red-600' : 'text-gray-500 hover:text-gray-800'}`}>
                                Sorun Şikayetleri ({problemReports.length})
                            </button>
                            <button onClick={() => setReportTab('solutions')} className={`flex-1 py-3 px-6 font-bold text-sm rounded-xl transition-all ${reportTab === 'solutions' ? 'bg-white shadow-md text-red-600' : 'text-gray-500 hover:text-gray-800'}`}>
                                Çözüm Şikayetleri ({solutionReports.length})
                            </button>
                            <button onClick={() => setReportTab('users')} className={`flex-1 py-3 px-6 font-bold text-sm rounded-xl transition-all ${reportTab === 'users' ? 'bg-white shadow-md text-red-600' : 'text-gray-500 hover:text-gray-800'}`}>
                                Kullanıcı Şikayetleri ({userReports.length})
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                            
                            {/* SORUN ŞİKAYETLERİ */}
                            {reportTab === 'problems' && problemReports.length === 0 && <p className="text-center py-12 text-gray-500 font-medium text-lg">Bekleyen sorun şikayeti yok. Harika!</p>}
                            {reportTab === 'problems' && problemReports.map(report => {
                                const targetProblem = problems.find(p => p.id === report.targetId);
                                const reporterUser = users.find(u => u.id === report.reporterUserId);
                                
                                return (
                                    <div key={report.id} className="border border-red-200 bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                                        
                                        {/* Şikayet Eden Bilgisi */}
                                        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="font-bold text-gray-700">Şikayet Eden:</span>
                                                <span className="text-blue-600 font-bold">@{reporterUser ? reporterUser.userName : 'Bilinmeyen Kullanıcı'}</span>
                                            </div>
                                            <span className="text-xs text-gray-400 font-bold">{new Date(report.reportDate).toLocaleDateString('tr-TR')}</span>
                                        </div>

                                        {/* Şikayet Sebebi */}
                                        <div className="mb-4">
                                            <span className="text-xs font-black uppercase text-gray-400 block mb-1">Şikayet Detayı / Sebebi</span>
                                            <p className="text-gray-800 font-medium bg-red-50 p-3 rounded-xl border border-red-100">{report.reason}</p>
                                        </div>

                                        {/* Hedef İçerik ve Butonlar */}
                                        {targetProblem ? (
                                            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mt-6">
                                                <div>
                                                    <span className="text-xs font-black uppercase text-gray-400 block mb-1">Şikayet Edilen İçerik</span>
                                                    <Link to={`/problem/${targetProblem.id}`} className="font-black text-lg text-gray-900 hover:text-blue-600 transition flex items-center gap-2">
                                                        {targetProblem.title}
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                    </Link>
                                                    <div className="text-xs text-gray-500 mt-1 font-medium">İçerik Sahibi: @{targetProblem.senderUsername}</div>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <button onClick={() => handleResolveReport(report.id)} className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 transition">İhlal Yok (Kapat)</button>
                                                    <button onClick={() => handleDeleteReportedContent(report.id, 'Problem', targetProblem.id)} className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-md transition">İçeriği Sil</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200 text-gray-500 italic text-sm">
                                                <span>Bu içerik daha önceden sistemden silinmiş.</span>
                                                <button onClick={() => handleResolveReport(report.id)} className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition">Şikayeti Arşivle</button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            {/* ÇÖZÜM ŞİKAYETLERİ */}
                            {reportTab === 'solutions' && solutionReports.length === 0 && <p className="text-center py-12 text-gray-500 font-medium text-lg">Bekleyen çözüm şikayeti yok.</p>}
                            {reportTab === 'solutions' && solutionReports.map(report => {
                                const targetSolution = solutions.find(s => s.id === report.targetId);
                                const reporterUser = users.find(u => u.id === report.reporterUserId);
                                
                                return (
                                    <div key={report.id} className="border border-orange-200 bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
                                        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                                            <div className="flex items-center gap-2 text-sm"><span className="font-bold text-gray-700">Şikayet Eden:</span><span className="text-blue-600 font-bold">@{reporterUser ? reporterUser.userName : 'Bilinmeyen'}</span></div>
                                            <span className="text-xs text-gray-400 font-bold">{new Date(report.reportDate).toLocaleDateString('tr-TR')}</span>
                                        </div>
                                        <div className="mb-4">
                                            <span className="text-xs font-black uppercase text-gray-400 block mb-1">Sebep</span>
                                            <p className="text-gray-800 font-medium bg-orange-50 p-3 rounded-xl border border-orange-100">{report.reason}</p>
                                        </div>
                                        {targetSolution ? (
                                            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mt-6">
                                                <div>
                                                    <span className="text-xs font-black uppercase text-gray-400 block mb-1">Şikayet Edilen Çözüm</span>
                                                    <div className="font-black text-lg text-gray-900">{targetSolution.title}</div>
                                                    <div className="text-xs text-gray-500 mt-1 font-medium">Sahibi: @{targetSolution.senderUsername} | <Link to={`/problem/${targetSolution.problemId}`} className="text-blue-500 hover:underline">İlgili Soruna Git</Link></div>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <button onClick={() => handleResolveReport(report.id)} className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 transition">İhlal Yok (Kapat)</button>
                                                    <button onClick={() => handleDeleteReportedContent(report.id, 'Solution', targetSolution.id)} className="px-4 py-2 text-sm font-bold text-white bg-orange-500 rounded-xl hover:bg-orange-600 shadow-md transition">Çözümü Sil</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center mt-6 p-4 bg-gray-50 rounded-xl border text-gray-500 italic text-sm">
                                                <span>Çözüm silinmiş.</span>
                                                <button onClick={() => handleResolveReport(report.id)} className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition">Kapat</button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            {/* KULLANICI ŞİKAYETLERİ */}
                            {reportTab === 'users' && userReports.length === 0 && <p className="text-center py-12 text-gray-500 font-medium text-lg">Bekleyen kullanıcı şikayeti yok.</p>}
                            {reportTab === 'users' && userReports.map(report => {
                                const targetUser = users.find(u => u.id === report.targetId);
                                const reporterUser = users.find(u => u.id === report.reporterUserId);
                                
                                return (
                                    <div key={report.id} className="border border-purple-200 bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500"></div>
                                        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                                            <div className="flex items-center gap-2 text-sm"><span className="font-bold text-gray-700">Şikayet Eden:</span><span className="text-blue-600 font-bold">@{reporterUser ? reporterUser.userName : 'Bilinmeyen'}</span></div>
                                            <span className="text-xs text-gray-400 font-bold">{new Date(report.reportDate).toLocaleDateString('tr-TR')}</span>
                                        </div>
                                        <div className="mb-4">
                                            <span className="text-xs font-black uppercase text-gray-400 block mb-1">Sebep</span>
                                            <p className="text-gray-800 font-medium bg-purple-50 p-3 rounded-xl border border-purple-100">{report.reason}</p>
                                        </div>
                                        {targetUser ? (
                                            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mt-6">
                                                <div>
                                                    <span className="text-xs font-black uppercase text-gray-400 block mb-1">Şikayet Edilen Profil</span>
                                                    <Link to={`/user/${targetUser.id}`} className="font-black text-lg text-gray-900 hover:text-blue-600 transition flex items-center gap-2">@{targetUser.userName}</Link>
                                                    <div className="text-xs text-gray-500 mt-1 font-medium">{targetUser.email} | Durum: {targetUser.isBanned ? 'Banlı' : 'Aktif'}</div>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <button onClick={() => handleResolveReport(report.id)} className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 transition">İhlal Yok (Kapat)</button>
                                                    <button onClick={() => { handleBanToggle(targetUser.id, targetUser.isBanned); handleResolveReport(report.id); }} className="px-4 py-2 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-md transition">Kullanıcıyı Banla</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center mt-6 p-4 bg-gray-50 rounded-xl border text-gray-500 italic text-sm">
                                                <span>Kullanıcı hesabı silinmiş.</span>
                                                <button onClick={() => handleResolveReport(report.id)} className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition">Kapat</button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 7. LOGLAR (Aynı şekliyle duruyor) */}
                {activeTab === 'logs' && (
                    <div className="animate-fade-in flex flex-col h-full">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
                            <h2 className="text-2xl font-black text-gray-800">Sistem Logları</h2>
                            <span className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-lg text-sm font-bold border border-gray-200 shadow-sm">{displayedLogs.length} Kayıt Gösteriliyor</span>
                        </div>
                        
                        <form onSubmit={handleFilterLogs} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500"></div>
                            <div className="lg:col-span-2"><label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-wider">Arama (Backend)</label><input type="text" placeholder="Kelime ara..." className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" value={logFilter.searchText} onChange={e => setLogFilter({...logFilter, searchText: e.target.value})} /></div>
                            <div>
                                <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-wider text-blue-600">Log Kaynağı</label>
                                <select className="w-full border border-blue-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50/50 text-blue-900 font-medium" value={logCategory} onChange={e => setLogCategory(e.target.value)}>
                                    <option value="">Tüm Kaynaklar</option><option value="user">👤 Kullanıcı İşlemleri</option><option value="problem">📝 Sorun İşlemleri</option><option value="solution">💡 Çözüm İşlemleri</option><option value="system">⚙️ Sistem / Hatalar</option>
                                </select>
                            </div>
                            <div><label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-wider">Log Türü</label><select className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" value={logFilter.type} onChange={e => setLogFilter({...logFilter, type: e.target.value})}><option value="">Tümü</option><option value="Info">Info (Bilgi)</option><option value="Warning">Warning (Uyarı)</option><option value="Error">Error (Hata)</option></select></div>
                            <div><label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-wider">Tarihe Kadar</label><input type="date" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" value={logFilter.endDate ? logFilter.endDate.split('T')[0] : ''} onChange={e => setLogFilter({...logFilter, endDate: e.target.value})} /></div>
                            <div className="lg:col-span-5 flex gap-3 pt-2 border-t border-gray-100 mt-2">
                                <button type="submit" className="flex-1 bg-gray-900 text-white font-bold py-3 rounded-xl text-sm hover:bg-black shadow-md transition active:scale-95">Filtrele & Getir</button>
                                <button type="button" onClick={clearLogFilters} className="bg-red-50 text-red-600 border border-red-200 font-bold py-3 px-6 rounded-xl text-sm hover:bg-red-100 transition active:scale-95">Sıfırla</button>
                            </div>
                        </form>

                        <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-sm flex-1 max-h-[500px] overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-100 text-sm">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr><th className="px-6 py-4 text-left font-black text-gray-500 uppercase w-48 tracking-wider">Tarih</th><th className="px-6 py-4 text-left font-black text-gray-500 uppercase w-32 tracking-wider">Tür</th><th className="px-6 py-4 text-left font-black text-gray-500 uppercase tracking-wider">Sistem Mesajı</th></tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-50">
                                    {displayedLogs.length === 0 ? (
                                        <tr><td colSpan={3} className="px-6 py-16 text-center text-gray-500 font-medium text-lg">Bu kriterlere uygun log bulunamadı.</td></tr>
                                    ) : (
                                        displayedLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="px-6 py-4 text-xs font-bold text-gray-600">{new Date(log.creationDate).toLocaleString('tr-TR')}</td>
                                                <td className="px-6 py-4"><span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${log.type === 'Error' ? 'bg-red-50 text-red-700 border-red-200' : log.type === 'Warning' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{log.type}</span></td>
                                                <td className="px-6 py-4 text-xs text-gray-700 font-mono leading-relaxed max-w-2xl break-words">{log.message}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;