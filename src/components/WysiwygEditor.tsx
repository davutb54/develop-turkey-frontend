import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { useEffect } from 'react';

interface WysiwygEditorProps {
    value: string;           // Markdown string
    onChange: (md: string) => void;
    height?: number;
    placeholder?: string;
}

// ── Toolbar Butonu ───────────────────────────────────────────────────────────
const ToolbarBtn = ({
    onClick,
    active,
    title,
    children,
}: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
}) => (
    <button
        type="button"
        title={title}
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        className={`p-1.5 rounded-lg text-sm font-bold transition-colors select-none ${
            active
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
        }`}
    >
        {children}
    </button>
);

// ── Ana Bileşen ───────────────────────────────────────────────────────────────
const WysiwygEditor = ({ value, onChange, height = 380, placeholder = 'Sözleşme içeriğini buraya yazın...' }: WysiwygEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Markdown.configure({
                html: false,
                tightLists: true,
                breaks: true,
            }),
        ],
        content: value,          // ilk yükleme: Markdown → HTML
        onUpdate({ editor }) {
            const md = (editor.storage as any).markdown.getMarkdown();
            onChange(md);
        },
        editorProps: {
            attributes: {
                class: 'outline-none min-h-[200px] prose prose-sm max-w-none px-4 py-3 text-slate-700 leading-relaxed',
                'data-placeholder': placeholder,
            },
        },
    });

    // Dışarıdan value sıfırlandığında (form temizleme) editörü güncelle
    useEffect(() => {
        if (!editor) return;
        const currentMd = (editor.storage as any).markdown.getMarkdown();
        if (value === '' && currentMd !== '') {
            editor.commands.clearContent();
        }
    }, [value, editor]);

    if (!editor) return null;

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-300 focus-within:border-indigo-400 transition bg-white">
            {/* ── TOOLBAR ── */}
            <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50">
                {/* Başlıklar */}
                <ToolbarBtn
                    title="Başlık 1"
                    active={editor.isActive('heading', { level: 1 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                >H1</ToolbarBtn>
                <ToolbarBtn
                    title="Başlık 2"
                    active={editor.isActive('heading', { level: 2 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                >H2</ToolbarBtn>
                <ToolbarBtn
                    title="Başlık 3"
                    active={editor.isActive('heading', { level: 3 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                >H3</ToolbarBtn>

                <div className="w-px h-5 bg-slate-300 mx-1" />

                {/* Metin formatları */}
                <ToolbarBtn
                    title="Kalın (Ctrl+B)"
                    active={editor.isActive('bold')}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4h-8v-8zM6 12h9a4 4 0 014 4 4 4 0 01-4 4H6v-8z"/>
                    </svg>
                </ToolbarBtn>
                <ToolbarBtn
                    title="İtalik (Ctrl+I)"
                    active={editor.isActive('italic')}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 4v3h2.21l-3.42 10H6v3h8v-3h-2.21l3.42-10H18V4z"/>
                    </svg>
                </ToolbarBtn>
                <ToolbarBtn
                    title="Üstü Çizili"
                    active={editor.isActive('strike')}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6.85 7.08C6.85 4.37 9.45 3 12.24 3c1.64 0 3 .49 3.9 1.28.87.76 1.39 1.8 1.39 2.97h-2.69c0-.66-.26-1.31-.77-1.74-.51-.42-1.23-.64-2.01-.64-1.61 0-2.52.64-2.52 1.66 0 .66.38 1.16 1.06 1.57.36.22.76.42 1.18.59H7.7c-.4-.37-.85-.8-.85-1.61zM22 12v-2H2v2h10.62c.18.07.4.14.55.2.77.28 1.37.62 1.73 1.03.36.4.52.86.52 1.39 0 .58-.21 1.09-.61 1.51-.4.43-1.14.64-2.15.64-1.14 0-2.01-.29-2.56-.81-.51-.48-.78-1.14-.78-1.94H6.87c0 .83.17 1.61.52 2.28.35.67.88 1.23 1.57 1.66.69.44 1.52.75 2.48.9.92.14 1.83.2 2.74.17 1.16-.04 2.19-.3 3.04-.76.85-.46 1.51-1.12 1.97-1.96.47-.85.71-1.77.71-2.76 0-.63-.09-1.22-.27-1.77-.18-.55-.46-1.05-.85-1.5z"/>
                    </svg>
                </ToolbarBtn>

                <div className="w-px h-5 bg-slate-300 mx-1" />

                {/* Listeler */}
                <ToolbarBtn
                    title="Madde İşaretli Liste"
                    active={editor.isActive('bulletList')}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                    </svg>
                </ToolbarBtn>
                <ToolbarBtn
                    title="Numaralı Liste"
                    active={editor.isActive('orderedList')}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h13M7 12h13M7 18h13M3 6h.01M3 12h.01M3 18h.01"/>
                    </svg>
                </ToolbarBtn>

                <div className="w-px h-5 bg-slate-300 mx-1" />

                {/* Alıntı */}
                <ToolbarBtn
                    title="Alıntı"
                    active={editor.isActive('blockquote')}
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
                    </svg>
                </ToolbarBtn>

                {/* Yatay çizgi */}
                <ToolbarBtn
                    title="Yatay Çizgi"
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14"/>
                    </svg>
                </ToolbarBtn>

                <div className="w-px h-5 bg-slate-300 mx-1" />

                {/* Geri al / İleri al */}
                <ToolbarBtn
                    title="Geri Al (Ctrl+Z)"
                    onClick={() => editor.chain().focus().undo().run()}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                    </svg>
                </ToolbarBtn>
                <ToolbarBtn
                    title="İleri Al (Ctrl+Y)"
                    onClick={() => editor.chain().focus().redo().run()}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"/>
                    </svg>
                </ToolbarBtn>
            </div>

            {/* ── İÇERİK ALANI ── */}
            <div style={{ minHeight: height }} className="overflow-y-auto">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};

export default WysiwygEditor;
