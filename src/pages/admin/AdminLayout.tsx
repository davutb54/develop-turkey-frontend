import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { reportService } from '../../services/reportService';
import { feedbackService } from '../../services/feedbackService';

type NavItem = {
    to: string;
    label: string;
    icon: string;
    badge?: string;
    isAlert?: boolean;
    capability?: string | string[];
};

const nav: { group: string; items: NavItem[] }[] = [
    {
        group: 'Genel',
        items: [
            { to: '/admin/command-center', label: 'Canlı Radar', icon: 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z', capability: 'page.admin.monitor' },
            { to: '/admin/overview', label: 'Genel Bakış', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', capability: 'page.admin.overview' },
        ],
    },
    {
        group: 'İçerik',
        items: [
            { to: '/admin/problems', label: 'Sorunlar', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', capability: 'page.admin.problems' },
            { to: '/admin/solutions', label: 'Çözümler', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', capability: 'page.admin.solutions' },
            { to: '/admin/topics', label: 'Kategoriler', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', capability: 'page.admin.topics' },
            { to: '/admin/expert-approvals', label: 'Uzman Onayları', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', badge: 'approvals', capability: 'page.admin.expert_approvals' },
        ],
    },
    {
        group: 'Kullanıcılar',
        items: [
            { to: '/admin/users', label: 'Kullanıcılar', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', capability: 'page.admin.users' },
            { to: '/admin/institutions', label: 'Kurumlar (Ağlar)', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', capability: 'page.admin.institutions' },
        ],
    },
    {
        group: 'Moderasyon',
        items: [
            { to: '/admin/reports', label: 'Şikayet Merkezi', icon: 'M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9', badge: 'reports', isAlert: true, capability: 'page.admin.reports' },
            { to: '/admin/feedbacks', label: 'Gelen Kutusu', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', badge: 'feedbacks', isAlert: true, capability: 'page.admin.feedbacks' },
            { to: '/admin/chat', label: 'Sohbet', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', capability: 'page.admin.chat' },
        ],
    },
    {
        group: 'Sistem',
        items: [
            { to: '/admin/security', label: 'Güvenlik İzleme', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', capability: 'page.admin.security' },
            { to: '/admin/settings', label: 'Sistem Ayarları', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', capability: 'page.admin.settings' },
            { to: '/admin/announcements', label: 'Duyurular', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z', capability: 'page.admin.announcements' },
            { to: '/admin/logs', label: 'Sistem Logları', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', capability: 'page.admin.logs' },
            { to: '/admin/activity-logs', label: 'Aksiyon Geçmişi', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', capability: 'page.admin.activity_logs' },
            { to: '/admin/kill-switch', label: 'Kill Switch', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636', capability: 'page.admin.kill_switch' },
        ],
    },
    {
        group: 'İçerik Yönetimi',
        items: [
            { to: '/admin/agreements', label: 'Sözleşmeler', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', capability: 'page.admin.agreements' },
            { to: '/admin/email-templates', label: 'E-posta Şablonları', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', capability: 'page.admin.email_templates' },
            { to: '/admin/corporate', label: 'Hakkımızda', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', capability: 'page.admin.corporate' },
        ],
    },
    {
        group: 'Araçlar',
        items: [
            { to: '/admin/features', label: 'Modül Yönetimi', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', capability: 'page.admin.features' },
            { to: '/admin/workflow', label: 'Workflow Builder', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', capability: 'page.admin.workflow' },
        ],
    },
    {
        group: 'Yetkiler',
        items: [
            { to: '/admin/capabilities', label: 'Yetki Yönetimi', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z', capability: 'page.admin.capabilities' },
            { to: '/admin/capability-templates', label: 'Yetki Şablonları', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', capability: 'page.admin.capability_templates' },
            { to: '/admin/capability-audit', label: 'Yetki Logları', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', capability: 'page.admin.capability_audit' },
        ],
    },
    {
        group: 'Metrikler',
        items: [
            { to: '/admin/metrics/overview', label: 'Dashboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', capability: 'page.admin.metrics' },
            { to: '/admin/metrics/capabilities', label: 'Yetkiler', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z', capability: 'page.admin.metrics' },
            { to: '/admin/metrics/workflow', label: 'Workflow', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', capability: 'page.admin.metrics' },
            { to: '/admin/metrics/users', label: 'Kullanıcı', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', capability: 'page.admin.metrics' },
            { to: '/admin/metrics/system', label: 'Sistem', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-2', capability: 'page.admin.metrics' },
            { to: '/admin/metrics/audit-log', label: 'Audit Log', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', capability: 'page.admin.metrics' },
            { to: '/admin/metrics/dead-letters', label: 'Dead-Letter', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', capability: 'page.admin.metrics' },
        ],
    },
];

export default function AdminLayout() {
    const { hasCapability, userId } = useAuth();
    const navigate = useNavigate();
    const [badges, setBadges] = useState({ reports: 0, feedbacks: 0, approvals: 0 });
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const goAdminHome = () => {
        setSidebarOpen(false);
        navigate('/');
    };

    useEffect(() => {
        if (userId === false) navigate('/login');
        if (userId !== null && userId !== false && !hasCapability('admin.system_access')) navigate('/');
    }, [userId, hasCapability]);

    useEffect(() => {
        if (!hasCapability('admin.system_access')) return;
        const fetchBadges = async () => {
            try {
                const [reportsRes, feedbacksRes, approvalsRes] = await Promise.allSettled([
                    reportService.getPending(),
                    feedbackService.getAllPaged({ page: 1, pageSize: 1 }),
                    adminService.getPendingExpertSolutions(),
                ]);
                setBadges({
                    reports: reportsRes.status === 'fulfilled' && reportsRes.value.data.success ? (reportsRes.value.data.data?.length ?? 0) : 0,
                    feedbacks: feedbacksRes.status === 'fulfilled' && feedbacksRes.value.data.success ? (feedbacksRes.value.data.totalCount ?? 0) : 0,
                    approvals: approvalsRes.status === 'fulfilled' && approvalsRes.value.data.success ? (approvalsRes.value.data.data?.length ?? 0) : 0,
                });
            } catch { /* sessizce geç */ }
        };
        fetchBadges();
    }, [hasCapability]);

    if (userId === null) return null;

    return (
        <div className="min-h-screen flex bg-slate-50">
            {/* MOBİL OVERLAY — sidebar açıkken arka planı karartır */}
            <div
                className={`fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* SOL SIDEBAR — masaüstü sticky, mobil fixed drawer */}
            <aside className={`w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-y-auto shadow-sm z-30 fixed inset-y-0 left-0 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:bottom-auto lg:left-auto lg:h-screen lg:z-10 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={goAdminHome}
                        className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition"
                        aria-label="Yönetim Paneli ana sayfasına git"
                    >
                        Yönetim Paneli
                    </button>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                        aria-label="Menüyü Kapat"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
                    {nav.map(group => {
                        const visibleItems = group.items.filter(item => {
                            if (!item.capability) return true;
                            if (Array.isArray(item.capability)) return item.capability.some(c => hasCapability(c));
                            return hasCapability(item.capability);
                        });
                        if (visibleItems.length === 0) return null;
                        return (
                            <div key={group.group}>
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 mb-1">{group.group}</div>
                                <div className="space-y-0.5">
                                    {visibleItems.map(item => {
                                        const badgeCount = item.badge ? badges[item.badge as keyof typeof badges] : 0;
                                        return (
                                            <NavLink
                                                key={item.to}
                                                to={item.to}
                                                onClick={() => setSidebarOpen(false)}
                                                className={({ isActive }) =>
                                                    `w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                                        isActive
                                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                                                            : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                                                    }`
                                                }
                                            >
                                                {({ isActive }) => (
                                                    <>
                                                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                                                        </svg>
                                                        <span className="flex-1 truncate">{item.label}</span>
                                                        {badgeCount > 0 && (
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                                                                item.isAlert
                                                                    ? 'bg-red-500 text-white'
                                                                    : isActive
                                                                        ? 'bg-white/20 text-white'
                                                                        : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                                {badgeCount}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </NavLink>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </nav>
            </aside>

            {/* SAĞ İÇERİK */}
            <main className="flex-1 min-h-screen overflow-auto min-w-0">
                {/* Mobil üst çubuk — hamburger butonu */}
                <div className="lg:hidden sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                        aria-label="Menüyü Aç"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={goAdminHome}
                        className="text-xs font-black text-slate-500 uppercase tracking-widest hover:text-slate-700 transition"
                        aria-label="Yönetim Paneli ana sayfasına git"
                    >
                        Yönetim Paneli
                    </button>
                </div>
                <Outlet />
            </main>
        </div>
    );
}
