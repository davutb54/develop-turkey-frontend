import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { userService } from '../services/userService';
import { topicService } from '../services/topicService';
import { problemService } from '../services/problemService';
import { solutionService } from '../services/solutionService';
import { reportService } from '../services/reportService';
import { institutionService } from '../services/institutionService';
import { feedbackService } from '../services/feedbackService'; // YENİ EKLENDİ
import type { AdminDashboardDto, ProblemDetailDto, SolutionDetailDto, UserDetailDto, Topic, LogFilterDto, ReportDto, Institution, Log } from '../types';
import Navbar from '../components/Navbar';
import { Link, useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    // --- TEMEL VERİ STATE'LERİ ---
    const [stats, setStats] = useState<AdminDashboardDto | null>(null);
    const [users, setUsers] = useState<UserDetailDto[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [problems, setProblems] = useState<ProblemDetailDto[]>([]);
    const [solutions, setSolutions] = useState<SolutionDetailDto[]>([]);
    const [logs, setLogs] = useState<Log[]>([]);
    const [pendingReports, setPendingReports] = useState<ReportDto[]>([]);
    const [pendingSolutions, setPendingSolutions] = useState<any[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    
    // YENİ: FEEDBACK (GERİ BİLDİRİM) STATE'İ
    const [feedbacks, setFeedbacks] = useState<any[]>([]);

    // --- ARAMA VE FİLTRE STATE'LERİ ---
    const [userSearch, setUserSearch] = useState('');
    const [userStatus, setUserStatus] = useState('');
    
    // Problem Filtreleri
    const [problemSearch, setProblemSearch] = useState('');
    const [problemStatus, setProblemStatus] = useState('');
    const [problemInst, setProblemInst] = useState('');
    const [problemTopicFilter, setProblemTopicFilter] = useState('');
    
    // Solution Filtreleri
    const [solutionSearch, setSolutionSearch] = useState('');
    const [solutionStatus, setSolutionStatus] = useState('');
    const [solutionInst, setSolutionInst] = useState('');
    
    // Topic (Kategori) Filtresi
    const [topicInstFilter, setTopicInstFilter] = useState('');

    // --- SAYFALAMA STATE'LERİ ---
    const [problemPage, setProblemPage] = useState(1);
    const [solutionPage, setSolutionPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    // --- EKLEME STATE'LERİ ---
    const [newTopicName, setNewTopicName] = useState('');
    const [newTopicInstId, setNewTopicInstId] = useState(''); 
    const [newTopicImage, setNewTopicImage] = useState<File | null>(null);
    
    const [instFormData, setInstFormData] = useState<Institution>({
        name: '', domain: '', logoUrl: '', primaryColor: '#2563eb', status: true
    });
    const [instLoading, setInstLoading] = useState(false);
    const [instError, setInstError] = useState('');
    const [instSuccess, setInstSuccess] = useState('');
    const [instLogoFile, setInstLogoFile] = useState<File | null>(null);

    // --- YENİ LOG FİLTRELEME STATE'LERİ ---
    const [logFilter, setLogFilter] = useState<LogFilterDto>({});
    const [logPage, setLogPage] = useState(1);

    // --- SEKME STATE'LERİ ---
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'topics' | 'institutions' | 'problems' | 'solutions' | 'reports' | 'logs' | 'expert-approvals' | 'feedbacks'>('overview');
    const [reportTab, setReportTab] = useState<'problems' | 'solutions' | 'users'>('problems');
    const [loading, setLoading] = useState(true);

    // --- DÜZENLEME MODAL STATE'LERİ ---
    const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
    const [editTopicName, setEditTopicName] = useState('');
    const [editTopicInstId, setEditTopicInstId] = useState('');
    const [editTopicImage, setEditTopicImage] = useState<File | null>(null);
    const [editTopicStatus, setEditTopicStatus] = useState(true);

    const [editingInst, setEditingInst] = useState<Institution | null>(null);
    const [editInstData, setEditInstData] = useState({ name: '', domain: '', primaryColor: '', status: true });
    const [editInstLogo, setEditInstLogo] = useState<File | null>(null);

    const navigate = useNavigate();

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

    const loadPendingSolutions = async () => {
        try {
            const res = await adminService.getPendingExpertSolutions();
            if (res.data.success) setPendingSolutions(res.data.data);
        } catch (err) { console.log("Hata", err); }
    };

    useEffect(() => {
        loadPendingSolutions();
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        try {
            const [statsRes, usersRes, topicsRes, problemsRes, solutionsRes, reportsRes, instRes, feedbacksRes] = await Promise.all([
                adminService.getDashboardStats(),
                userService.getAll(),
                adminService.getAllTopics(),
                adminService.getAllProblems(),
                adminService.getAllSolutions(),
                reportService.getPending(),
                institutionService.getAll(),
                feedbackService.getAll() // YENİ EKLENDİ
            ]);

            if (statsRes.data.success) setStats(statsRes.data.data);
            if (usersRes.data.success) setUsers(usersRes.data.data);
            if (topicsRes.data.success) setTopics(topicsRes.data.data);
            if (problemsRes.data.success) setProblems(problemsRes.data.data);
            if (solutionsRes.data.success) setSolutions(solutionsRes.data.data);
            if (reportsRes.data.success) setPendingReports(reportsRes.data.data);
            if (instRes.data.success) setInstitutions(instRes.data.data);
            if (feedbacksRes.data.success) setFeedbacks(feedbacksRes.data.data); // YENİ EKLENDİ

            fetchLogs();
        } catch (err) { console.error("Veriler yüklenemedi", err); }
        finally { setLoading(false); }
    };

    const fetchLogs = async () => {
        try {
            const filterToSend: LogFilterDto = {
                searchText: logFilter.searchText || undefined,
                endDate: logFilter.endDate ? `${logFilter.endDate}T23:59:59` : undefined,
                category: logFilter.category || undefined,
                action: logFilter.action || undefined,
                level: logFilter.level || undefined,
                page: logPage,
                pageSize: 20
            };
            const res = await adminService.getLogs(filterToSend);
            if (res.data.success) {
                setLogs(res.data.data);
            }
        } catch (err) { console.error("Loglar çekilemedi", err); }
    };

    useEffect(() => { fetchLogs(); }, [logPage]);

    const handleFilterLogs = (e: React.FormEvent) => { e.preventDefault(); setLogPage(1); fetchLogs(); };
    const clearLogFilters = () => { setLogFilter({}); setLogPage(1); setTimeout(fetchLogs, 100); };

    // --- FİLTRELEME İŞLEMLERİ ---

    // Kategori Filtreleme (Kuruma Göre)
    const filteredTopics = topics.filter(t => {
        if (topicInstFilter === '') return true;
        return t.institutionId?.toString() === topicInstFilter;
    });

    const filteredUsers = users.filter(u => {
        const matchSearch = (u.userName + u.name + u.surname + u.email).toLowerCase().includes(userSearch.toLowerCase());
        const matchStatus = userStatus === 'banned' ? u.isBanned : userStatus === 'admin' ? u.isAdmin : true;
        return matchSearch && matchStatus;
    });

    // Problem Filtreleme (Yeni Çoklu Kategoriye Uygun)
    const filteredProblems = problems.filter(p => {
        const matchSearch = p.title.toLowerCase().includes(problemSearch.toLowerCase()) || p.senderUsername.toLowerCase().includes(problemSearch.toLowerCase());
        let matchStatus = true;
        if (problemStatus === 'highlighted') matchStatus = p.isHighlighted;
        if (problemStatus === 'resolved') matchStatus = p.isResolved || p.isResolvedByExpert;
        
        let matchInst = problemInst === '' || p.institutionId?.toString() === problemInst;
        
        let matchTopic = true;
        if (problemTopicFilter !== '') {
            matchTopic = p.topics && p.topics.some(t => t.id.toString() === problemTopicFilter);
        }

        return matchSearch && matchStatus && matchInst && matchTopic;
    });
    const paginatedProblems = filteredProblems.slice((problemPage - 1) * ITEMS_PER_PAGE, problemPage * ITEMS_PER_PAGE);

    const filteredSolutions = solutions.filter(s => {
        const matchSearch = s.title.toLowerCase().includes(solutionSearch.toLowerCase()) || s.senderUsername.toLowerCase().includes(solutionSearch.toLowerCase());
        let matchStatus = true;
        if (solutionStatus === 'highlighted') matchStatus = s.isHighlighted;
        let matchInst = true;
        if (solutionInst !== '') {
            const relatedProblem = problems.find(p => p.id === s.problemId);
            matchInst = relatedProblem ? relatedProblem.institutionId?.toString() === solutionInst : false;
        }
        return matchSearch && matchStatus && matchInst;
    });

    const groupedSolutions = filteredSolutions.reduce((acc, sol) => {
        if (!acc[sol.problemId]) acc[sol.problemId] = { problemId: sol.problemId, problemName: problems.find(p => p.id === sol.problemId)?.title || "Bilinmeyen Sorun", solutions: [] };
        acc[sol.problemId].solutions.push(sol);
        return acc;
    }, {} as any);

    const groupedSolutionsArray = Object.values(groupedSolutions);
    const paginatedSolutionsGroups = groupedSolutionsArray.slice((solutionPage - 1) * ITEMS_PER_PAGE, solutionPage * ITEMS_PER_PAGE);

    const problemReports = pendingReports.filter(r => r.targetType === 'Problem');
    const solutionReports = pendingReports.filter(r => r.targetType === 'Solution');
    const userReports = pendingReports.filter(r => r.targetType === 'User');

    const topicDistribution = topics.map(t => {
        const count = problems.filter(p => p.topics && p.topics.some(pt => pt.id === t.id)).length;
        return { name: t.name, count };
    }).sort((a, b) => b.count - a.count);

    const groupedPendingSolutions = Object.values(pendingSolutions.reduce((acc, sol) => {
        if (!acc[sol.problemId]) acc[sol.problemId] = { problemId: sol.problemId, problemName: sol.problemName, solutions: [] };
        acc[sol.problemId].solutions.push(sol);
        return acc;
    }, {}));


    // --- İŞLEMLER ---

    const handleRemoveTopicFromProblem = async (problemId: number, topicId: number, topicName: string) => {
        if (!window.confirm(`'${topicName}' etiketini bu sorundan tamamen kaldırmak istediğinize emin misiniz?`)) return;
        try {
            await adminService.removeTopicFromProblem(problemId, topicId);
            setProblems(prev => prev.map(p => {
                if(p.id === problemId && p.topics) {
                    return { ...p, topics: p.topics.filter(t => t.id !== topicId) };
                }
                return p;
            }));
        } catch (err) {
            alert("Etiket silinemedi.");
        }
    };

    const handleBanToggle = async (userId: number, isBanned: boolean) => {
        if (!window.confirm(`Kullanıcıyı ${isBanned ? 'açmak' : 'banlamak'} istediğinize emin misiniz?`)) return;
        try {
            if (isBanned) await adminService.unbanUser(userId);
            else await adminService.banUser(userId);
            loadAllData();
        } catch { alert("İşlem başarısız."); }
    };

    const handleToggleTopicStatus = async (topic: Topic) => {
        const actionText = topic.status ? 'pasife almak (gizlemek)' : 'tekrar aktif etmek';
        if (!window.confirm(`'${topic.name}' kategorisini ${actionText} istediğinize emin misiniz?`)) return;
        try {
            const formData = new FormData();
            formData.append("Id", topic.id.toString());
            formData.append("Name", topic.name);
            formData.append("ExistingImageName", topic.imageName);
            formData.append("Status", (!topic.status).toString());
            formData.append("InstitutionId", topic.institutionId?.toString() || '1');
            await topicService.update(formData);
            loadAllData();
        } catch { alert("Durum güncellenemedi."); }
    };

    const handleAddTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTopicName.trim()) return;
        if (!newTopicInstId) { alert("Lütfen kategori için bir kurum seçiniz!"); return; }

        const formData = new FormData();
        formData.append("Name", newTopicName);
        formData.append("InstitutionId", newTopicInstId);
        if (newTopicImage) formData.append("Image", newTopicImage);

        try {
            await topicService.add(formData);
            setNewTopicName('');
            setNewTopicInstId('');
            setNewTopicImage(null);
            loadAllData();
        } catch { alert("Kategori eklenemedi."); }
    };

    const handleDeleteTopic = async (topic: Topic) => {
        if (!window.confirm(`'${topic.name}' kategorisini silmek istediğinize emin misiniz?`)) return;
        try { await topicService.delete(topic.id); loadAllData(); } catch { alert("Silinemedi."); }
    };

    const handleDeleteProblem = async (id: number) => {
        if (!window.confirm("Bu sorunu silmek istediğinize emin misiniz?")) return;
        try { await adminService.deleteProblem(id); loadAllData(); } catch { alert("Silinemedi."); }
    };

    const handleDeleteSolution = async (id: number) => {
        if (!window.confirm("Bu çözümü silmek istediğinize emin misiniz?")) return;
        try { await solutionService.delete(id); loadAllData(); } catch { alert("Silinemedi."); }
    };

    const handleInstChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setInstFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleUpdateTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTopic) return;
        const formData = new FormData();
        formData.append("Id", editingTopic.id.toString());
        formData.append("Name", editTopicName);
        formData.append("ExistingImageName", editingTopic.imageName);
        formData.append("Status", editTopicStatus.toString());
        formData.append("InstitutionId", editTopicInstId || '1');
        if (editTopicImage) formData.append("Image", editTopicImage);

        try {
            await topicService.update(formData);
            setEditingTopic(null);
            loadAllData();
        } catch { alert("Kategori güncellenemedi."); }
    };

    const handleUpdateInst = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingInst) return;
        const formData = new FormData();
        formData.append("Id", editingInst.id!.toString());
        formData.append("Name", editInstData.name);
        formData.append("Domain", editInstData.domain);
        formData.append("PrimaryColor", editInstData.primaryColor);
        formData.append("Status", editInstData.status.toString());
        if (editingInst.logoUrl) formData.append("ExistingLogoUrl", editingInst.logoUrl);
        if (editInstLogo) formData.append("Logo", editInstLogo);

        try {
            await institutionService.update(formData);
            setEditingInst(null);
            loadAllData();
        } catch { alert("Kurum güncellenemedi."); }
    };

    const handleAddInstitution = async (e: React.FormEvent) => {
        e.preventDefault();
        setInstLoading(true); setInstError(''); setInstSuccess('');
        if (!instFormData.name || !instFormData.domain) {
            setInstError("Kurum adı ve Domain zorunludur."); setInstLoading(false); return;
        }

        const formData = new FormData();
        formData.append("Name", instFormData.name);
        formData.append("Domain", instFormData.domain);
        formData.append("PrimaryColor", instFormData.primaryColor || '#2563eb');
        formData.append("Status", instFormData.status.toString());
        if (instLogoFile) formData.append("Logo", instLogoFile);

        try {
            const response = await institutionService.add(formData);
            if (response.data.success) {
                setInstSuccess(`${instFormData.name} başarıyla eklendi!`);
                setInstFormData({ name: '', domain: '', logoUrl: '', primaryColor: '#2563eb', status: true });
                setInstLogoFile(null);
                loadAllData();
            } else { setInstError(response.data.message); }
        } catch (err: any) { setInstError(err.response?.data?.message || "Kurum eklenirken hata."); }
        finally { setInstLoading(false); }
    };

    const handleToggleInstitutionStatus = async (inst: Institution) => {
        if (inst.id === 1) { alert("Sistemin ana ağı pasife alınamaz!"); return; }
        const actionText = inst.status ? 'pasife almak' : 'aktif etmek';
        if (!window.confirm(`'${inst.name}' ağını ${actionText} istediğinize emin misiniz?`)) return;

        try {
            const formData = new FormData();
            formData.append("Id", inst.id!.toString());
            formData.append("Name", inst.name);
            formData.append("Domain", inst.domain);
            formData.append("Status", (!inst.status).toString());
            if (inst.primaryColor) formData.append("PrimaryColor", inst.primaryColor);
            if (inst.logoUrl) formData.append("ExistingLogoUrl", inst.logoUrl);

            await institutionService.update(formData);
            loadAllData();
        } catch (err) { alert("Kurum durumu güncellenemedi."); }
    };

    const handleResolveReport = async (reportId: number) => {
        if (!window.confirm("Bu şikayeti kapatmak istediğinize emin misiniz?")) return;
        try { await reportService.resolve(reportId); loadAllData(); } catch { alert("Şikayet kapatılamadı."); }
    };

    const handleDeleteReportedContent = async (reportId: number, targetType: string, targetId: number) => {
        if (!window.confirm("Bu İÇERİĞİ SİLMEK ve şikayeti kapatmak istediğinize emin misiniz?")) return;
        try {
            if (targetType === 'Problem') await adminService.deleteProblem(targetId);
            if (targetType === 'Solution') await solutionService.delete(targetId);
            await reportService.resolve(reportId);
            loadAllData();
        } catch { alert("İşlem başarısız oldu."); }
    };

    const handleToggleRole = async (userId: number, roleType: 'Admin' | 'Expert' | 'Official') => {
        try {
            if (roleType === 'Admin') await adminService.toggleAdminRole(userId);
            if (roleType === 'Expert') await adminService.toggleExpertRole(userId);
            if (roleType === 'Official') await adminService.toggleOfficialRole(userId);
            loadAllData();
        } catch (err) { alert("Yetki işlemi başarısız oldu."); }
    };

    const handleToggleHighlight = async (id: number, type: 'Problem' | 'Solution') => {
        try {
            if (type === 'Problem') await adminService.toggleProblemHighlight(id);
            if (type === 'Solution') await adminService.toggleSolutionHighlight(id);
            loadAllData();
        } catch (err) { alert("Öne çıkarma işlemi başarısız."); }
    };

    const handleToggleProblemResolved = async (id: number) => {
        try { await adminService.toggleProblemResolved(id); loadAllData(); }
        catch (err) { alert("Çözüldü durumu güncellenemedi."); }
    };

    const handleApproveSolution = async (sol: any) => {
        try {
            await adminService.approveSolution(sol.id);
            const probRes = await problemService.getById(sol.problemId);
            if (probRes.data.success) {
                const problemData = probRes.data.data;
                if (!problemData.isResolvedByExpert && !problemData.isResolved) {
                    await adminService.toggleProblemResolved(sol.problemId);
                }
            }
            alert("Çözüm onaylandı!");
            loadPendingSolutions();
        } catch (err) { alert("Onay işlemi başarısız."); }
    };

    const handleRejectSolution = async (id: number) => {
        if (!window.confirm("Bu uzman çözümünü reddetmek istediğinize emin misiniz?")) return;
        try { await adminService.rejectSolution(id); alert("Çözüm Reddedildi."); loadPendingSolutions(); }
        catch (err) { alert("Hata"); }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
                <h2 className="text-xl font-bold text-slate-700">Yönetici Paneli Hazırlanıyor...</h2>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />

            <div className="flex-1 flex flex-col xl:flex-row max-w-[1600px] mx-auto w-full">
                {/* SOL MENÜ */}
                <aside className="w-full xl:w-72 bg-white border-r border-slate-200 p-6 shrink-0 xl:min-h-[calc(100vh-80px)] shadow-sm z-10">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-4">Yönetim Paneli</h2>
                    <nav className="space-y-1.5">
                        {[
                            { id: 'overview', label: 'Genel Bakış', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', count: 0 },
                            { id: 'users', label: 'Kullanıcılar', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', count: filteredUsers.length },
                            { id: 'topics', label: 'Kategoriler', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', count: topics.length },
                            { id: 'institutions', label: 'Kurumlar (Ağlar)', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', count: institutions.length },
                            { id: 'problems', label: 'Sorunlar', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', count: filteredProblems.length },
                            { id: 'solutions', label: 'Çözümler', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', count: filteredSolutions.length },
                            { id: 'expert-approvals', label: 'Uzman Onayları', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', count: pendingSolutions.length, isAlert: true },
                            { id: 'reports', label: 'Şikayet Merkezi', icon: 'M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9', count: pendingReports.length, isAlert: true },
                            // YENİ EKLENEN GELEN KUTUSU SEKME MENÜSÜ
                            { id: 'feedbacks', label: 'Gelen Kutusu', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', count: feedbacks.filter(f => !f.isRead).length, isAlert: feedbacks.filter(f => !f.isRead).length > 0 },
                            { id: 'logs', label: 'Sistem Logları (SIEM)', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', count: 0 }
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as any)}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 translate-x-2' : 'bg-transparent text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-transparent hover:border-indigo-100'}`}
                            >
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                                {item.label}
                                {item.count > 0 && (
                                    <span className={`ml-auto text-[10px] px-2.5 py-1 rounded-full border shadow-inner ${item.isAlert ? 'bg-red-500 text-white border-red-600' : (activeTab === item.id ? 'bg-white/20 text-white border-transparent' : 'bg-slate-100 text-slate-600 border-slate-200')}`}>
                                        {item.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* SAĞ İÇERİK */}
                <main className="flex-1 p-6 md:p-10 overflow-x-hidden">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 pb-6 border-b border-slate-200">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Komuta Merkezi</h1>
                            <p className="text-slate-500 text-sm mt-1 font-medium">Sistem verilerini ve kullanıcıları buradan yönetin.</p>
                        </div>
                        <button onClick={loadAllData} className="flex items-center gap-2 bg-white px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all duration-200 active:scale-95">
                            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            Verileri Yenile
                        </button>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 md:p-8 border border-slate-100 min-h-[700px]">

                        {/* 1. ÖZET */}
                        {activeTab === 'overview' && stats && (
                            <div className="animate-fade-in">
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
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                        <h3 className="text-lg font-black text-slate-800 mb-6">Kategorilere Göre Sorunlar</h3>
                                        <div className="space-y-5">
                                            {topicDistribution.slice(0, 5).map((td, index) => {
                                                const percentage = problems.length > 0 ? Math.round((td.count / problems.length) * 100) : 0;
                                                const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500'];
                                                return (
                                                    <div key={td.name}>
                                                        <div className="flex justify-between text-sm mb-1.5">
                                                            <span className="font-bold text-slate-700">{td.name}</span>
                                                            <span className="text-slate-500 font-medium">{td.count} Sorun <span className="text-xs opacity-70">({percentage}%)</span></span>
                                                        </div>
                                                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                                            <div className={`${colors[index % colors.length]} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                        <h3 className="text-lg font-black text-slate-800 mb-6">Hızlı Durum</h3>
                                        <ul className="space-y-4">
                                            <li className="flex justify-between items-center border-b border-slate-200 pb-3">
                                                <span className="text-slate-600 font-medium">Kurum Sayısı</span>
                                                <span className="font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 shadow-sm">{institutions.length} Ağ</span>
                                            </li>
                                            <li className="flex justify-between items-center border-b border-slate-200 pb-3">
                                                <span className="text-slate-600 font-medium">Uzman / Yetkili Kişiler</span>
                                                <span className="font-black text-slate-900 bg-white px-3 py-1 rounded-lg border shadow-sm">{users.filter(u => u.isExpert || u.isOfficial).length} Kişi</span>
                                            </li>
                                            <li className="flex justify-between items-center border-b border-slate-200 pb-3">
                                                <span className="text-slate-600 font-medium">Banlı Kullanıcılar</span>
                                                <span className="font-black text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-100 shadow-sm">{stats.bannedUsers} Kişi</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. KULLANICILAR */}
                        {activeTab === 'users' && (
                            <div className="animate-fade-in flex flex-col h-full">
                                <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <input type="text" placeholder="İsim, Kullanıcı Adı veya E-Posta Ara..." className="flex-1 border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                                    <select className="border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm bg-white font-medium text-slate-700" value={userStatus} onChange={e => setUserStatus(e.target.value)}>
                                        <option value="">Tüm Kullanıcılar</option><option value="banned">Sadece Banlılar</option><option value="admin">Sadece Adminler</option>
                                    </select>
                                </div>
                                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm flex-1 max-h-[600px] overflow-y-auto bg-slate-50/50">
                                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                                        <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-6 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[10px]">Kullanıcı Bilgileri</th>
                                                <th className="px-6 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[10px]">E-Posta</th>
                                                <th className="px-6 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[10px]">Roller & Durum</th>
                                                <th className="px-6 py-4 text-right font-black text-slate-500 uppercase tracking-widest text-[10px]">Yetki Yönetimi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {filteredUsers.map(u => (
                                                <tr key={u.id} className="hover:bg-indigo-50/30 transition">
                                                    <td className="px-6 py-4">
                                                        <Link to={`/user/${u.id}`} target="_blank" className="flex items-center gap-3 group">
                                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-700 text-sm shrink-0 overflow-hidden ring-2 ring-white group-hover:ring-indigo-200 transition">
                                                                {u.profileImageUrl ? <img src={`/uploads/profiles/${u.profileImageUrl}`} className="w-full h-full object-cover" /> : u.userName[0].toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition">@{u.userName}</div>
                                                                <div className="text-xs text-slate-500 font-medium">{u.name} {u.surname}</div>
                                                            </div>
                                                        </Link>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 font-medium">{u.email}</td>
                                                    <td className="px-6 py-4 flex gap-1.5 flex-wrap">
                                                        {u.isBanned ? <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded text-[10px] font-black border border-red-200 tracking-wider uppercase">Banlı</span> : <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded text-[10px] font-black border border-green-200 tracking-wider uppercase">Aktif</span>}
                                                        {u.isAdmin && <span className="ml-1 px-2.5 py-1 bg-purple-100 text-purple-700 rounded text-[10px] font-black border border-purple-200 tracking-wider uppercase">Admin</span>}
                                                        {u.isExpert && <span className="ml-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-black border border-blue-200 tracking-wider uppercase">Uzman</span>}
                                                        {u.isOfficial && <span className="ml-1 px-2.5 py-1 bg-cyan-100 text-cyan-700 rounded text-[10px] font-black border border-cyan-200 tracking-wider uppercase">Makam</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2 flex-wrap items-center">
                                                            <button onClick={() => handleToggleRole(u.id, 'Admin')} className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition shadow-sm ${u.isAdmin ? 'bg-purple-500 text-white border-purple-600 hover:bg-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Admin</button>
                                                            <button onClick={() => handleToggleRole(u.id, 'Expert')} className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition shadow-sm ${u.isExpert ? 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Uzman</button>
                                                            <button onClick={() => handleToggleRole(u.id, 'Official')} className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition shadow-sm ${u.isOfficial ? 'bg-cyan-500 text-white border-cyan-600 hover:bg-cyan-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Resmi</button>
                                                            <div className="w-px h-5 bg-slate-200 mx-1"></div>
                                                            <button onClick={() => handleBanToggle(u.id, u.isBanned)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition shadow-sm active:scale-95 ${u.isBanned ? 'bg-slate-800 text-white border-slate-900 hover:bg-black' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'}`}>
                                                                {u.isBanned ? 'Ban Kaldır' : 'Banla'}
                                                            </button>
                                                        </div>
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
                                <form onSubmit={handleAddTopic} className="mb-8 flex flex-col md:flex-row gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm items-end">
                                    <div className="flex-1 w-full">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Yeni Kategori Adı</label>
                                        <input type="text" placeholder="Örn: Ulaşım Sorunları" required className="w-full border border-slate-200 shadow-sm rounded-xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} />
                                    </div>
                                    <div className="flex-1 w-full">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Bağlı Olacağı Kurum</label>
                                        <select required className="w-full border border-slate-200 shadow-sm rounded-xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium" value={newTopicInstId} onChange={e => setNewTopicInstId(e.target.value)}>
                                            <option value="">Kurum Seçin...</option>
                                            {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-full md:w-auto">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Görsel (Opsiyonel)</label>
                                        <input type="file" accept="image/*" onChange={e => setNewTopicImage(e.target.files ? e.target.files[0] : null)} className="w-full border border-slate-200 shadow-sm rounded-xl px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <button type="submit" className="w-full md:w-auto bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition">Ekle</button>
                                </form>

                                <div className="mb-6 flex justify-end">
                                    <select className="border border-slate-200 shadow-sm p-3 rounded-xl text-sm bg-white font-bold text-indigo-700" value={topicInstFilter} onChange={e => setTopicInstFilter(e.target.value)}>
                                        <option value="">Tüm Kurumların Kategorileri</option>
                                        {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredTopics.map(topic => {
                                        const topicInst = institutions.find(i => i.id === topic.institutionId);
                                        return (
                                        <div key={topic.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl hover:shadow-md hover:border-indigo-100 transition overflow-hidden flex flex-col relative">
                                            <div className="p-5 flex items-center gap-4 flex-1 mt-2">
                                                <div className="absolute top-0 inset-x-0 h-1" style={{ backgroundColor: topicInst?.primaryColor || '#4f46e5' }}></div>
                                                <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">{topicInst?.name || 'Genel Ağ'}</span>
                                                
                                                {topic.imageName && topic.imageName !== 'default.png' ? (
                                                    <img src={`/uploads/topics/${topic.imageName}`} alt={topic.name} className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0 bg-slate-50" />
                                                ) : (
                                                    <div className="w-14 h-14 rounded-xl bg-indigo-50 text-indigo-300 flex items-center justify-center font-black text-xl border border-indigo-100 shrink-0">
                                                        {topic.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div className="flex flex-col items-start gap-1.5">
                                                    <span className="font-bold text-slate-800 text-base leading-tight">{topic.name}</span>
                                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded border ${topic.status ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                                        {topic.status ? 'Aktif' : 'Pasif'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 border-t border-slate-100 p-3 flex flex-wrap justify-between gap-2">
                                                <button onClick={() => handleToggleTopicStatus(topic)} className={`flex-1 min-w-[70px] px-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition border shadow-sm ${topic.status ? 'bg-white text-rose-500 border-rose-200 hover:bg-rose-50' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>
                                                    {topic.status ? 'Gizle' : 'Aç'}
                                                </button>
                                                <button onClick={() => {
                                                    setEditingTopic(topic);
                                                    setEditTopicName(topic.name);
                                                    setEditTopicInstId(topic.institutionId?.toString() || '1');
                                                    setEditTopicImage(null);
                                                    setEditTopicStatus(topic.status);
                                                }} className="flex-1 min-w-[70px] px-2 py-2 bg-white text-blue-600 border border-blue-200 font-bold hover:bg-blue-50 text-[10px] uppercase tracking-wider rounded-lg transition shadow-sm">
                                                    Düzenle
                                                </button>
                                                <button onClick={() => handleDeleteTopic(topic)} className="flex-1 min-w-[70px] px-2 py-2 bg-white text-red-500 border border-red-200 font-bold hover:bg-red-50 text-[10px] uppercase tracking-wider rounded-lg transition shadow-sm">
                                                    Sil
                                                </button>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>
                        )}

                        {/* 4. KURUMLAR */}
                        {activeTab === 'institutions' && (
                            <div className="animate-fade-in flex flex-col h-full gap-8">
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm">
                                    <h3 className="text-lg font-black text-slate-800 mb-4">Yeni Kurum (Üniversite) Ekle</h3>
                                    <form onSubmit={handleAddInstitution} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Kurum Adı</label>
                                                <input type="text" name="name" required value={instFormData.name} onChange={handleInstChange} placeholder="Örn: Eskişehir Teknik Üniversitesi" className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mail Domain'i</label>
                                                <input type="text" name="domain" required value={instFormData.domain} onChange={handleInstChange} placeholder="Örn: eskisehir.edu.tr" className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Kurum Logosu (Dosya Seçin)</label>
                                                <input type="file" accept="image/*" onChange={e => setInstLogoFile(e.target.files ? e.target.files[0] : null)} className="w-full border border-slate-200 shadow-sm rounded-xl px-2 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tema Rengi</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="color" name="primaryColor" value={instFormData.primaryColor || '#2563eb'} onChange={handleInstChange} className="h-11 w-14 rounded-xl border border-slate-200 cursor-pointer bg-white" />
                                                    <input type="text" name="primaryColor" value={instFormData.primaryColor || ''} onChange={handleInstChange} className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <input id="inst-status" type="checkbox" name="status" checked={instFormData.status} onChange={handleInstChange} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                                            <label htmlFor="inst-status" className="text-sm font-bold text-slate-700">Kurum Aktif (Kayıt Olunabilir)</label>
                                        </div>
                                        {instError && <div className="text-red-600 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100 mt-2">{instError}</div>}
                                        {instSuccess && <div className="text-green-600 text-xs font-bold bg-green-50 p-3 rounded-xl border border-green-100 mt-2">{instSuccess}</div>}
                                        <div className="pt-2 flex justify-end">
                                            <button type="submit" disabled={instLoading} className="bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition">
                                                {instLoading ? 'Ekleniyor...' : 'Kurumu Ekle'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm flex-1 max-h-[500px] overflow-y-auto bg-slate-50/50">
                                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                                        <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-6 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[10px]">Kurum Adı</th>
                                                <th className="px-6 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[10px]">Domain</th>
                                                <th className="px-6 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[10px]">Renk & Durum</th>
                                                <th className="px-6 py-4 text-right font-black text-slate-500 uppercase tracking-widest text-[10px]">İşlemler</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {institutions.map(inst => (
                                                <tr key={inst.id} className="hover:bg-indigo-50/30 transition">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            {inst.logoUrl ? (
                                                                <img src={inst.logoUrl} alt={inst.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm bg-white p-0.5" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-black text-slate-500">{inst.name.charAt(0)}</div>
                                                            )}
                                                            <span className="font-bold text-slate-800">{inst.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 font-medium">@{inst.domain}</td>
                                                    <td className="px-6 py-4 flex items-center gap-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: inst.primaryColor || '#2563eb' }}></span>
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">{inst.primaryColor || '#2563eb'}</span>
                                                        </div>
                                                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded border ${inst.status ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                            {inst.status ? 'Aktif' : 'Pasif'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingInst(inst);
                                                                    setEditInstData({ name: inst.name, domain: inst.domain, primaryColor: inst.primaryColor || '#2563eb', status: inst.status });
                                                                    setEditInstLogo(null);
                                                                }}
                                                                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition border shadow-sm bg-white text-blue-600 border-blue-200 hover:bg-blue-50">
                                                                Düzenle
                                                            </button>
                                                            <button onClick={() => handleToggleInstitutionStatus(inst)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition border shadow-sm ${inst.status ? 'bg-white text-rose-500 border-rose-200 hover:bg-rose-50' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>
                                                                {inst.status ? 'Pasife Al' : 'Aktif Et'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 5. SORUNLAR */}
                        {activeTab === 'problems' && (
                            <div className="animate-fade-in flex flex-col h-full">
                                <div className="flex flex-wrap gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <input type="text" placeholder="Sorun başlığı veya yazar ara..." className="flex-1 min-w-[200px] border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" value={problemSearch} onChange={e => { setProblemSearch(e.target.value); setProblemPage(1); }} />
                                    
                                    <select className="border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm bg-white font-medium text-slate-700" value={problemInst} onChange={e => { setProblemInst(e.target.value); setProblemPage(1); }}>
                                        <option value="">Tüm Kurumlar</option>
                                        {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                    </select>

                                    <select className="border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm bg-white font-medium text-slate-700" value={problemTopicFilter} onChange={e => { setProblemTopicFilter(e.target.value); setProblemPage(1); }}>
                                        <option value="">Tüm Kategoriler</option>
                                        {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>

                                    <select className="border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm bg-white font-medium text-slate-700" value={problemStatus} onChange={e => { setProblemStatus(e.target.value); setProblemPage(1); }}>
                                        <option value="">Aktif Sorunlar</option>
                                        <option value="resolved">Sadece Çözülenler</option>
                                        <option value="highlighted">Sadece Vitrindekiler</option>
                                    </select>
                                </div>

                                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm flex-1 max-h-[600px] overflow-y-auto bg-slate-50/50">
                                    <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                                        <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Sorun Bilgisi</th>
                                                <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Kategoriler (Etiketler)</th>
                                                <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Durum</th>
                                                <th className="px-6 py-4 text-right font-black text-slate-500 uppercase tracking-widest text-[10px]">İşlemler</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {paginatedProblems.map(prob => (
                                                <tr key={prob.id} className="hover:bg-indigo-50/30 transition">
                                                    <td className="px-6 py-4">
                                                        <Link to={`/problem/${prob.id}`} target="_blank" className="font-bold text-slate-800 text-sm hover:text-indigo-600 line-clamp-2 transition mb-1">{prob.title}</Link>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-slate-400 font-medium">{new Date(prob.sendDate).toLocaleDateString('tr-TR')}</span>
                                                            <span className="text-slate-300">•</span>
                                                            <Link to={`/user/${prob.senderId}`} target="_blank" className="text-indigo-600 font-bold text-xs hover:underline">@{prob.senderUsername}</Link>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                                                            {prob.topics && prob.topics.length > 0 ? (
                                                                prob.topics.map(t => (
                                                                    <div key={t.id} className="flex items-center bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md shadow-sm overflow-hidden group">
                                                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">{t.name}</span>
                                                                        <button 
                                                                            onClick={() => handleRemoveTopicFromProblem(prob.id, t.id, t.name)}
                                                                            title="Bu etiketi sorundan kaldır"
                                                                            className="px-1.5 bg-indigo-100 hover:bg-red-500 hover:text-white text-indigo-400 transition-colors h-full flex items-center justify-center opacity-0 group-hover:opacity-100"
                                                                        >
                                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-slate-400 italic">Kategori Yok</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 flex gap-1.5 flex-wrap">
                                                        {prob.isHighlighted && <span className="bg-orange-100 text-orange-700 border border-orange-200 text-[10px] px-2 py-0.5 rounded font-black tracking-wider shadow-sm">VİTRİN</span>}
                                                        {prob.isResolved && <span className="bg-green-100 text-green-700 border border-green-200 text-[10px] px-2 py-0.5 rounded font-black tracking-wider shadow-sm">ÇÖZÜLDÜ (ADMİN)</span>}
                                                        {prob.isResolvedByExpert && <span className="bg-teal-100 text-teal-700 border border-teal-200 text-[10px] px-2 py-0.5 rounded font-black tracking-wider shadow-sm">UZMAN ÇÖZÜMÜ</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => handleToggleProblemResolved(prob.id)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition border shadow-sm ${prob.isResolved ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}>
                                                                {prob.isResolved ? 'Çözüldü İptal' : 'Çözüldü Yap'}
                                                            </button>
                                                            <button onClick={() => handleToggleHighlight(prob.id, 'Problem')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition border shadow-sm ${prob.isHighlighted ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'}`}>
                                                                {prob.isHighlighted ? 'Vitrinden Al' : 'Vitrine Koy'}
                                                            </button>
                                                            <button onClick={() => handleDeleteProblem(prob.id)} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-white text-rose-500 border border-rose-200 hover:bg-rose-50 transition shadow-sm">Sil</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-between items-center mt-4 px-2">
                                    <button onClick={() => setProblemPage(p => Math.max(1, p - 1))} disabled={problemPage === 1} className="px-4 py-2 bg-white border rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-sm">Önceki</button>
                                    <span className="text-sm font-bold text-slate-600">Sayfa {problemPage} / {Math.ceil(filteredProblems.length / ITEMS_PER_PAGE) || 1}</span>
                                    <button onClick={() => setProblemPage(p => p + 1)} disabled={problemPage >= Math.ceil(filteredProblems.length / ITEMS_PER_PAGE)} className="px-4 py-2 bg-white border rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-sm">Sonraki</button>
                                </div>
                            </div>
                        )}

                        {/* 6. ÇÖZÜMLER */}
                        {activeTab === 'solutions' && (
                            <div className="animate-fade-in flex flex-col h-full">
                                <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <input type="text" placeholder="Çözüm veya yazar ara..." className="flex-1 border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" value={solutionSearch} onChange={e => { setSolutionSearch(e.target.value); setSolutionPage(1); }} />
                                    <select className="border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm bg-white font-medium text-slate-700" value={solutionInst} onChange={e => { setSolutionInst(e.target.value); setSolutionPage(1); }}>
                                        <option value="">Tüm Kurumlar</option>
                                        {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                    </select>
                                    <select className="border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm bg-white font-medium text-slate-700" value={solutionStatus} onChange={e => { setSolutionStatus(e.target.value); setSolutionPage(1); }}>
                                        <option value="">Aktif Çözümler</option>
                                        <option value="highlighted">Sadece Vitrindekiler</option>
                                    </select>
                                </div>
                                <div className="space-y-6 flex-1 overflow-y-auto pr-2 max-h-[600px]">
                                    {paginatedSolutionsGroups.map((group: any, idx: number) => (
                                        <div key={idx} className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                                            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                                                <div>
                                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">İlgili Sorun</span>
                                                    <Link to={`/problem/${group.problemId}`} target="_blank" className="font-black text-slate-800 text-lg hover:text-indigo-600 transition flex items-center gap-2">
                                                        {group.problemName}
                                                    </Link>
                                                </div>
                                            </div>
                                            <div className="p-6 space-y-4">
                                                {group.solutions.map((sol: any) => (
                                                    <div key={sol.id} className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-start gap-4 hover:shadow-md transition">
                                                        <div>
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <Link to={`/user/${sol.senderId}`} target="_blank" className="font-bold text-indigo-900 text-sm hover:underline">@{sol.senderUsername}</Link>
                                                                <span className="text-[10px] text-slate-400 font-medium">{new Date(sol.sendDate).toLocaleDateString('tr-TR')}</span>
                                                                {sol.isHighlighted && <span className="bg-orange-100 text-orange-700 border border-orange-200 text-[10px] px-2 py-0.5 rounded font-black tracking-wider shadow-sm">VİTRİN</span>}
                                                            </div>
                                                            <p className="text-sm text-slate-700 line-clamp-2">{sol.title}</p>
                                                        </div>
                                                        <div className="flex gap-2 shrink-0">
                                                            <Link to={`/problem/${group.problemId}?solution=${sol.id}`} target="_blank" className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition shadow-sm">Çözüme Git</Link>
                                                            <button onClick={() => handleToggleHighlight(sol.id, 'Solution')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition border shadow-sm ${sol.isHighlighted ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'}`}>
                                                                {sol.isHighlighted ? 'Vitrinden Al' : 'Vitrine Koy'}
                                                            </button>
                                                            <button onClick={() => handleDeleteSolution(sol.id)} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-white text-rose-500 border border-rose-200 hover:bg-rose-50 transition shadow-sm">Sil</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center mt-4 px-2">
                                    <button onClick={() => setSolutionPage(p => Math.max(1, p - 1))} disabled={solutionPage === 1} className="px-4 py-2 bg-white border rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-sm">Önceki</button>
                                    <span className="text-sm font-bold text-slate-600">Sayfa {solutionPage} / {Math.ceil(groupedSolutionsArray.length / ITEMS_PER_PAGE) || 1}</span>
                                    <button onClick={() => setSolutionPage(p => p + 1)} disabled={solutionPage >= Math.ceil(groupedSolutionsArray.length / ITEMS_PER_PAGE)} className="px-4 py-2 bg-white border rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-sm">Sonraki</button>
                                </div>
                            </div>
                        )}

                        {/* 7. BEKLEYEN ONAYLAR */}
                        {activeTab === 'expert-approvals' && (
                            <div className="space-y-6 animate-fade-in-down">
                                {groupedPendingSolutions.length === 0 ? (
                                    <div className="bg-slate-50 p-12 rounded-3xl text-center border border-slate-100 shadow-inner">
                                        <div className="text-6xl mb-4 drop-shadow-sm">🎉</div>
                                        <h3 className="text-xl font-black text-slate-700">Her şey tertemiz!</h3>
                                        <p className="text-slate-500 mt-2 font-medium">Şu an onay bekleyen hiçbir uzman çözümü yok.</p>
                                    </div>
                                ) : (
                                    groupedPendingSolutions.map((group: any, idx: number) => (
                                        <div key={idx} className="bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition overflow-hidden">
                                            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                                <div>
                                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">İlgili Sorun</span>
                                                    <Link to={`/problem/${group.problemId}`} target="_blank" className="font-black text-slate-800 text-lg hover:text-indigo-600 transition">
                                                        {group.problemName}
                                                    </Link>
                                                </div>
                                                <Link to={`/problem/${group.problemId}`} target="_blank" className="shrink-0 text-[11px] uppercase tracking-wider bg-white border border-slate-200 px-4 py-2 rounded-xl font-black text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition shadow-sm">
                                                    Soruna Git ↗
                                                </Link>
                                            </div>
                                            <div className="p-6 space-y-4 bg-white">
                                                {group.solutions.map((sol: any) => (
                                                    <div key={sol.id} className="bg-indigo-50/40 border border-indigo-100 p-5 rounded-2xl relative shadow-sm">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <Link to={`/user/${sol.senderId}`} target="_blank" className="h-10 w-10 rounded-full bg-indigo-200 flex items-center justify-center font-black text-indigo-700 text-sm shrink-0 overflow-hidden ring-2 ring-white hover:ring-indigo-300 transition">
                                                                    {sol.senderImageUrl ? <img src={`/uploads/profiles/${sol.senderImageUrl}`} className="w-full h-full object-cover" /> : sol.senderUsername[0].toUpperCase()}
                                                                </Link>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Uzman</span>
                                                                        <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest shadow-sm">Onay Bekliyor</span>
                                                                    </div>
                                                                    <Link to={`/user/${sol.senderId}`} target="_blank" className="font-bold text-indigo-900 text-sm hover:underline">@{sol.senderUsername}</Link>
                                                                </div>
                                                            </div>
                                                            <span className="text-xs text-slate-400 font-bold bg-white px-2.5 py-1 rounded-md border border-slate-100 shadow-sm">{new Date(sol.sendDate).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="text-slate-700 text-sm leading-relaxed mb-5 bg-white p-4 rounded-xl border border-indigo-50 shadow-sm">{sol.description}</p>
                                                        <div className="flex gap-3 pt-4 border-t border-indigo-100/50">
                                                            <button onClick={() => handleApproveSolution(sol)} className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:from-emerald-600 hover:to-green-700 transition shadow-md shadow-emerald-500/20 active:scale-95">
                                                                Onayla & Çözüldü Yap
                                                            </button>
                                                            <button onClick={() => handleRejectSolution(sol.id)} className="px-6 py-2.5 bg-white border border-rose-200 text-rose-600 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-rose-50 transition shadow-sm active:scale-95">
                                                                Reddet
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* 8. ŞİKAYETLER */}
                        {activeTab === 'reports' && (
                            <div className="animate-fade-in flex flex-col h-full">
                                <div className="flex bg-slate-50 p-2 rounded-2xl mb-8 border border-slate-200 shadow-inner">
                                    <button onClick={() => setReportTab('problems')} className={`flex-1 py-3 px-6 font-bold text-sm rounded-xl transition-all ${reportTab === 'problems' ? 'bg-white shadow-md text-red-600 border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}>
                                        Sorun Şikayetleri <span className="ml-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">{problemReports.length}</span>
                                    </button>
                                    <button onClick={() => setReportTab('solutions')} className={`flex-1 py-3 px-6 font-bold text-sm rounded-xl transition-all ${reportTab === 'solutions' ? 'bg-white shadow-md text-red-600 border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}>
                                        Çözüm Şikayetleri <span className="ml-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">{solutionReports.length}</span>
                                    </button>
                                    <button onClick={() => setReportTab('users')} className={`flex-1 py-3 px-6 font-bold text-sm rounded-xl transition-all ${reportTab === 'users' ? 'bg-white shadow-md text-red-600 border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}>
                                        Kullanıcı Şikayetleri <span className="ml-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">{userReports.length}</span>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto pr-2 space-y-5 max-h-[600px]">
                                    {reportTab === 'problems' && problemReports.map(report => {
                                        const targetProblem = problems.find(p => p.id === report.targetId);
                                        return (
                                            <div key={report.id} className="border border-red-100 bg-white p-6 rounded-3xl shadow-sm hover:shadow-md transition relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-red-400 to-rose-600"></div>
                                                <div className="mb-6"><p className="text-rose-900 font-medium bg-rose-50 p-4 rounded-xl border border-rose-100 text-sm">{report.reason}</p></div>
                                                {targetProblem ? (
                                                    <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mt-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                                        <div>
                                                            <Link to={`/problem/${targetProblem.id}`} target="_blank" className="font-black text-lg text-slate-800 hover:text-indigo-600 transition">{targetProblem.title}</Link>
                                                        </div>
                                                        <div className="flex gap-2 shrink-0">
                                                            <button onClick={() => handleResolveReport(report.id)} className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 shadow-sm transition">Kapat</button>
                                                            <button onClick={() => handleDeleteReportedContent(report.id, 'Problem', targetProblem.id)} className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-red-500 rounded-xl hover:bg-red-600 shadow-md transition">Sil</button>
                                                        </div>
                                                    </div>
                                                ) : <button onClick={() => handleResolveReport(report.id)} className="text-xs bg-slate-100 p-2 rounded">Kapat (Zaten Silinmiş)</button>}
                                            </div>
                                        )
                                    })}
                                    {reportTab === 'solutions' && solutionReports.map(report => {
                                        const targetSolution = solutions.find(s => s.id === report.targetId);
                                        return (
                                            <div key={report.id} className="border border-orange-100 bg-white p-6 rounded-3xl shadow-sm hover:shadow-md transition relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-orange-400 to-amber-500"></div>
                                                <div className="mb-6"><p className="text-orange-900 font-medium bg-orange-50 p-4 rounded-xl border border-orange-100 text-sm">{report.reason}</p></div>
                                                {targetSolution ? (
                                                    <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mt-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                                        <div className="font-black text-lg text-slate-800 line-clamp-2">{targetSolution.title}</div>
                                                        <div className="flex gap-2 shrink-0">
                                                            <button onClick={() => handleResolveReport(report.id)} className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 shadow-sm transition">Kapat</button>
                                                            <button onClick={() => handleDeleteReportedContent(report.id, 'Solution', targetSolution.id)} className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-orange-500 rounded-xl hover:bg-orange-600 shadow-md transition">Sil</button>
                                                        </div>
                                                    </div>
                                                ) : <button onClick={() => handleResolveReport(report.id)} className="text-xs bg-slate-100 p-2 rounded">Kapat (Zaten Silinmiş)</button>}
                                            </div>
                                        )
                                    })}
                                    {reportTab === 'users' && userReports.map(report => {
                                        const targetUser = users.find(u => u.id === report.targetId);
                                        return (
                                            <div key={report.id} className="border border-purple-100 bg-white p-6 rounded-3xl shadow-sm hover:shadow-md transition relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-purple-400 to-indigo-600"></div>
                                                <div className="mb-6"><p className="text-purple-900 font-medium bg-purple-50 p-4 rounded-xl border border-purple-100 text-sm">{report.reason}</p></div>
                                                {targetUser ? (
                                                    <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mt-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                                        <Link to={`/user/${targetUser.id}`} target="_blank" className="font-black text-lg text-slate-800 hover:text-purple-600 transition">@{targetUser.userName}</Link>
                                                        <div className="flex gap-2 shrink-0">
                                                            <button onClick={() => handleResolveReport(report.id)} className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 shadow-sm transition">Kapat</button>
                                                            <button onClick={() => { handleBanToggle(targetUser.id, targetUser.isBanned); handleResolveReport(report.id); }} className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-md transition">Banla</button>
                                                        </div>
                                                    </div>
                                                ) : <button onClick={() => handleResolveReport(report.id)} className="text-xs bg-slate-100 p-2 rounded">Kapat (Zaten Silinmiş)</button>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 9. YENİ: İSTEK VE ÖNERİLER (GELEN KUTUSU) */}
                        {activeTab === 'feedbacks' && (
                            <div className="animate-fade-in flex flex-col h-full">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                                    <h2 className="text-2xl font-black text-slate-800">İstek ve Öneriler</h2>
                                    <span className="bg-amber-50 text-amber-700 px-4 py-1.5 rounded-lg text-sm font-bold border border-amber-100 shadow-sm">
                                        {feedbacks.filter(f => !f.isRead).length} Okunmamış Mesaj
                                    </span>
                                </div>

                                <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                                    {feedbacks.length === 0 ? (
                                        <div className="text-center py-12 text-slate-500 font-medium">Henüz hiçbir istek veya öneri gelmedi.</div>
                                    ) : (
                                        feedbacks.sort((a, b) => b.isRead === a.isRead ? 0 : a.isRead ? 1 : -1).map(fb => (
                                            <div key={fb.id} className={`p-6 rounded-3xl border transition shadow-sm relative overflow-hidden ${fb.isRead ? 'bg-white border-slate-200 opacity-80 hover:opacity-100' : 'bg-amber-50/40 border-amber-200'}`}>
                                                {!fb.isRead && <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                                                
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                                    <div>
                                                        <h4 className="text-lg font-black text-slate-800">{fb.title}</h4>
                                                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                            <Link to={`/user/${fb.userId}`} target="_blank" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition">@{fb.userName}</Link>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="text-[10px] font-medium text-slate-500">{fb.userEmail}</span>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="text-[10px] font-medium text-slate-500">{new Date(fb.sendDate).toLocaleString('tr-TR')}</span>
                                                        </div>
                                                    </div>
                                                    {!fb.isRead && (
                                                        <button 
                                                            onClick={async () => {
                                                                try {
                                                                    await feedbackService.markAsRead(fb.id);
                                                                    setFeedbacks(prev => prev.map(item => item.id === fb.id ? { ...item, isRead: true } : item));
                                                                } catch { alert("İşlem başarısız."); }
                                                            }}
                                                            className="shrink-0 px-4 py-2 bg-white border border-amber-200 text-amber-600 font-black text-[10px] uppercase tracking-wider rounded-xl shadow-sm hover:bg-amber-50 hover:border-amber-300 transition active:scale-95 flex items-center gap-1.5"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
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
                            </div>
                        )}

                        {/* 10. SİEM LOGLARI */}
                        {activeTab === 'logs' && (
                            <div className="animate-fade-in flex flex-col h-full">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                                    <h2 className="text-2xl font-black text-slate-800">Sistem Logları (SIEM)</h2>
                                    <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-lg text-sm font-bold border border-indigo-100 shadow-sm">{logs.length} Kayıt Gösteriliyor</span>
                                </div>

                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-inner mb-8">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Veritabanı Filtreleme</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                                        <div className="lg:col-span-2 flex flex-col sm:flex-row gap-4">
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1.5">Arama (IP, User, Hata)</label>
                                                <input type="text" placeholder="IP Adresi veya metin..." className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white" value={logFilter.searchText || ''} onChange={e => setLogFilter({ ...logFilter, searchText: e.target.value })} />
                                            </div>
                                            <div className="sm:w-40 shrink-0">
                                                <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1.5">Tarih</label>
                                                <input type="date" className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white" value={logFilter.endDate ? logFilter.endDate.split('T')[0] : ''} onChange={e => setLogFilter({ ...logFilter, endDate: e.target.value })} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Kategori</label>
                                            <select className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 outline-none text-sm bg-white" value={logFilter.category || ''} onChange={e => { setLogFilter({ ...logFilter, category: e.target.value }); setLogPage(1); }}>
                                                <option value="">Tümü</option>
                                                <option value="Auth">Auth (Giriş/Kayıt)</option>
                                                <option value="Content">Content (İçerik)</option>
                                                <option value="Institution">Institution (Kurum)</option>
                                                <option value="Moderation">Moderation (Yönetim)</option>
                                                <option value="System">System (Sistem)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Seviye</label>
                                            <select className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 outline-none text-sm bg-white" value={logFilter.level || ''} onChange={e => { setLogFilter({ ...logFilter, level: e.target.value }); setLogPage(1); }}>
                                                <option value="">Tümü</option>
                                                <option value="Info">Bilgi (Info)</option>
                                                <option value="Warning">Uyarı (Warning)</option>
                                                <option value="Error">Hata (Error)</option>
                                                <option value="Critical">Kritik (Critical)</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={handleFilterLogs} className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl text-sm shadow-md hover:bg-black transition">Filtrele</button>
                                            <button onClick={clearLogFilters} className="px-4 py-3 bg-white border border-slate-300 text-slate-600 font-bold rounded-xl text-sm shadow-sm hover:bg-slate-50">Sil</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm flex-1 max-h-[600px] bg-slate-50/50">
                                    <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                                        <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px] whitespace-nowrap">Tarih</th>
                                                <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Tetikleyen & Kaynak</th>
                                                <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Olay Tipi</th>
                                                <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px] w-1/2">Mesaj & Detay</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {logs.length === 0 ? (
                                                <tr><td colSpan={4} className="px-6 py-16 text-center text-slate-500 font-medium text-lg bg-slate-50">Log kaydı bulunamadı.</td></tr>
                                            ) : (
                                                logs.map(log => (
                                                    <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors">
                                                        <td className="px-5 py-4 text-xs font-bold text-slate-600 whitespace-nowrap align-top">
                                                            {new Date(log.creationDate).toLocaleDateString('tr-TR')} <br />
                                                            <span className="text-slate-400 font-normal">{new Date(log.creationDate).toLocaleTimeString('tr-TR')}</span>
                                                        </td>
                                                        <td className="px-5 py-4 align-top">
                                                            <div className="flex flex-col gap-1.5 items-start">
                                                                <div className="flex items-center gap-1 text-xs font-bold text-indigo-900 bg-indigo-50 px-2 py-1 rounded">
                                                                    <svg className="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                                    {log.userName || 'Sistem'}
                                                                </div>
                                                                <div className="flex items-center gap-1 text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                                                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                                                    {log.ipAddress}:{log.port}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 align-top">
                                                            <div className="flex flex-col gap-1.5 items-start">
                                                                <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border shadow-sm 
                                                            ${log.level === 'Info' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                                        log.level === 'Warning' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                                                            log.level === 'Error' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                                                                log.level === 'Critical' ? 'bg-red-600 text-white border-red-700' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                                                    {log.level}
                                                                </span>
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                                    {log.category} / {log.action}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 text-xs text-slate-700 font-medium leading-relaxed max-w-lg break-words align-top">
                                                            {log.message}
                                                            {log.details && (
                                                                <details className="mt-2 text-[10px] font-mono text-slate-400 bg-slate-50 p-2 rounded border border-slate-100 cursor-pointer">
                                                                    <summary className="font-bold text-slate-500 hover:text-indigo-500">Teknik Detayı Göster (Exception StackTrace)</summary>
                                                                    <div className="mt-2 whitespace-pre-wrap">{log.details}</div>
                                                                </details>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-between items-center mt-4 px-2">
                                    <button onClick={() => setLogPage(p => Math.max(1, p - 1))} disabled={logPage === 1} className="px-4 py-2 bg-white border rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-sm">Önceki Sayfa</button>
                                    <span className="text-sm font-bold text-slate-600">Sayfa {logPage}</span>
                                    <button onClick={() => setLogPage(p => p + 1)} disabled={logs.length < 20} className="px-4 py-2 bg-white border rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-sm">Sonraki Sayfa</button>
                                </div>
                            </div>
                        )}

                    </div>
                </main>
            </div>

            {/* DÜZENLEME MODALLARI KISMI */}
            {editingTopic && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-fade-in-down border border-slate-100">
                        <h3 className="text-xl font-black text-slate-800 mb-4">Kategori Düzenle</h3>
                        <form onSubmit={handleUpdateTopic} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Kategori Adı</label>
                                <input type="text" required value={editTopicName} onChange={e => setEditTopicName(e.target.value)} className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-slate-50" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Bağlı Olduğu Kurum</label>
                                <select required value={editTopicInstId} onChange={e => setEditTopicInstId(e.target.value)} className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-slate-50 font-medium text-slate-700">
                                    <option value="">Kurum Seçin...</option>
                                    {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Yeni Resim (Opsiyonel)</label>
                                <input type="file" accept="image/*" onChange={e => setEditTopicImage(e.target.files ? e.target.files[0] : null)} className="w-full border border-slate-200 shadow-sm rounded-xl px-2 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-slate-50" />
                                {editingTopic.imageName && editingTopic.imageName !== 'default.png' && <p className="text-xs text-slate-500 mt-2">Mevcut Resim: {editingTopic.imageName}</p>}
                            </div>
                            <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-100">
                                <input type="checkbox" id="topicStatus" checked={editTopicStatus} onChange={e => setEditTopicStatus(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                                <label htmlFor="topicStatus" className="text-sm font-bold text-slate-700">Kategori Aktif (Sitede Gösterilsin)</label>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setEditingTopic(null)} className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition shadow-sm">İptal</button>
                                <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition active:scale-95">Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editingInst && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-lg animate-fade-in-down border border-slate-100">
                        <h3 className="text-xl font-black text-slate-800 mb-4">Kurum Düzenle</h3>
                        <form onSubmit={handleUpdateInst} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Kurum Adı</label>
                                    <input type="text" required value={editInstData.name} onChange={e => setEditInstData({ ...editInstData, name: e.target.value })} className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 outline-none text-sm bg-slate-50" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Domain</label>
                                    <input type="text" required value={editInstData.domain} onChange={e => setEditInstData({ ...editInstData, domain: e.target.value })} className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 outline-none text-sm bg-slate-50" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tema Rengi</label>
                                    <div className="flex items-center gap-2">
                                        <input type="color" value={editInstData.primaryColor} onChange={e => setEditInstData({ ...editInstData, primaryColor: e.target.value })} className="h-11 w-14 rounded-xl border border-slate-200 cursor-pointer shadow-sm" />
                                        <input type="text" value={editInstData.primaryColor} onChange={e => setEditInstData({ ...editInstData, primaryColor: e.target.value })} className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 outline-none text-sm bg-slate-50" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Yeni Logo (Opsiyonel)</label>
                                    <input type="file" accept="image/*" onChange={e => setEditInstLogo(e.target.files ? e.target.files[0] : null)} className="w-full border border-slate-200 shadow-sm rounded-xl px-2 py-2 outline-none text-sm bg-slate-50" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-100">
                                <input type="checkbox" id="instStatus" checked={editInstData.status} onChange={e => setEditInstData({ ...editInstData, status: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                                <label htmlFor="instStatus" className="text-sm font-bold text-slate-700">Kurum Aktif (Sitede Gösterilsin)</label>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setEditingInst(null)} className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition shadow-sm">İptal</button>
                                <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition active:scale-95">Güncelle</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;