import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useEffect } from 'react';

const nav = [
    { to: '/admin/dashboard',            label: 'Genel',       icon: '📊', end: true },
    { to: '/admin/dashboard/capabilities', label: 'Yetki',      icon: '🔐' },
    { to: '/admin/dashboard/workflow',     label: 'Workflow',   icon: '⚙️' },
    { to: '/admin/dashboard/users',        label: 'Kullanıcı',  icon: '👥' },
    { to: '/admin/dashboard/system',       label: 'Sistem',     icon: '🖥️' },
    { to: '/admin/dashboard/audit-log',    label: 'Audit Log',  icon: '📋' },
];

export default function DashboardLayout() {
    const { isAdmin, userId } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (userId === false) navigate('/login');
        if (userId !== null && !isAdmin) navigate('/');
    }, [userId, isAdmin]);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto py-2">
                    {nav.map(n => (
                        <NavLink
                            key={n.to}
                            to={n.to}
                            end={n.end}
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
            <div className="max-w-7xl mx-auto px-4 py-6">
                <Outlet />
            </div>
        </div>
    );
}
