import React, { useState } from 'react';
import toast from 'react-hot-toast';

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
  variant?: 'inline' | 'dropdown' | 'menuItem';
}

const SocialShare: React.FC<SocialShareProps> = ({ url, title, description, variant = 'inline' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const fullUrl = window.location.origin + url;
  
  // Mesajı daha güzel hale getir (Emojiler, CTA, Hashtagler)
  const cleanDescription = description 
    ? (description.length > 100 ? description.substring(0, 97) + "..." : description) 
    : "";
    
  const shareMessage = `📢 *${title}*\n\n${cleanDescription}\n\n🚀 Bu soruna çözüm üretmek veya destek olmak için tıkla:\n🔗 ${fullUrl}\n\n#DevelopTurkey #ŞehirSorunları #ÇözümÜret`;

  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedMessage = encodeURIComponent(shareMessage);

  const shareLinks = [
    {
      name: 'WhatsApp',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 0 5.414 0 12.05c0 2.123.553 4.197 1.608 6.02L0 24l6.117-1.605a11.803 11.803 0 005.925 1.589h.005c6.636 0 12.05-5.414 12.05-12.05 0-3.212-1.25-6.232-3.513-8.497z" />
        </svg>
      ),
      color: 'bg-[#25D366]',
      hoverColor: 'hover:bg-[#128C7E]',
      href: `https://api.whatsapp.com/send?text=${encodedMessage}`,
    },
    {
      name: 'X (Twitter)',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.292 19.49h2.039L6.486 3.24H4.298l13.311 17.403z" />
        </svg>
      ),
      color: 'bg-[#000000]',
      hoverColor: 'hover:bg-gray-800',
      href: `https://twitter.com/intent/tweet?text=${encodedMessage}`,
    },
    {
      name: 'Facebook',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      color: 'bg-[#1877F2]',
      hoverColor: 'hover:bg-[#0C63D1]',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: 'Instagram',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
      color: 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]',
      hoverColor: 'hover:opacity-90',
      isAction: true,
      onClick: (url: string) => {
        navigator.clipboard.writeText(url);
        toast.success('Bağlantı Instagram için kopyalandı! Hikayenizde paylaşabilirsiniz.', { icon: '📸' });
      },
    },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    toast.success('Bağlantı kopyalandı!', {
      icon: '🔗',
      style: {
        borderRadius: '12px',
        background: '#333',
        color: '#fff',
        fontWeight: 'bold',
      },
    });
    if (variant === 'dropdown') setIsOpen(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: fullUrl,
        });
      } catch (err) {
        console.error('Paylaşım hatası:', err);
      }
    } else {
      setIsOpen(!isOpen);
    }
  };

  if (variant === 'menuItem') {
    return (
      <div className="relative">
        <button
          onClick={handleNativeShare}
          className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Paylaş
        </button>

        {isOpen && !navigator.share && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)}></div>
            <div className="absolute left-full top-0 ml-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-[70] animate-fade-in-down origin-left">
              <div className="grid grid-cols-1 gap-1">
                {shareLinks.map((link: any) => (
                  link.isAction ? (
                    <button
                      key={link.name}
                      onClick={() => { link.onClick(fullUrl); setIsOpen(false); }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition group w-full text-left"
                    >
                      <div className={`${link.color} text-white p-1.5 rounded-lg shadow-sm group-hover:scale-110 transition-transform`}>
                        {link.icon}
                      </div>
                      <span className="text-xs font-bold text-gray-700">{link.name}</span>
                    </button>
                  ) : (
                    <a
                      key={link.name}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition group"
                    >
                      <div className={`${link.color} text-white p-1.5 rounded-lg shadow-sm group-hover:scale-110 transition-transform`}>
                        {link.icon}
                      </div>
                      <span className="text-xs font-bold text-gray-700">{link.name}</span>
                    </a>
                  )
                ))}
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition group text-left w-full"
                >
                  <div className="bg-gray-200 text-gray-600 p-1.5 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-gray-700">Bağlantıyı Kopyala</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className="relative inline-block text-left">
        <button
          onClick={handleNativeShare}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition shadow-sm"
          title="Paylaş"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Paylaş
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 animate-fade-in-down origin-top-right">
              <div className="grid grid-cols-1 gap-1">
                {shareLinks.map((link: any) => (
                  link.isAction ? (
                    <button
                      key={link.name}
                      onClick={() => { link.onClick(fullUrl); setIsOpen(false); }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition group w-full text-left"
                    >
                      <div className={`${link.color} text-white p-1.5 rounded-lg shadow-sm group-hover:scale-110 transition-transform`}>
                        {link.icon}
                      </div>
                      <span className="text-xs font-bold text-gray-700">{link.name}</span>
                    </button>
                  ) : (
                    <a
                      key={link.name}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition group"
                    >
                      <div className={`${link.color} text-white p-1.5 rounded-lg shadow-sm group-hover:scale-110 transition-transform`}>
                        {link.icon}
                      </div>
                      <span className="text-xs font-bold text-gray-700">{link.name}</span>
                    </a>
                  )
                ))}
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition group text-left w-full"
                >
                  <div className="bg-gray-200 text-gray-600 p-1.5 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-gray-700">Bağlantıyı Kopyala</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {shareLinks.map((link: any) => (
        link.isAction ? (
          <button
            key={link.name}
            onClick={() => link.onClick(fullUrl)}
            className={`${link.color} ${link.hoverColor} text-white p-2 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center`}
            title={`${link.name} için kopyala`}
          >
            {link.icon}
          </button>
        ) : (
          <a
            key={link.name}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className={`${link.color} ${link.hoverColor} text-white p-2 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center`}
            title={`${link.name} ile paylaş`}
          >
            {link.icon}
          </a>
        )
      ))}
      <button
        onClick={handleCopyLink}
        className="bg-gray-100 text-gray-600 hover:bg-gray-200 p-2 rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center border border-gray-200"
        title="Bağlantıyı Kopyala"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
      </button>
    </div>
  );
};

export default SocialShare;
