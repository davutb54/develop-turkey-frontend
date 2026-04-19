import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';

const Maintenance = () => {
    const [message, setMessage] = useState("Sistem şu anda planlı bakım çalışması aşamasındadır.");

    useEffect(() => {
        const storedMessage = sessionStorage.getItem('maintenance_message');
        if (storedMessage) {
            setMessage(storedMessage);
        }
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />
            <main className="flex-1 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
                <div className="max-w-2xl w-full text-center space-y-8 animate-fade-in">
                    {/* İkon / Görsel Alanı */}
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 animate-pulse rounded-full"></div>
                        <div className="relative bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100">
                            <svg className="w-24 h-24 text-indigo-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                            Geleceği <span className="text-indigo-600">İnşa Ediyoruz</span>
                        </h1>
                        <p className="text-xl text-slate-600 font-medium max-w-lg mx-auto leading-relaxed">
                            Size daha iyi bir deneyim sunabilmek için sistemimizi güncelliyoruz.
                        </p>
                    </div>

                    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-md mx-auto relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            Sistem Yöneticisi Mesajı
                        </h2>
                        <p className="text-slate-800 font-bold text-lg leading-snug">
                            "{message}"
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all duration-300 active:scale-95"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            Tekrar Dene
                        </button>
                        <a
                            href="mailto:destek@developturkey.com"
                            className="text-slate-500 font-bold hover:text-slate-800 transition-colors"
                        >
                            Destekle İletişime Geç
                        </a>
                    </div>

                    <p className="text-slate-400 text-sm font-medium pt-8">
                        Anlayışınız için teşekkür ederiz. — DevelopTurkey Ekibi
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Maintenance;
