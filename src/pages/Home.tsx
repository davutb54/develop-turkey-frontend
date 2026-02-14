import { useState, useEffect } from 'react';
import { problemService } from '../services/problemService';
import { constantService } from '../services/constantService';
import { topicService } from '../services/topicService';
import type { ProblemDetailDto, City, Topic } from '../types';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

const Home = () => {
  // Veri State'leri
  const [problems, setProblems] = useState<ProblemDetailDto[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtre State'leri
  const [selectedCity, setSelectedCity] = useState<number>(0);
  const [selectedTopic, setSelectedTopic] = useState<number>(0);
  const [searchText, setSearchText] = useState<string>('');

  useEffect(() => {
    loadInitialData();
  }, []);

  // Sayfa ilk açıldığında çalışır
  const loadInitialData = async () => {
    try {
      // Şehirleri, Konuları ve İlk Sorunları Paralel Çek
      const [cityRes, topicRes, problemRes] = await Promise.all([
        constantService.getCities(),
        topicService.getAll(),
        problemService.getList({}) // Filtresiz çağır (hepsini getir)
      ]);

      if (cityRes.data.success) setCities(cityRes.data.data);
      if (topicRes.data.success) setTopics(topicRes.data.data);
      if (problemRes.data.success) setProblems(problemRes.data.data);

    } catch (err) {
      console.error("Veri yükleme hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filtreleme Butonuna Basınca Çalışır
  const handleFilter = async () => {
    setLoading(true);
    try {
      // Backend'e filtreyi gönderiyoruz
      // 0 seçiliyse undefined gönderelim ki backend filtrelemesin
      const result = await problemService.getList({
        cityCode: selectedCity === 0 ? undefined : selectedCity,
        topicId: selectedTopic === 0 ? undefined : selectedTopic,
        searchText: searchText === '' ? undefined : searchText
      });

      if (result.data.success) {
        setProblems(result.data.data);
      }
    } catch (err) {
      console.error("Filtreleme hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  // Temizle Butonu
  const handleClearFilter = () => {
    setSelectedCity(0);
    setSelectedTopic(0);
    setSearchText('');
    // State güncellenmesi asenkron olduğu için direkt servisi çağırıyoruz
    problemService.getList({}).then(res => {
        if(res.data.success) setProblems(res.data.data);
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        
        {/* FİLTRELEME ALANI */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {/* Arama Kutusu */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Arama</label>
                    <input 
                        type="text"
                        placeholder="Başlık veya içerik ara..."
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleFilter()} // Enter'a basınca ara
                    />
                </div>

                {/* Şehir Seçimi */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Şehir</label>
                    <select 
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(Number(e.target.value))}
                    >
                        <option value={0}>Tüm Şehirler</option>
                        {cities.map(c => <option key={c.value} value={c.value}>{c.text}</option>)}
                    </select>
                </div>

                {/* Konu Seçimi */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Konu</label>
                    <select 
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(Number(e.target.value))}
                    >
                        <option value={0}>Tüm Konular</option>
                        {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>

                {/* Butonlar */}
                <div className="flex gap-2">
                    <button 
                        onClick={handleFilter}
                        className="flex-1 bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition font-medium"
                    >
                        Filtrele
                    </button>
                    <button 
                        onClick={handleClearFilter}
                        className="w-auto bg-gray-200 text-gray-700 p-2 rounded-md hover:bg-gray-300 transition"
                        title="Filtreleri Temizle"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </div>

        {/* LİSTELEME ALANI */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Güncel Sorunlar
            </h1>
            <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
                {problems.length} sonuç bulundu
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : problems.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg shadow">
              <p className="text-gray-500 text-lg">Aradığınız kriterlere uygun sorun bulunamadı.</p>
              <button onClick={handleClearFilter} className="mt-4 text-blue-600 hover:underline">Filtreleri Temizle</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {problems.map((problem) => (
                <div key={problem.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                  {/* Resim Alanı */}
                  <div className="h-48 w-full bg-gray-200 relative">
                     {problem.imageUrl ? (
                        <img 
                          src={`https://localhost:7216/uploads/problems/${problem.imageUrl}`} 
                          alt={problem.title}
                          className="w-full h-full object-cover"
                        />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                           <span className="text-4xl opacity-20 font-bold">DT</span>
                        </div>
                     )}
                     {/* Kategori Etiketi */}
                     <span className="absolute top-2 right-2 bg-white/90 text-blue-600 text-xs font-bold px-2 py-1 rounded shadow-sm">
                        {problem.topicName}
                     </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center text-xs text-gray-500 mb-2">
                       <span>{problem.cityName}</span>
                       <span className="mx-1">•</span>
                       <span>{formatDate(problem.sendDate)}</span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1" title={problem.title}>
                      {problem.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-1">
                      {problem.description}
                    </p>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                            @{problem.senderUsername}
                        </div>
                      </div>
                      
                      <Link 
                        to={`/problem/${problem.id}`} 
                        className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center group"
                      >
                        İncele 
                        <span className="ml-1 transform group-hover:translate-x-1 transition-transform">→</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;