import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { aboutService } from '../services/aboutService';
import Navbar from '../components/Navbar';

interface AboutSection {
  id: number;
  title: string;
  content: string;
  orderIndex: number;
  isActive: boolean;
}

const About: React.FC = () => {
  const [sections, setSections] = useState<AboutSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    aboutService
      .getActive()
      .then((res) => {
        if (res.data?.success) {
          setSections(res.data.data);
        } else {
          setError('Bölümler yüklenemedi.');
        }
      })
      .catch(() => {
        setError('Hakkımızda bilgileri yüklenirken bir hata oluştu.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Hakkımızda
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto">
            Türkiye'yi Geliştirme Platformu'nun vizyonu, misyonu ve değerleri
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-10 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8">
                <div className="h-8 bg-slate-200 rounded-xl w-2/3 mb-6" />
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 rounded-xl w-full" />
                  <div className="h-4 bg-slate-200 rounded-xl w-5/6" />
                  <div className="h-4 bg-slate-200 rounded-xl w-4/6" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-slate-500">{error}</p>
          </div>
        )}

        {/* Sections */}
        {!loading && !error && (
          <div className="space-y-10">
            {sections.length === 0 && (
              <div className="text-center py-20">
                <p className="text-slate-400 text-lg">Henüz içerik eklenmemiş.</p>
              </div>
            )}
            {sections.map((section) => (
              <div
                key={section.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all duration-300 p-8 md:p-10"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">
                  {section.title}
                </h2>
                <article className="prose prose-slate max-w-none
                  prose-headings:text-slate-900 prose-headings:font-bold
                  prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                  prose-p:text-slate-600 prose-p:leading-relaxed
                  prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-slate-800
                  prose-ul:my-4 prose-li:text-slate-600
                  prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-lg prose-code:text-sm
                ">
                  <ReactMarkdown>{section.content}</ReactMarkdown>
                </article>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default About;
