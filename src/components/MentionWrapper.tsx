import React, { useState, useEffect, useRef } from 'react';
import { userService } from '../services/userService';
import type { UserPublicProfileDto } from '../types';
import { getProfileImageUrl } from '../utils/imageUtils';

interface MentionWrapperProps {
    children: React.ReactElement<HTMLTextAreaElement | HTMLInputElement>;
    value: string;
    onChange: (newValue: string) => void;
    institutionId?: number;
}

const MentionWrapper: React.FC<MentionWrapperProps> = ({ children, value, onChange, institutionId }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [users, setUsers] = useState<UserPublicProfileDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [cursorPos, setCursorPos] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

    // `@` karakterini ve sonrasındaki sorguyu yakala
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        const val = e.target.value;
        const selectionStart = e.target.selectionStart || 0;
        setCursorPos(selectionStart);

        const lastAtIndex = val.lastIndexOf('@', selectionStart - 1);
        
        // Eğer @ işaretinden önce boşluk veya satır başı varsa
        if (lastAtIndex !== -1 && (lastAtIndex === 0 || val[lastAtIndex - 1] === ' ' || val[lastAtIndex - 1] === '\n')) {
            const query = val.slice(lastAtIndex + 1, selectionStart);
            if (!query.includes(' ')) {
                setSearchQuery(query);
                setShowDropdown(true);
                calculateDropdownPosition(e.target, lastAtIndex);
                return;
            }
        }
        setShowDropdown(false);
    };

    const calculateDropdownPosition = (input: HTMLTextAreaElement | HTMLInputElement, index: number) => {
        // Basit bir konumlandırma; gerçek pixel hassasiyeti için "caret-pos" kütüphanesi gerekebilir.
        // Şimdilik input'un altına sabitliyoruz.
        const rect = input.getBoundingClientRect();
        setDropdownPos({
            top: input.offsetHeight + 5,
            left: Math.min(index * 8, input.offsetWidth - 200) // Kaba bir tahmin
        });
    };

    useEffect(() => {
        if (showDropdown && searchQuery.length >= 2) {
            setLoading(true);
            const timer = setTimeout(async () => {
                try {
                    const response = await userService.searchMentions(searchQuery, institutionId);
                    if (response.data && response.data.data && response.data.data.items) {
                        setUsers(response.data.data.items as any);
                    }
                } catch (error) {
                    console.error("Mention search error:", error);
                } finally {
                    setLoading(false);
                }
            }, 300);
            return () => clearTimeout(timer);
        } else if (searchQuery.length < 2) {
            setUsers([]);
        }
    }, [searchQuery, showDropdown, institutionId]);

    const insertMention = (user: UserPublicProfileDto) => {
        const lastAtIndex = value.lastIndexOf('@', cursorPos - 1);
        const before = value.slice(0, lastAtIndex);
        const after = value.slice(cursorPos);
        const newValue = `${before}@${user.userName} ${after}`;
        onChange(newValue);
        setShowDropdown(false);
        
        // Input'a focus ver
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showDropdown || users.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % users.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + users.length) % users.length);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            insertMention(users[selectedIndex]);
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {React.cloneElement(children, {
                ref: inputRef,
                onInput: (e: any) => {
                    handleInput(e);
                    if (children.props.onInput) children.props.onInput(e);
                },
                onKeyDown: (e: any) => {
                    handleKeyDown(e);
                    if (children.props.onKeyDown) children.props.onKeyDown(e);
                }
            })}

            {showDropdown && (
                <div 
                    className="absolute z-[9999] w-64 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
                    style={{ top: dropdownPos.top, left: dropdownPos.left }}
                >
                    <div className="p-2 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kullanıcı Etiketle</span>
                        {loading && <div className="h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {users.length === 0 ? (
                            <div className="p-4 text-center text-xs text-gray-500 italic">
                                {searchQuery.length < 2 ? 'En az 2 harf yazın...' : 'Kullanıcı bulunamadı.'}
                            </div>
                        ) : (
                            users.map((user, index) => (
                                <div
                                    key={user.id}
                                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                    onClick={() => insertMention(user)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                >
                                    <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                                        {user.profileImageUrl ? (
                                            <img src={getProfileImageUrl(user.profileImageUrl)} alt={user.userName} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
                                                {user.userName[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-bold text-gray-900 truncate">@{user.userName}</span>
                                        <span className="text-[10px] text-gray-500 truncate">{user.name} {user.surname}</span>
                                    </div>
                                    {user.isOfficial && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold ml-auto">Resmi</span>}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MentionWrapper;
