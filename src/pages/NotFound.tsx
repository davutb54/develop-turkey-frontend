import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#E0E7FF] flex flex-col">
            <Navbar />
            
            <div className="flex-1 flex flex-col items-center justify-center px-4 text-center animate-fade-in-down">
                {/* İkon veya Emoji */}
                <div className="text-8xl md:text-9xl mb-8 drop-shadow-lg">
                    🛸
                </div>
                
                {/* 404 Başlığı */}
                <h1 className="text-6xl md:text-8xl font-black mb-4 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">
                    404
                </h1>
                
                {/* Mesaj */}
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">
                    Uzayın Derinliklerinde Kaybolduk!
                </h2>
                <p className="text-slate-500 md:text-lg max-w-lg mb-10 font-medium">
                    Aradığın sayfayı bulamadık. Belki silinmiş, belki de hiç var olmamış olabilir. Ama merak etme, seni güvenli bölgeye geri götürebiliriz.
                </p>
                
                {/* Anasayfaya Dönüş Butonu */}
                <Link 
                    to="/" 
                    className="group flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95 hover:-translate-y-1"
                >
                    <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Anasayfaya Dön
                </Link>
            </div>
        </div>
    );
};

export default NotFound;