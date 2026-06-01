import { Navigate } from 'react-router-dom';

// Admin paneli /admin/overview adresine taşındı.
// Eski /admin URL'lerine gelen istekler buraya düşmez (App.tsx nested route ile
// /admin artık AdminLayout'a bağlı), ama dosya import güvenliği için korunuyor.
export default function AdminDashboard() {
    return <Navigate to="/admin/overview" replace />;
}
