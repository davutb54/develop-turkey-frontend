import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { LegalAgreement } from '../types';
import { legalAgreementService } from '../services/legalAgreementService';

interface AgreementModalProps {
  agreements: LegalAgreement[];
  onAcceptAll: () => void;
  /** true olduğunda accept API çağrısı yapılmaz (kayıt öncesi kullanım için) */
  skipApiCall?: boolean;
}

const AgreementModal = ({ agreements, onAcceptAll, skipApiCall = false }: AgreementModalProps) => {
  const [activeTab, setActiveTab] = useState(0);
  // Her sözleşme için ayrı checkbox state'i
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (agreements.length === 0) return null;

  const allChecked = agreements.every((a) => checked[a.id] === true);

  const handleAcceptAll = async () => {
    setLoading(true);
    setError('');
    try {
      if (!skipApiCall) {
        // Giriş yapmış kullanıcılar için API'ye onay kaydı gönder
        for (const agreement of agreements) {
          await legalAgreementService.accept(agreement.id);
        }
      }
      onAcceptAll();
    } catch {
      setError('Onay kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const typeLabel: Record<string, string> = {
    TermsOfService: 'Kullanım Koşulları',
    PrivacyPolicy: 'Gizlilik Politikası',
    KVKK: 'KVKK Aydınlatma',
  };

  return (
    /* Overlay — modal dışına tıklayınca KAPANMAZ (zorunlu onay) */
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">

        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </span>
            <div>
              <h2 className="text-base font-black text-slate-800 tracking-tight">Sözleşmeleri Onaylayın</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Platforma erişmek için güncellenmiş sözleşmeleri okumanız ve onaylamanız gerekmektedir.
              </p>
            </div>
          </div>

          {/* Tab butonları */}
          {agreements.length > 1 && (
            <div className="flex gap-1 mt-4 flex-wrap">
              {agreements.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => setActiveTab(i)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeTab === i
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                >
                  {typeLabel[a.type] ?? a.title}
                  {checked[a.id] && (
                    <span className="ml-1.5 text-emerald-300">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── İçerik — kaydırılabilir ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 max-h-[60vh] custom-scrollbar">
          {agreements[activeTab] && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-700">
                    {agreements[activeTab].title}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Versiyon {agreements[activeTab].version}
                    {' · '}
                    {new Date(agreements[activeTab].publishedAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>
              {/* Markdown renderer */}
              <div className="prose prose-sm prose-slate max-w-none text-slate-600 leading-relaxed">
                <ReactMarkdown>{agreements[activeTab].content}</ReactMarkdown>
              </div>
            </>
          )}
        </div>

        {/* ── Onay kutuları + Devam Et ── */}
        <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/60 space-y-3">
          {agreements.map((a, i) => (
            <label
              key={a.id}
              className="flex items-start gap-3 cursor-pointer group"
              onClick={() => setActiveTab(i)}
            >
              <input
                type="checkbox"
                id={`agreement-check-${a.id}`}
                checked={!!checked[a.id]}
                onChange={(e) => {
                  e.stopPropagation();
                  setChecked((prev) => ({ ...prev, [a.id]: e.target.checked }));
                }}
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 h-4 w-4 shrink-0 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
              />
              <span className="text-[11px] text-slate-600 leading-5 group-hover:text-slate-800 transition-colors">
                <span className="font-bold text-indigo-700">{typeLabel[a.type] ?? a.title}</span>'nı okudum ve kabul ediyorum.
              </span>
            </label>
          ))}

          {error && (
            <p className="text-xs text-red-500 font-medium bg-red-50 px-3 py-2 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          <button
            onClick={handleAcceptAll}
            disabled={!allChecked || loading}
            className={`w-full py-3 px-6 rounded-xl text-sm font-black uppercase tracking-wider transition-all active:scale-95 ${allChecked && !loading
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Kaydediliyor...
              </span>
            ) : (
              'Devam Et'
            )}
          </button>

          {!allChecked && (
            <p className="text-center text-[10px] text-slate-400">
              Devam etmek için tüm sözleşmeleri okuyup onaylamanız gerekmektedir.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgreementModal;
