import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { constantService } from '../services/constantService';
import { topicService } from '../services/topicService';
import { problemService } from '../services/problemService';
import type { City, Topic, ProblemAddDto } from '../types';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import type { LatLngExpression, LeafletMouseEvent } from 'leaflet';
import Navbar from '../components/Navbar';
import SearchableSelect from '../components/SearchableSelect';
import { useAuth } from '../context/AuthContext';
import { useCapability } from '../hooks/useCapability';
import { useFeature, useInstitution, useTerminology } from '../hooks/useFeature';
import MentionWrapper from '../components/MentionWrapper';

const CreateProblem = () => {
    const navigate = useNavigate();
    const { userId } = useAuth();
    const canCreateProblem = useCapability('user.problem_create');
    const terminology = useTerminology();
    const allowImageUpload = useFeature<boolean>('Content.AllowImageUpload', true);
    const maxTitleLength = useFeature<number>('Content.MaxTitleLength', 200);
    const requireCategory = useFeature<boolean>('Content.RequireCategorySelection', false);
    const enableMapLocation = useFeature<boolean>('Content.EnableMapLocation', true);
    const requireMapLocation = useFeature<boolean>('Content.RequireMapLocation', false);
    const enableCustomHierarchy = useFeature<boolean>('Content.EnableCustomHierarchy', false);
    const requireLocation = useFeature<boolean>('Content.RequireLocationSelection', true);
    const maxProblemImages = useFeature<number>('Content.MaxProblemImageCount', 5);
    const enableInstantSolution = useFeature<boolean>('Content.EnableInstantSolution', true);
    const allowSolutionImageUpload = useFeature<boolean>('Content.AllowSolutionImageUpload', true);
    const maxSolutionImages = useFeature<number>('Content.MaxSolutionImageCount', 3);
    const enableMentions = useFeature<boolean>('Social.EnableMentions', true);
    const institution = useInstitution();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const DEFAULT_CENTER: [number, number] = [39.0, 35.0];

    // Dropdown Verileri
    const [cities, setCities] = useState<City[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);

    // Form Verileri
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [cityCode, setCityCode] = useState(0);
    const [customHierarchyId, setCustomHierarchyId] = useState<number | null>(null);
    const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
    const [images, setImages] = useState<File[]>([]);
    const [hasSolution, setHasSolution] = useState(false);
    const [solutionTitle, setSolutionTitle] = useState(''); // YENİ
    const [solutionDescription, setSolutionDescription] = useState('');
    const [solutionImages, setSolutionImages] = useState<File[]>([]);

    // Konum (opsiyonel)
    const [address, setAddress] = useState('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [isResolvingCity, setIsResolvingCity] = useState(false);
    const [autoCityName, setAutoCityName] = useState<string | null>(null);

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

        // Capability kontrolü — userId truthy (kullanıcı girmiş) ama capability yoksa
        if (userId && !canCreateProblem) {
            alert("Sorun paylaşma yetkiniz bulunmamaktadır.");
            navigate('/');
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
    }, [userId, navigate, canCreateProblem]);

    // Koordinat seçildiyse şehri otomatik belirle ve kilitle
    useEffect(() => {
        const resolve = async () => {
            if (latitude === null || longitude === null) {
                setAutoCityName(null);
                setIsResolvingCity(false);
                return;
            }

            setIsResolvingCity(true);
            try {
                const res = await constantService.reverseGeocodeCity(latitude, longitude);
                if (res.data.success) {
                    setCityCode(res.data.data.cityCode);
                    setAutoCityName(res.data.data.cityName);
                    const resolvedAddress = (res.data.data.resolvedAddress || '').trim();
                    if (!address.trim() && resolvedAddress) {
                        setAddress(resolvedAddress.slice(0, 500));
                    }
                    setLocationError('');
                }
            } catch (err: any) {
                setAutoCityName(null);
                setLocationError(err?.response?.data?.message || 'Konumdan şehir tespit edilemedi. Lütfen pini şehir içinde olacak şekilde düzeltin.');
            } finally {
                setIsResolvingCity(false);
            }
        };

        resolve();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [latitude, longitude]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            
            if (files.length + images.length > maxProblemImages) {
                alert(`En fazla ${maxProblemImages} görsel seçebilirsiniz.`);
                e.target.value = '';
                return;
            }

            const validFiles = files.filter(file => {
                if (file.size > 5 * 1024 * 1024) {
                    alert(`${file.name} çok büyük! Lütfen 5 MB'dan küçük bir fotoğraf seçin.`);
                    return false;
                }
                return true;
            });

            setImages(prev => [...prev, ...validFiles]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Basit Validasyonlar
        if (isResolvingCity) { setError("Şehir konuma göre belirleniyor, lütfen bekleyin."); setLoading(false); return; }
        if (latitude !== null && longitude !== null && !autoCityName) { setError("Konumdan şehir tespit edilemedi. Lütfen pini şehir içinde olacak şekilde düzeltin."); setLoading(false); return; }

        // Eğer lokasyon seçimi zorunluysa kontrol et
        if (requireLocation) {
            // Eğer özel hiyerarşi YOKSA şehir seçimi zorunlu
            if (!enableCustomHierarchy && (cityCode === -1 || cityCode === 0)) {
                setError(`Lütfen ${terminology.cityLabel || 'bir bölge'} seçin.`); setLoading(false); return;
            }

            // Eğer özel hiyerarşi VARSA hiyerarşi seçimi zorunlu
            if (enableCustomHierarchy && customHierarchyId === null) {
                setError(`Lütfen ${terminology.cityLabel} seçin.`); setLoading(false); return;
            }
        }
        if (requireCategory && selectedTopics.length === 0) { setError("Lütfen en az 1 kategori seçin."); setLoading(false); return; }

        // Konum Zorunluluğu Kontrolü (RequireMapLocation)
        if (enableMapLocation && requireMapLocation) {
            if (!latitude || !longitude) {
                setError("Lütfen haritadan bir konum seçin. Bu işlem bu kurum için zorunludur.");
                setLoading(false);
                return;
            }
        }

        const newProblem: ProblemAddDto = {
            title,
            description,
            cityCode,
            address: enableMapLocation ? (address.trim() ? address.trim() : undefined) : undefined,
            latitude: enableMapLocation ? (latitude ?? undefined) : undefined,
            longitude: enableMapLocation ? (longitude ?? undefined) : undefined,
            customHierarchyId: customHierarchyId ?? undefined,
            topicIds: selectedTopics, // YENİ
            images,
            solutionTitle: hasSolution ? solutionTitle : undefined, // YENİ
            solutionDescription: hasSolution ? solutionDescription : undefined,
            solutionImages: hasSolution ? solutionImages : undefined
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
            console.error("Problem creation error:", err);
            let errMsg = "Sorun paylaşılırken bir hata oluştu.";
            
            if (err.response?.data) {
                if (Array.isArray(err.response.data)) {
                    // FluentValidation listesi
                    errMsg = err.response.data.map((e: any) => e.errorMessage).join(", ");
                } else if (typeof err.response.data === 'string') {
                    errMsg = err.response.data;
                } else if (err.response.data.message) {
                    errMsg = err.response.data.message;
                } else if (err.response.data.errors) {
                    // ASP.NET Core Validation errors
                    errMsg = Object.values(err.response.data.errors).flat().join('\n');
                }
            } else if (err.message) {
                errMsg = err.message;
            }
            
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleGetMyLocation = () => {
        setLocationError('');

        if (!('geolocation' in navigator)) {
            setLocationError('Tarayıcınız konum özelliğini desteklemiyor.');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLatitude(pos.coords.latitude);
                setLongitude(pos.coords.longitude);
                setIsLocating(false);
            },
            (err) => {
                if (err.code === err.PERMISSION_DENIED) {
                    setLocationError('Konum izni verilmedi. İsterseniz haritadan pin bırakabilirsiniz.');
                } else {
                    setLocationError('Konum alınamadı. İsterseniz haritadan pin bırakabilirsiniz.');
                }
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const MapViewController = ({ center, zoom }: { center: LatLngExpression; zoom: number }) => {
        const map = useMap();
        useEffect(() => {
            map.setView(center, zoom);
        }, [map, center, zoom]);
        return null;
    };

    const LocationClickHandler = () => {
        useMapEvents({
            click(e: LeafletMouseEvent) {
                setLatitude(e.latlng.lat);
                setLongitude(e.latlng.lng);
                setLocationError('');
            }
        });
        return null;
    };

    const mapCenter: LatLngExpression = latitude !== null && longitude !== null
        ? [latitude, longitude]
        : DEFAULT_CENTER;

    const mapZoom = latitude !== null && longitude !== null ? 15 : 6;


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
                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded-md shadow-sm">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-bold text-red-700 whitespace-pre-line">
                                                {error}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Başlık */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Başlık</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={maxTitleLength}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="Örn: X Mahallesinde Sokak Lambaları Yanmıyor"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            {/* Konum */}
                            {enableMapLocation && (
                                <div className="pt-2">
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Konum {requireMapLocation ? <span className="text-red-500">*</span> : <span className="text-gray-400">(İsteğe Bağlı)</span>}
                                            </label>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {requireMapLocation 
                                                    ? "Lütfen sorunun tam konumunu haritadan işaretleyin." 
                                                    : "Konum eklemek, sorunun daha hızlı anlaşılmasına yardımcı olabilir. Dilerseniz konumunuzu alabilir veya haritadan pin bırakabilirsiniz."}
                                            </p>
                                        </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleGetMyLocation}
                                            disabled={loading || isLocating}
                                            className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 font-bold text-xs rounded-xl hover:bg-blue-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {isLocating ? 'Konum Alınıyor...' : '📍 Konumumu Al'}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => { setLatitude(null); setLongitude(null); setLocationError(''); setAutoCityName(null); }}
                                            disabled={loading}
                                            className="px-4 py-2 bg-white text-gray-700 border border-gray-200 font-bold text-xs rounded-xl hover:bg-gray-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            Temizle
                                        </button>
                                    </div>
                                </div>

                                {locationError && (
                                    <div className="mt-2 text-xs font-bold text-red-600">{locationError}</div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Adres / Tarif <span className="text-gray-400 font-medium">(İsteğe Bağlı)</span></label>
                                        <input
                                            type="text"
                                            maxLength={500}
                                            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            placeholder="Örn: X Mahallesi, Y Sokak, No: 12"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            disabled={loading}
                                        />
                                    </div>
                                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                                        <div className="text-xs font-bold text-gray-700 mb-1">Koordinatlar</div>
                                        {latitude !== null && longitude !== null ? (
                                            <div className="text-xs text-gray-700">
                                                <div><span className="font-bold">Enlem:</span> {latitude.toFixed(6)}</div>
                                                <div><span className="font-bold">Boylam:</span> {longitude.toFixed(6)}</div>
                                                <div className="text-[11px] text-gray-500 mt-1">Haritaya tıklayarak pini düzeltebilirsiniz.</div>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-gray-500">Konum seçilmedi.</div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="h-64 w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                                        <MapContainer
                                            key={`${latitude ?? 'd'}-${longitude ?? 'd'}`}
                                            scrollWheelZoom={false}
                                            className="h-full w-full"
                                        >
                                            <MapViewController center={mapCenter} zoom={mapZoom} />
                                            <TileLayer
                                                attribution='&copy; OpenStreetMap katkıda bulunanlar'
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />

                                            <LocationClickHandler />

                                            {latitude !== null && longitude !== null && (
                                                <Marker position={[latitude, longitude] as LatLngExpression} />
                                            )}
                                        </MapContainer>
                                    </div>
                                    <p className="mt-2 text-[11px] text-gray-500">İpucu: Haritaya tıklayarak konum pini bırakabilir veya değiştirebilirsiniz.</p>
                                </div>
                            </div>
                        )}

                            {/* Dropdownlar */}
                            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">{terminology.cityLabel}</label>
                                    <div>
                                        {enableCustomHierarchy ? (
                                             <SearchableSelect
                                                 options={(() => {
                                                     try {
                                                         const items = JSON.parse(institution?.customHierarchyJson || '[]') as string[];
                                                         return items.map((item, idx) => ({ value: idx, label: item }));
                                                     } catch { return []; }
                                                 })()}
                                                 value={customHierarchyId ?? ''}
                                                 onChange={(val) => setCustomHierarchyId(val === '' ? null : Number(val))}
                                                 placeholder={`${terminology.cityLabel} Seçiniz`}
                                                 disabled={loading}
                                             />
                                        ) : (
                                            <>
                                                <SearchableSelect
                                                    options={cities.map(c => ({ value: c.value, label: c.text }))}
                                                    value={cityCode}
                                                    onChange={(val) => setCityCode(Number(val))}
                                                    placeholder={`${terminology.cityLabel} Seçiniz`}
                                                    disabled={loading || (latitude !== null && longitude !== null) || isResolvingCity}
                                                />
                                                {(latitude !== null && longitude !== null) && (
                                                    <div className="mt-2 text-[11px] font-bold text-indigo-700">
                                                        Şehir konuma göre otomatik seçildi{autoCityName ? `: ${autoCityName}` : ''}. (Değiştirilemez)
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">İlgili Kategoriler {requireCategory && <span className="text-red-500">*</span>}</label>
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
                                            );
                                        })}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium mt-2">Sorununuzla ilgili birden fazla kategori seçebilirsiniz.</p>
                                </div>
                            </div>

                            {/* Açıklama */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                                <div className="mt-1">

                                    {enableMentions ? (
                                        <MentionWrapper value={description} onChange={(val) => setDescription(val)} institutionId={institution?.id}>
                                            <textarea
                                                rows={5}
                                                required
                                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                                                placeholder="Sorunu detaylıca açıklayın..."
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                            />
                                        </MentionWrapper>
                                    ) : (
                                        <textarea
                                            rows={5}
                                            required
                                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                                            placeholder="Sorunu detaylıca açıklayın..."
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                        />
                                    )}

                                </div>
                                <p className="mt-2 text-sm text-gray-500">En az 20 karakter yazmalısınız.</p>
                            </div>

                            {/* Resim Yükleme */}
                            {allowImageUpload && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Görseller (Maks: {maxProblemImages})</label>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition relative">
                                        <div className="space-y-1 text-center">
                                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <div className="flex text-sm text-gray-600">
                                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                                    <span>Dosya(lar) Yükle</span>
                                                    <input id="file-upload" name="file-upload" type="file" multiple className="sr-only" onChange={handleImageChange} accept="image/*" />
                                                </label>
                                                <p className="pl-1">veya sürükleyip bırakın</p>
                                            </div>
                                            <p className="text-xs text-gray-500">PNG, JPG, GIF (Max 5MB per file)</p>
                                        </div>
                                    </div>

                                    {/* Seçilen Resimlerin Listesi */}
                                    {images.length > 0 && (
                                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {images.map((img, idx) => (
                                                <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50">
                                                    <div className="aspect-w-16 aspect-h-9 h-24">
                                                        <img 
                                                            src={URL.createObjectURL(img)} 
                                                            alt={`Seçilen ${idx + 1}`} 
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="p-2 bg-white/90 backdrop-blur-sm flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-gray-600 truncate flex-1 mr-2">{img.name}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                                                            className="text-red-500 hover:text-red-700 transition-colors"
                                                            title="Kaldır"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ÇÖZÜM ALANI */}
                            {enableInstantSolution && (
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
                                            {enableMentions ? (
                                                <MentionWrapper value={solutionDescription} onChange={(val) => setSolutionDescription(val)} institutionId={institution?.id}>
                                                    <textarea
                                                        className="block w-full border border-indigo-200 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm transition bg-white"
                                                        rows={3}
                                                        required={hasSolution} // Eğer çözüm eklenecekse açıklaması zorunlu olsun
                                                        placeholder="Sizce bu sorun nasıl çözülmeli? Fikrinizi toplulukla paylaşın..."
                                                        value={solutionDescription}
                                                        onChange={(e) => setSolutionDescription(e.target.value)}
                                                    ></textarea>
                                                </MentionWrapper>
                                            ) : (
                                                <textarea
                                                    className="block w-full border border-indigo-200 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm transition bg-white"
                                                    rows={3}
                                                    required={hasSolution} // Eğer çözüm eklenecekse açıklaması zorunlu olsun
                                                    placeholder="Sizce bu sorun nasıl çözülmeli? Fikrinizi toplulukla paylaşın..."
                                                    value={solutionDescription}
                                                    onChange={(e) => setSolutionDescription(e.target.value)}
                                                ></textarea>
                                            )}
                                        </div>

                                        {/* Çözüm Resimleri */}
                                        {allowSolutionImageUpload && (
                                            <div>
                                                <label className="block text-xs font-bold text-indigo-900 mb-1">Çözüm Resimleri (Maks: {maxSolutionImages})</label>
                                                <input 
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files || []);
                                                        if (files.length > maxSolutionImages) {
                                                            alert(`En fazla ${maxSolutionImages} görsel seçebilirsiniz.`);
                                                            e.target.value = '';
                                                            return;
                                                        }
                                                        setSolutionImages(files);
                                                    }}
                                                    className="w-full text-xs text-indigo-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"
                                                />
                                                {solutionImages.length > 0 && (
                                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                                        {solutionImages.map((img, idx) => (
                                                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-indigo-200 shadow-sm">
                                                                <img 
                                                                    src={URL.createObjectURL(img)} 
                                                                    alt={`Çözüm Görsel ${idx + 1}`} 
                                                                    className="w-full h-full object-cover" 
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSolutionImages(prev => prev.filter((_, i) => i !== idx))}
                                                                    className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-md hover:bg-red-600 transition shadow-sm"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            )}

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