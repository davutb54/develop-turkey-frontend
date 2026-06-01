import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { legalAgreementService } from '../services/legalAgreementService';
import { featureService } from '../services/featureService';

const CAPABILITIES_STORAGE_KEY = 'dt_capabilities';

function loadStoredCapabilities(): Set<string> {
    try {
        const raw = localStorage.getItem(CAPABILITIES_STORAGE_KEY);
        if (raw) return new Set<string>(JSON.parse(raw));
    } catch { /* ignore */ }
    return new Set<string>();
}

function persistCapabilities(caps: Set<string>) {
    try {
        localStorage.setItem(CAPABILITIES_STORAGE_KEY, JSON.stringify([...caps]));
    } catch { /* ignore */ }
}

// null = yükleniyor, false = giriş yok, number = kullanıcı id'si
interface AuthContextType {
    userId: number | null | false;
    /** @deprecated hasCapability("admin.system_access") kullanın — capabilities'den türetilir. */
    isAdmin: boolean;
    isMaintenance: boolean;
    isProfileIncomplete: boolean;
    hasPendingAgreement: boolean;
    capabilities: Set<string>;
    hasCapability: (code: string) => boolean;
    setCapabilities: (caps: Set<string>) => void;
    setUserId: (id: number | false) => void;
    setIsMaintenance: (isMain: boolean) => void;
    setHasPendingAgreement: (val: boolean) => void;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    userId: null,
    isAdmin: false,
    isMaintenance: false,
    isProfileIncomplete: false,
    hasPendingAgreement: false,
    capabilities: new Set(),
    hasCapability: () => false,
    setCapabilities: () => {},
    setUserId: () => {},
    setIsMaintenance: () => {},
    setHasPendingAgreement: () => {},
    checkAuth: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [userId, setUserId] = useState<number | null | false>(null);
    const [isMaintenance, setIsMaintenance] = useState<boolean>(false);
    const [isProfileIncomplete, setIsProfileIncomplete] = useState<boolean>(false);
    const [hasPendingAgreement, setHasPendingAgreement] = useState<boolean>(false);
    const [capabilities, setCapabilitiesState] = useState<Set<string>>(loadStoredCapabilities);

    // isAdmin → capabilities'den türetilen computed değer; ayrı state tutulmaz.
    const isAdmin = capabilities.has('admin.system_access');

    const setCapabilities = useCallback((caps: Set<string>) => {
        setCapabilitiesState(caps);
        persistCapabilities(caps);
    }, []);

    const hasCapability = useCallback((code: string) => capabilities.has(code), [capabilities]);

    const refreshCapabilities = async (institutionId?: number) => {
        try {
            const res = await authService.getCapabilities(institutionId);
            // Backend returns { success: true, data: string[] }
            const list: unknown = (res.data as any)?.data ?? res.data;
            if (Array.isArray(list)) {
                setCapabilities(new Set<string>(list as string[]));
            }
        } catch { /* ignore — capabilities might be stale from localStorage */ }
    };

    const checkAuth = async () => {
        try {
            const response = await userService.getMe();
            if (response.data && response.data.success) {
                const user = response.data.data;

                // Feature: Identity.RequireEmailVerification
                let requireEmailVerification = true;
                try {
                    const featuresRes = await featureService.getInstitutionFeatures(1);
                    if (featuresRes.data.success) {
                        const features = featuresRes.data.data || {};
                        const rawValue = features['Identity.RequireEmailVerification'];
                        if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
                            requireEmailVerification = rawValue.toLowerCase() === 'true';
                        }
                    }
                } catch { /* varsayılan true */ }

                if (requireEmailVerification && user?.isEmailVerified === false) {
                    try {
                        sessionStorage.setItem('pending_verify_email', user.email || '');
                    } catch { /* ignore */ }

                    setUserId(false);
                    setCapabilities(new Set());
                    setIsProfileIncomplete(false);
                    setHasPendingAgreement(false);

                    const currentPath = window.location.pathname.toLowerCase();
                    if (!currentPath.includes('/verify-email')) {
                        window.location.href = '/verify-email';
                    }
                    return;
                }

                setUserId(user.id);
                setIsMaintenance(false);

                if (user.cityCode === 0 || user.genderCode === -1) {
                    setIsProfileIncomplete(true);
                } else {
                    setIsProfileIncomplete(false);
                }

                // Capability'leri arka planda tazele
                await refreshCapabilities(user.institutionId);

                try {
                    const pendingRes = await legalAgreementService.hasPending();
                    if (pendingRes.data.success) {
                        setHasPendingAgreement(pendingRes.data.data === true);
                    }
                } catch {
                    setHasPendingAgreement(false);
                }
            } else {
                setUserId(false);
                setCapabilities(new Set());
                setIsProfileIncomplete(false);
                setHasPendingAgreement(false);
            }
        } catch (err: any) {
            if (err.response && err.response.status === 503) {
                setIsMaintenance(true);
            }
            setUserId(false);
            setCapabilities(new Set());
            setHasPendingAgreement(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    return (
        <AuthContext.Provider value={{
            userId, isAdmin, isMaintenance, isProfileIncomplete, hasPendingAgreement,
            capabilities, hasCapability, setCapabilities,
            setUserId, setIsMaintenance, setHasPendingAgreement, checkAuth,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
