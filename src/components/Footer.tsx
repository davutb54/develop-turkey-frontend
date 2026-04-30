import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { useAuth } from '../context/AuthContext';

interface PublicSiteInfo {
    siteName?: string | null;
    siteDescription?: string | null;
    organizationName?: string | null;
    contactFullName?: string | null;
    contactAddress?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    socialTwitter?: string | null;
    socialInstagram?: string | null;
    socialLinkedIn?: string | null;
}

const Footer: React.FC = () => {
    const { userId } = useAuth();
    const [info, setInfo] = useState<PublicSiteInfo | null>(null);

    useEffect(() => {
        adminService.getPublicSiteInfo()
            .then((res) => {
                if (res.data) setInfo(res.data);
            })
            .catch(() => {
                // Sessizce geç — footer veri olmadan da çalışır
            });
    }, []);

    const siteName = info?.siteName || 'SO7LE';

    const hasContact =
        info?.contactFullName ||
        info?.contactAddress ||
        info?.contactEmail ||
        info?.contactPhone;

    const hasSocial =
        info?.socialTwitter ||
        info?.socialInstagram ||
        info?.socialLinkedIn;

    return (
        <footer className="bg-gray-900 text-gray-300 mt-auto">
            <div className="max-w-7xl mx-auto py-12 px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

                    {/* ── SOL KOLON: Marka ── */}
                    <div className="flex flex-col gap-4">
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">
                                {siteName}
                            </h2>
                            {info?.siteDescription && (
                                <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                                    {info.siteDescription}
                                </p>
                            )}
                        </div>
                        {/* Kurum rengiyle dekoratif çizgi */}
                        <div
                            className="border-t-2 w-16 mt-1"
                            style={{ borderColor: 'var(--theme-color, #4f46e5)' }}
                        />
                        <p className="text-xs text-gray-500">
                            {info?.organizationName || 'Türkiyeyi Geliştirme Platformu'}
                        </p>
                    </div>

                    {/* ── ORTA KOLON: Hızlı Bağlantılar ── */}
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-5">
                            Hızlı Bağlantılar
                        </h3>
                        <ul className="space-y-3">
                            {[
                                { label: 'Ana Sayfa', to: '/' },
                                { label: 'Sorun Paylaş', to: '/add-problem' },
                                ...(!userId ? [
                                    { label: 'Giriş Yap', to: '/login' },
                                    { label: 'Kayıt Ol', to: '/register' },
                                ] : []),
                            ].map(({ label, to }) => (
                                <li key={to}>
                                    <Link
                                        to={to}
                                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-200 group"
                                    >
                                        <svg
                                            className="w-3 h-3 text-indigo-400 group-hover:translate-x-0.5 transition-transform"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                        </svg>
                                        {label}
                                    </Link>
                                </li>
                            ))}
                            {userId && (
                                <li>
                                    <Link
                                        to="/notifications"
                                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-200 group"
                                    >
                                        <svg
                                            className="w-3 h-3 text-indigo-400 group-hover:translate-x-0.5 transition-transform"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                        </svg>
                                        Bildirimler
                                    </Link>
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* ── SAĞ KOLON: İletişim ── */}
                    {(hasContact || hasSocial) && (
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-5">
                                İletişim
                            </h3>
                            <ul className="space-y-3">
                                {info?.contactFullName && (
                                    <li className="flex items-start gap-2 text-sm text-gray-400">
                                        <span className="mt-0.5">👤</span>
                                        <span>{info.contactFullName}</span>
                                    </li>
                                )}
                                {info?.contactAddress && (
                                    <li className="flex items-start gap-2 text-sm text-gray-400">
                                        <span className="mt-0.5">📍</span>
                                        <span className="leading-relaxed">{info.contactAddress}</span>
                                    </li>
                                )}
                                {info?.contactEmail && (
                                    <li className="flex items-center gap-2 text-sm">
                                        <span>✉️</span>
                                        <a
                                            href={`mailto:${info.contactEmail}`}
                                            className="text-gray-400 hover:text-white transition-colors duration-200"
                                        >
                                            {info.contactEmail}
                                        </a>
                                    </li>
                                )}
                                {info?.contactPhone && (
                                    <li className="flex items-center gap-2 text-sm">
                                        <span>📞</span>
                                        <a
                                            href={`tel:${info.contactPhone}`}
                                            className="text-gray-400 hover:text-white transition-colors duration-200"
                                        >
                                            {info.contactPhone}
                                        </a>
                                    </li>
                                )}
                            </ul>

                            {/* Sosyal Medya */}
                            {hasSocial && (
                                <div className="flex items-center gap-3 mt-6">
                                    {info?.socialTwitter && (
                                        <a
                                            href={info.socialTwitter}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Twitter / X"
                                            className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-indigo-600 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200 hover:scale-110"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                            </svg>
                                        </a>
                                    )}
                                    {info?.socialInstagram && (
                                        <a
                                            href={info.socialInstagram}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Instagram"
                                            className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-pink-600 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200 hover:scale-110"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                                            </svg>
                                        </a>
                                    )}
                                    {info?.socialLinkedIn && (
                                        <a
                                            href={info.socialLinkedIn}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="LinkedIn"
                                            className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-blue-600 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200 hover:scale-110"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                            </svg>
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── ALT KISIM ── */}
            <div className="border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
                    <span>
                        © {new Date().getFullYear()} <span className="text-gray-400 font-medium">{siteName}</span> — Tüm hakları saklıdır.
                    </span>
                    <div className="flex items-center gap-4">
                        <a href="#" className="hover:text-gray-300 transition-colors duration-200">Gizlilik Politikası</a>
                        <span className="text-gray-700">|</span>
                        <a href="#" className="hover:text-gray-300 transition-colors duration-200">KVKK</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
