import { NavLink, Outlet } from 'react-router-dom';

const nav = [
    { to: '/admin/metrics/overview',          label: 'Genel',      icon: '📊' },
    { to: '/admin/metrics/capabilities',     label: 'Yetki',      icon: '🔐' },
    { to: '/admin/metrics/workflow',         label: 'Workflow',   icon: '⚙️' },
    { to: '/admin/metrics/users',            label: 'Kullanıcı',  icon: '👥' },
    { to: '/admin/metrics/system',           label: 'Sistem',     icon: '🖥️' },
    { to: '/admin/metrics/audit-log',        label: 'Audit Log',  icon: '📋' },
];

export default function DashboardLayout() {
    return (
        <div className="flex flex-col">
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="flex items-center gap-1 overflow-x-auto px-6 py-2">
                    {nav.map(n => (
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
