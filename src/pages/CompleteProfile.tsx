import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { constantService } from '../services/constantService';
import { useNavigate } from 'react-router-dom';
import type { City, Gender } from '../types';
import SearchableSelect from '../components/SearchableSelect';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  const [formData, setFormData] = useState({
    cityCode: 0,
    genderCode: -1
  });

  const [cities, setCities] = useState<City[]>([]);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cityRes = await constantService.getCities();
        const genderRes = await constantService.getGenders();

        if (cityRes.data.success) setCities(cityRes.data.data);
        if (genderRes.data.success) setGenders(genderRes.data.data);

        // Mevcut kullanıcı bilgilerini de çekip name/surname gibi göstermek istersek getMe atabiliriz ama şimdilik sadece eksikleri soruyoruz
        const meRes = await userService.getMe();
        if (meRes.data.success) {
          setFormData({
            cityCode: meRes.data.data.cityCode || 0,
            genderCode: meRes.data.data.genderCode || -1
          });
        }
      } catch (err) {
        console.error("Veri çekme hatası", err);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.cityCode === -1 || formData.cityCode === 0) {
      toast.error("Lütfen bir şehir seçiniz.");
      return;
    }
    if (formData.genderCode === -1 || formData.genderCode === 0) {
      toast.error("Lütfen cinsiyet seçiniz.");
      return;
    }

    setLoading(true);

    try {
      // updateUserDetails expects all fields, let's get current user first
      const meRes = await userService.getMe();
      if (meRes.data.success) {
        const user = meRes.data.data;
        await userService.updateDetails({
          id: user.id,
          name: user.name,
          surname: user.surname,
          email: user.email,
          cityCode: formData.cityCode,
          genderCode: formData.genderCode
        });

        await checkAuth(); // isProfileIncomplete false olacak
        toast.success("Profiliniz tamamlandı. Hoşgeldiniz!");
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.Message || err.response?.data?.message || err.response?.data || "Profil güncellenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100 animate-fade-in">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">
            Hoşgeldiniz!
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500 font-medium">
            Sizi daha iyi tanıyabilmemiz için lütfen eksik kalan bilgilerinizi tamamlayın.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Şehriniz</label>
              <SearchableSelect
                options={cities.filter(c => c.value !== 0).map(c => ({ value: c.value, label: c.text }))}
                value={formData.cityCode}
                onChange={(val) => setFormData(prev => ({ ...prev, cityCode: Number(val) }))}
                placeholder="Şehir Seçiniz"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Cinsiyetiniz</label>
              <select
                name="genderCode"
                className="input-field bg-white w-full"
                onChange={handleChange}
                value={formData.genderCode}
                disabled={loading}
              >
                <option value={-1}>Cinsiyet Seçiniz</option>
                {genders.map(gender => (
                  <option key={gender.value} value={gender.value}>{gender.text}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || formData.cityCode === 0 || formData.genderCode === -1 || formData.genderCode === 0}
            className={`w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent text-sm font-black rounded-xl text-white shadow-lg transition-all active:scale-95 
                ${(loading || formData.cityCode === 0 || formData.genderCode === -1 || formData.genderCode === 0) ? 'bg-slate-300 cursor-not-allowed opacity-70' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Kaydediliyor...
              </>
            ) : (
              'Profili Tamamla ve Devam Et'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;
