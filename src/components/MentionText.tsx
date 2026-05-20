import React from 'react';
import { Link } from 'react-router-dom';
import { useFeature } from '../hooks/useFeature';

interface MentionTextProps {
    text: string;
    className?: string;
}

const MentionText: React.FC<MentionTextProps> = ({ text, className }) => {
    const isMentionsEnabled = useFeature<boolean>('Social.EnableMentions', true);
    
    if (!text) return null;

    // Eğer etiketleme özelliği kapalıysa doğrudan metni dön
    if (!isMentionsEnabled) {
        return <span className={className}>{text}</span>;
    }

    // Regex: @ işaretinden sonra gelen kullanıcı adlarını yakalar
    // Split yaparken parantez kullandığımız için yakalanan @username kısımları da array içinde kalır
    const mentionRegex = /(@[a-zA-Z0-9._]{3,})/g;
    
    const parts = text.split(mentionRegex);

    return (
        <span className={className}>
            {parts.map((part, index) => {
                // Eğer bu parça @ ile başlıyorsa bir etiket adayıdır (Regex gruplarından dolayı tek sayılarda olur)
                if (index % 2 === 1) {
                    const username = part.substring(1);
                    
                    // E-posta kontrolü: Etiketin önünde boşluk, satır başı olmalı.
                    // parts[index-1] bir önceki metin parçasıdır.
                    const prevPart = index > 0 ? parts[index - 1] : "";
                    const isValidMention = index === 1 || prevPart.endsWith(" ") || prevPart.endsWith("\n") || prevPart.endsWith("\r");

                    if (isValidMention) {
                        return (
                            <Link 
                                key={index} 
                                to={`/user/${username}`} 
                                className="text-blue-600 font-bold hover:underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {part}
                            </Link>
                        );
                    }
                    // Geçerli bir etiket değilse (örn: test@gmail.com içindeki @gmail), normal metin olarak dön
                    return part;
                }
                return part;
            })}
        </span>
    );
};

export default MentionText;
