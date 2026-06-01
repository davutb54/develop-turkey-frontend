import { useState, useEffect, useRef } from 'react';
import { userService } from '../../services/userService';
import type { UserDetailDto } from '../../types';

interface Props {
    selectedUser: UserDetailDto | null;
    onSelect: (user: UserDetailDto) => void;
    onClear: () => void;
    placeholder?: string;
    className?: string;
}

export default function UserSearchInput({
    selectedUser,
    onSelect,
    onClear,
    placeholder = 'İsim, e-posta veya ID ara...',
    className = '',
}: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UserDetailDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Dışarı tıklandığında kapat
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node))
                setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Debounced search
    useEffect(() => {
        if (query.length < 2) { setResults([]); return; }
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await userService.getAllPaged({ searchText: query, pageSize: 8 });
                if (res.data.success) {
                    setResults(res.data.data.items ?? res.data.data);
                    setOpen(true);
                }
            } catch { setResults([]); }
            finally { setLoading(false); }
        }, 350);
        return () => clearTimeout(timer);
    }, [query]);

    if (selectedUser) {
        return (
            <div className={`flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg ${className}`}>
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {selectedUser.userName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{selectedUser.userName}</div>
                    <div className="text-xs text-gray-500 truncate">{selectedUser.email}</div>
                </div>
                <button onClick={onClear} className="text-gray-400 hover:text-red-500 text-lg leading-none flex-shrink-0">×</button>
            </div>
        );
    }

    return (
        <div ref={ref} className={`relative ${className}`}>
            <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
            />
            {loading && (
                <div className="absolute right-3 top-2.5 text-gray-400 text-sm">...</div>
            )}
            {open && results.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {results.map(u => (
                        <button
                            key={u.id}
                            type="button"
                            onClick={() => { onSelect(u); setQuery(''); setOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 text-left"
                        >
                            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {u.userName?.[0]?.toUpperCase() ?? '?'}
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{u.userName}</div>
                                <div className="text-xs text-gray-500 truncate">{u.email}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
