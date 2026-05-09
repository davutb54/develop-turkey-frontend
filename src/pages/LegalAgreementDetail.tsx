import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { legalAgreementService } from '../services/legalAgreementService';
import type { LegalAgreement } from '../types';

const TYPE_LABELS: Record<string, string> = {
  termsofservice: 'Kullanım Koşulları',
  privacypolicy: 'Gizlilik Politikası',
  kvkk: 'KVKK Aydınlatma Metni',
};

const LegalAgreementDetail: React.FC = () => {
  const { type } = useParams<{ type: string }>();
  const [agreement, setAgreement] = useState<LegalAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!type) return;

    setLoading(true);
    setError(null);

    legalAgreementService
      .getActiveByType(type)
      .then((res) => {
        if (res.data?.success) {
          setAgreement(res.data.data);
        } else {
          setError('Sözleşme bulunamadı.');
        }
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setError('Bu tipe ait aktif sözleşme bulunamadı.');
        } else {
          setError('Sözleşme yüklenirken bir hata oluştu.');
        }
      })
      .finally(() => setLoading(false));
  }, [type]);

  const label = type ? TYPE_LABELS[type.toLowerCase()] || type : 'Sözleşme';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Geri Dön */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors duration-200 mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Ana Sayfa'ya Dön
        </Link>

        {/* Yükleniyor */}
        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-10 bg-slate-200 rounded-2xl w-2/3" />
            <div className="space-y-3 mt-8">
              <div className="h-4 bg-slate-200 rounded-xl w-full" />
              <div className="h-4 bg-slate-200 rounded-xl w-5/6" />
              <div className="h-4 bg-slate-200 rounded-xl w-4/6" />
              <div className="h-4 bg-slate-200 rounded-xl w-full" />
              <div className="h-4 bg-slate-200 rounded-xl w-3/6" />
            </div>
          </div>
        )}

        {/* Hata */}
        {!loading && error && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Sözleşme Bulunamadı</h2>
            <p className="text-slate-500 mb-6">{error}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 transition-all duration-200 active:scale-95 shadow-lg shadow-blue-500/20"
            >
              Ana Sayfa'ya Dön
            </Link>
          </div>
        )}

        {/* İçerik */}
        {!loading && !error && agreement && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8 md:p-12">
            {/* Başlık */}
            <div className="mb-10 pb-8 border-b border-slate-100">
              <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full mb-3">
                {label}
              </span>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                {agreement.title}
              </h1>
              <p className="mt-3 text-sm text-slate-400">
                Versiyon {agreement.version} • Yayınlanma:{' '}
                {new Date(agreement.publishedAt).toLocaleDateString('tr-TR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Markdown İçerik */}
            <article className="prose prose-slate max-w-none
              prose-headings:text-slate-900 prose-headings:font-bold
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-p:text-slate-600 prose-p:leading-relaxed
              prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-slate-800
              prose-ul:my-4 prose-li:text-slate-600
              prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-lg prose-code:text-sm
            ">
              <ReactMarkdown>{agreement.content}</ReactMarkdown>
            </article>
          </div>
        )}
      </div>
    </div>
  );
};

export default LegalAgreementDetail;
