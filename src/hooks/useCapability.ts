import { useAuth } from '../context/AuthContext';

/**
 * Kullanıcının belirli bir capability'ye sahip olup olmadığını döner.
 *
 * @example
 * const canBan = useCapability('admin.user_ban');
 * {canBan && <BanButton />}
 */
export function useCapability(code: string): boolean {
    const { hasCapability } = useAuth();
    return hasCapability(code);
}

/**
 * Kullanıcının verilen capability'lerden herhangi birine sahip olup olmadığını döner.
 */
export function useAnyCapability(...codes: string[]): boolean {
    const { hasCapability } = useAuth();
    return codes.some(hasCapability);
}

/**
 * Kullanıcının verilen capability'lerin tamamına sahip olup olmadığını döner.
 */
export function useAllCapabilities(...codes: string[]): boolean {
    const { hasCapability } = useAuth();
    return codes.every(hasCapability);
}
