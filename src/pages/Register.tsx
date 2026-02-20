import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { constantService } from '../services/constantService';
import { useNavigate, Link } from 'react-router-dom';
import type { City, Gender } from '../types';

const Register = () => {
  const navigate = useNavigate();
  
  // Form Verileri
  const [formData, setFormData] = useState({
    userName: '',
    name: '',
    surname: '',
    email: '',
    password: '',
    cityCode: 0,
    genderCode: -1, // Seçilmedi durumu
    emailNotificationPermission: true
  });

  // Dropdown Verileri
  const [cities, setCities] = useState<City[]>([]);
  const [genders, setGenders] = useState<Gender[]>([]);
  
  const [error, setError] = useState('');

  // Sayfa yüklenince Şehir ve Cinsiyetleri Çek
  useEffect(() => {
    const fetchData = async () => {
      try {
        const cityRes = await constantService.getCities();
        const genderRes = await constantService.getGenders();
        
        if (cityRes.data.success) setCities(cityRes.data.data);
        if (genderRes.data.success) setGenders(genderRes.data.data);
      } catch (err) {
        console.error("Veri çekme hatası", err);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Checkbox kontrolü
    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        // Sayısal değerler için dönüşüm
        const val = (name === 'cityCode' || name === 'genderCode') ? Number(value) : value;
        setFormData(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.cityCode === 0) {
        setError("Lütfen bir şehir seçiniz.");
        return;
    }
    if (formData.genderCode === -1) {
        setError("Lütfen cinsiyet seçiniz.");
        return;
    }

    try {
      const response = await userService.register(formData);
      
      // Token varsa her şey yolundadır
      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        alert("Kayıt Başarılı! Hoşgeldiniz.");
        navigate('/verify-email', { state: { email: formData.email } });
      } else {
        setError("Kayıt işlemi başarısız oldu.");
      }
    } catch (err: any) {
      // Hata mesajını belirle
      let errorMessage = "Sunucu hatası.";

      if (err.response && err.response.data) {
         if (Array.isArray(err.response.data)) {
            errorMessage = err.response.data.map((e: any) => e.errorMessage).join(", ");
         } else {
            errorMessage = typeof err.response.data === 'string' 
                ? err.response.data 
                : err.response.data.message || "Bir hata oluştu";
         }
      }

      // --- ÖZEL MÜDAHALE BURADA BAŞLIYOR ---
      // Eğer backend "Kayıt oldu ama..." diyorsa, aslında kayıt başarılıdır.
      if (errorMessage.includes("Kayıt oldu")) {
          alert("Kaydınız oluşturuldu ancak doğrulama e-postası gönderilemedi (Sunucu Hatası). Giriş yapabilirsiniz.");
          navigate('/login'); // Kullanıcıyı giriş sayfasına at
          return;
      }
      // -------------------------------------

      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Kayıt Ol
          </h2>
        </div>
        
        <form className="mt-8 space-y-4" onSubmit={handleRegister}>
          
          <div className="grid grid-cols-2 gap-4">
            <input name="name" type="text" required placeholder="Ad" 
                   className="input-field" onChange={handleChange} />
            <input name="surname" type="text" required placeholder="Soyad" 
                   className="input-field" onChange={handleChange} />
          </div>

          <input name="userName" type="text" required placeholder="Kullanıcı Adı" 
                 className="input-field w-full" onChange={handleChange} />
          
          <input name="email" type="email" required placeholder="E-posta" 
                 className="input-field w-full" onChange={handleChange} />

          <input name="password" type="password" required placeholder="Şifre" 
                 className="input-field w-full" onChange={handleChange} />

          <div className="grid grid-cols-2 gap-4">
            <select name="cityCode" className="input-field" onChange={handleChange} value={formData.cityCode}>
                <option value={0}>Şehir Seçiniz</option>
                {cities.map(city => (
                    <option key={city.value} value={city.value}>{city.text}</option>
                ))}
            </select>

            <select name="genderCode" className="input-field" onChange={handleChange} value={formData.genderCode}>
                <option value={-1}>Cinsiyet</option>
                {genders.map(gender => (
                    <option key={gender.value} value={gender.value}>{gender.text}</option>
                ))}
            </select>
          </div>

          <div className="flex items-center">
            <input id="email-notif" name="emailNotificationPermission" type="checkbox" 
                   checked={formData.emailNotificationPermission} onChange={handleChange}
                   className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
            <label htmlFor="email-notif" className="ml-2 block text-sm text-gray-900">
              E-posta bildirimlerini almak istiyorum
            </label>
          </div>

          {error && <div className="text-red-500 text-sm text-center">{error}</div>}

          <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition">
            Kayıt Ol
          </button>

          <div className="text-center mt-4">
             <Link to="/login" className="text-sm text-blue-600 hover:underline">Zaten hesabın var mı? Giriş Yap</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;