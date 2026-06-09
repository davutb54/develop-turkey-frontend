import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

const nav = [
    { to: '/admin/metrics/overview',      label: 'Genel',      icon: '📊', capability: 'admin.dashboard_view' },
    { to: '/admin/metrics/capabilities',  label: 'Yetki',      icon: '🔐', capability: 'admin.metrics_capability_view' },
    { to: '/admin/metrics/workflow',      label: 'Workflow',   icon: '⚙️', capability: 'admin.metrics_workflow_view' },
    { to: '/admin/metrics/users',         label: 'Kullanıcı',  icon: '👥', capability: 'admin.metrics_user_view' },
    { to: '/admin/metrics/system',        label: 'Sistem',     icon: '🖥️', capability: 'admin.metrics_system_health_view' },
    { to: '/admin/metrics/audit-log',     label: 'Audit Log',  icon: '📋', capability: 'admin.audit_read' },
];

export default function DashboardLayout() {
    const { hasCapability } = useAuth();
    const visibleNav = nav.filter(n => hasCapability(n.capability));

    if (visibleNav.length === 0) {
        return <div className="p-10 text-center text-slate-500">Bu sayfayı görüntüleme yetkiniz yok.</div>;
    }

    return (
        <div className="flex flex-col">
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="flex items-center gap-1 overflow-x-auto px-6 py-2">
                    {visibleNav.map(n => (
                        <NavLink
                            key={n.to}
                            to={n.to}
                            className={({ isActive }) =>
                                `flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition
                                ${isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`
                            }
                        >
                            <span>{n.icon}</span>
                            <span>{n.label}</span>
                        </NavLink>
                    ))}
                </div>
            </div>
            <div className="p-6">
                <Outlet />
            </div>
        </div>
    );
}
