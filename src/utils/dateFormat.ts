const TZ = 'Europe/Istanbul';

/** "01.06.2026 14:49" — tarih + saat */
export const fmtDateTime = (iso: string | null | undefined): string => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('tr-TR', {
        timeZone: TZ,
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

/** "01.06.2026 14:49:35" — tarih + saniyeli saat */
export const fmtDateTimeSec = (iso: string | null | undefined): string => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('tr-TR', {
        timeZone: TZ,
        dateStyle: 'short',
        timeStyle: 'medium',
    });
};

/** "01.06.2026" — sadece tarih */
export const fmtDate = (iso: string | null | undefined): string => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('tr-TR', {
        timeZone: TZ,
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
};

/** "14:49:35" — sadece saat */
export const fmtTime = (iso: string | null | undefined): string => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString('tr-TR', {
        timeZone: TZ,
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
};
