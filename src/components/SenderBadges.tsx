import type { UserTitleDto } from '../types';

interface Props {
    isExpert?: boolean;
    isOfficial?: boolean;
    titles?: UserTitleDto[];
    size?: 'xs' | 'sm';
}

const kindStyles: Record<string, string> = {
    expert:   'bg-emerald-100 text-emerald-700',
    official: 'bg-blue-100 text-blue-700',
    custom:   'bg-violet-100 text-violet-700',
};

export default function SenderBadges({ isExpert, isOfficial, titles = [], size = 'xs' }: Props) {
    const textSize = size === 'xs' ? 'text-[9px]' : 'text-[10px]';
    const padding  = size === 'xs' ? 'px-1.5 py-0.5' : 'px-2 py-1';

    return (
        <span className="flex items-center flex-wrap gap-1">
            {isExpert && !titles.some(t => t.kind === 'expert') && (
                <span className={`${padding} bg-emerald-100 text-emerald-700 ${textSize} rounded font-black uppercase tracking-wider`}>
                    Uzman
                </span>
            )}
            {isOfficial && !titles.some(t => t.kind === 'official') && (
                <span className={`${padding} bg-blue-100 text-blue-700 ${textSize} rounded font-black uppercase tracking-wider`}>
                    Yetkili
                </span>
            )}
            {titles.map(t => {
                const base = kindStyles[t.kind] ?? 'bg-gray-100 text-gray-700';
                const style = t.color
                    ? { backgroundColor: `${t.color}22`, color: t.color }
                    : undefined;
                return (
                    <span
                        key={t.id}
                        className={`${padding} ${style ? '' : base} ${textSize} rounded font-black uppercase tracking-wider`}
                        style={style}
                    >
                        {t.icon ? `${t.icon} ` : ''}{t.label}
                    </span>
                );
            })}
        </span>
    );
}
