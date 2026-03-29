import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { constantService } from '../services/constantService';
import { topicService } from '../services/topicService';
import { problemService } from '../services/problemService';
import type { City, Topic, ProblemAddDto } from '../types';
import Navbar from '../components/Navbar';
import SearchableSelect from '../components/SearchableSelect';
import { useAuth } from '../context/AuthContext';

const CreateProblem = () => {
    const navigate = useNavigate();
    const { userId } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Dropdown Verileri
    const [cities, setCities] = useState<City[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);

    // Form Verileri
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [cityCode, setCityCode] = useState(0);
    const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
    const [image, setImage] = useState<File | null>(null);
    const [hasSolution, setHasSolution] = useState(false);
    const [solutionTitle, setSolutionTitle] = useState(''); // YENİ
    const [solutionDescription, setSolutionDescription] = useState('');

    // Sayfa açılışında verileri çek
    useEffect(() => {
        // Henüz auth yükleniyorsa bekle
        if (userId === null) return;

        // Giriş kontrolü
        if (userId === false) {
            alert("Sorun eklemek için giriş yapmalısınız.");
            navigate('/login');
            return;
        }

        const loadData = async () => {
            try {
                const [cityRes, topicRes] = await Promise.all([
                    constantService.getCities(),
                    topicService.getAllActive()
                ]);

                if (cityRes.data.success) setCities(cityRes.data.data);
                if (topicRes.data.success) setTopics(topicRes.data.data);
            } catch (err) {
                console.error("Veri yükleme hatası", err);
                setError("Gerekli listeler yüklenemedi.");
            }
        };
        loadData();
    }, [userId, navigate]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // 5 MB = 5 * 1024 * 1024 byte
            if (file.size > 5 * 1024 * 1024) {
                alert("Seçtiğiniz fotoğraf çok büyük! Lütfen 5 MB'dan küçük bir fotoğraf seçin.");
                e.target.value = ''; // Inputu temizle
                return;
            }

            setImage(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Basit Validasyon
        if (cityCode === -1) { setError("Lütfen şehir seçin."); setLoading(false); return; }
        if (selectedTopics.length === 0) { setError("Lütfen en az 1 kategori (konu) seçin."); setLoading(false); return; }

        const newProblem: ProblemAddDto = {
            title,
            description,
            cityCode,
            topicIds: selectedTopics, // YENİ
            image,
            solutionTitle: hasSolution ? solutionTitle : undefined, // YENİ
            solutionDescription: hasSolution ? solutionDescription : undefined
        };

        try {
            const result = await problemService.add(newProblem);
            if (result.data.success) {
                alert("Sorununuz başarıyla paylaşıldı!");
                navigate('/'); // Ana sayfaya dön
            } else {
                setError(result.data.message);
            }
        } catch (err: any) {
            // Hata mesajını ayrıştır
            if (err.response && err.response.data) {
                if (Array.isArray(err.response.data)) { // FluentValidation dizisi
                    setError(err.response.data.map((e: any) => e.errorMessage).join(", "));
                } else {
                    setError(err.response.data.message || "Bir hata oluştu");
                }
            } else {
                setError("Sunucuya bağlanılamadı.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />

            <main className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 bg-blue-600">
                        <h3 className="text-lg leading-6 font-medium text-white">
                            Yeni Sorun Bildir
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-blue-100">
                            Çevrenizde gördüğünüz bir sorunu detaylarıyla paylaşın.
                        </p>
                    </div>

                    <div className="px-4 py-5 sm:p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Başlık */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Başlık</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={100}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="Örn: X Mahallesinde Sokak Lambaları Yanmıyor"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            {/* Dropdownlar */}
                            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Şehir</label>
                                    <div>
                                        <SearchableSelect
                                            options={cities.map(c => ({ value: c.value, label: c.text }))}
                                            value={cityCode}
                                            onChange={(val) => setCityCode(Number(val))}
                                            placeholder="Şehir Seçiniz"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">İlgili Kategoriler <span className="text-red-500">*</span></label>
                                    <div className="flex flex-wrap gap-2">
                                        {topics.map(topic => {
                                            const isSelected = selectedTopics.includes(topic.id);
                                            return (
                                                <button
                                                    key={topic.id}
                                                    type="button"
                                                    onClick={() => {
                                                        // Tıklanınca seçiliyse çıkar, seçili değilse ekle
                                                        setSelectedTopics(prev =>
                                                            prev.includes(topic.id)
                                                                ? prev.filter(id => id !== topic.id)
                                                                : [...prev, topic.id]
                                                        );
                                                    }}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-95 flex items-center gap-1.5 ${isSelected
                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/30'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50'
                                                        }`}
                                                >
                                                    {isSelected && (
                                                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                    )}
                                                    {topic.name}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium mt-2">Sorununuzla ilgili birden fazla kategori seçebilirsiniz.</p>
                                </div>
                            </div>

                            {/* Açıklama */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                                <div className="mt-1">
                                    <textarea
                                        rows={5}
                                        required
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                                        placeholder="Sorunu detaylıca açıklayın..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </div>
                                <p className="mt-2 text-sm text-gray-500">En az 20 karakter yazmalısınız.</p>
                            </div>

                            {/* Resim Yükleme */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Görsel (İsteğe Bağlı)</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition">
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <div className="flex text-sm text-gray-600">
                                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                                <span>Dosya Yükle</span>
                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageChange} accept="image/*" />
                                            </label>
                                            <p className="pl-1">veya sürükleyip bırakın</p>
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG, GIF</p>
                                        {/* Seçilen Resim Gösterimi ve Kaldırma Butonu */}
                                        {image && (
                                            <div className="mt-3 flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                                                <div className="flex items-center">
                                                    {/* Küçük bir önizleme ikonu */}
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="text-sm text-green-700 font-medium truncate max-w-xs">
                                                        {image.name}
                                                    </span>
                                                </div>

                                                <button
                                                    type="button" // Formun submit olmasını engeller
                                                    onClick={() => {
                                                        setImage(null); // State'i temizle
                                                        // Dosya inputunu da sıfırla ki aynı dosyayı tekrar seçebilsin
                                                        (document.getElementById('file-upload') as HTMLInputElement).value = "";
                                                    }}
                                                    className="text-red-500 hover:text-red-700 text-sm font-semibold transition-colors px-2 py-1 rounded hover:bg-red-100"
                                                >
                                                    Kaldır ✕
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ÇÖZÜM ALANI */}
                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-center mb-4">
                                    <input
                                        id="hasSolution"
                                        type="checkbox"
                                        checked={hasSolution}
                                        onChange={(e) => setHasSolution(e.target.checked)}
                                        className="w-5 h-5 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <label htmlFor="hasSolution" className="ml-3 text-sm font-bold text-indigo-700 cursor-pointer select-none">
                                        💡 Bu sorun için bir çözüm önerim var
                                    </label>
                                </div>

                                {/* ÇÖZÜM KUTUSU (Animasyonlu Açılır) */}
                                {hasSolution && (
                                    <div className="animate-fade-in-down bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-indigo-900 mb-1">Çözüm Başlığı <span className="font-normal text-indigo-500">(İsteğe Bağlı)</span></label>
                                            <input
                                                type="text"
                                                className="w-full border border-indigo-200 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm bg-white"
                                                placeholder="Örn: Trafik Işıkları Senkronizasyonu"
                                                value={solutionTitle}
                                                onChange={(e) => setSolutionTitle(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-indigo-900 mb-1">Çözüm Detayı <span className="text-red-500">*</span></label>
                                            <textarea
                                                className="block w-full border border-indigo-200 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm transition bg-white"
                                                rows={3}
                                                required={hasSolution} // Eğer çözüm eklenecekse açıklaması zorunlu olsun
                                                placeholder="Sizce bu sorun nasıl çözülmeli? Fikrinizi toplulukla paylaşın..."
                                                value={solutionDescription}
                                                onChange={(e) => setSolutionDescription(e.target.value)}
                                            ></textarea>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {error && <div className="text-red-600 text-sm font-bold text-center">{error}</div>}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                >
                                    {loading ? 'Gönderiliyor...' : 'Sorunu Paylaş'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CreateProblem;