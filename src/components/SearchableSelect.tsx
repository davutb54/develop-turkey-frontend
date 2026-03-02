import { useState, useRef, useEffect } from 'react';

interface Option {
    value: string | number;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string | number;
    onChange: (value: string | number) => void;
    placeholder?: string;
    disabled?: boolean;
}

const SearchableSelect = ({ options, value, onChange, placeholder = "Seçiniz", disabled = false }: SearchableSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Seçili öğeyi bul
    const selectedOption = options.find(opt => String(opt.value) === String(value));

    // Arama filtresi (Büyük/Küçük harf duyarsız ve Türkçe karakter uyumlu)
    const filteredOptions = options.filter(opt =>
        opt.label.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR'))
    );

    // Dışarı tıklanınca menüyü kapat
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm(''); // Kapatılınca aramayı sıfırla
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={wrapperRef} className="relative w-full">
            {/* Tıklanabilir Kutu */}
            <div
                className={`w-full px-3 py-2 border border-gray-300 rounded-md bg-white flex justify-between items-center text-sm cursor-pointer shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-blue-400'}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>

            {/* Açılır Menü (Dropdown) */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-fade-in-down">
                    
                    {/* Arama Kutusu (Input) */}
                    <div className="sticky top-0 p-2 bg-slate-50 border-b border-gray-100">
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="Ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()} // Tıklanınca menünün kapanmasını engelle
                            autoFocus
                        />
                    </div>

                    {/* Şehir Listesi */}
                    <ul className="py-1">
                        {/* Varsayılan / Sıfırlama Seçeneği */}
                        <li
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-500 italic border-b border-gray-50"
                            onClick={() => { onChange(0); setIsOpen(false); setSearchTerm(''); }}
                        >
                            {placeholder}
                        </li>
                        
                        {filteredOptions.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-gray-500 text-center">Sonuç bulunamadı</li>
                        ) : (
                            filteredOptions.map((opt) => (
                                <li
                                    key={opt.value}
                                    className={`px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm transition-colors ${String(opt.value) === String(value) ? 'bg-blue-100 font-bold text-blue-700' : 'text-gray-700'}`}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                >
                                    {opt.label}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;