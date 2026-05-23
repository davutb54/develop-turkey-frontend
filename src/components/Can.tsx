import React from 'react';
import { useAuth } from '../context/AuthContext';

interface CanProps {
    capability: string | string[];
    /** Tüm kodlar gerekli mi? Varsayılan false = herhangi biri yeterli */
    requireAll?: boolean;
    fallback?: React.ReactNode;
    children: React.ReactNode;
}

/**
 * Kullanıcı verilen capability'lere sahipse `children` render edilir.
 * Sahip değilse `fallback` (varsayılan: null) render edilir.
 *
 * @example
 * <Can capability="admin.user_ban">
 *   <BanButton />
 * </Can>
 *
 * <Can capability={["expert.solution_approve", "admin.system_access"]} fallback={<NotAuthorized />}>
 *   <ApproveSection />
 * </Can>
 */
export const Can: React.FC<CanProps> = ({ capability, requireAll = false, fallback = null, children }) => {
    const { hasCapability } = useAuth();
    const codes = Array.isArray(capability) ? capability : [capability];
    const allowed = requireAll
        ? codes.every(hasCapability)
        : codes.some(hasCapability);
    return allowed ? <>{children}</> : <>{fallback}</>;
};
