import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextAlign } from '@tiptap/extension-text-align';
import React, { useEffect } from 'react';

interface EmailWysiwygEditorProps {
  value: string; // HTML string
  onChange: (html: string) => void;
  height?: number;
  placeholder?: string;
}

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

export const EmailWysiwygEditor = ({ value, onChange, height = 400, placeholder = 'E-posta içeriğini buraya yazın...' }: EmailWysiwygEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-600 underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg shadow-sm my-4',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full my-4 border border-slate-300',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[300px] prose prose-sm max-w-none px-6 py-4 text-slate-700 leading-relaxed',
        'data-placeholder': placeholder,
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-300 focus-within:border-indigo-400 transition bg-white">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50">
        <div className="flex flex-wrap items-center gap-1">
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
        </div>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <div className="flex flex-wrap items-center gap-1">
          <ToolbarBtn
            title="Kalın"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          ><b>B</b></ToolbarBtn>
          <ToolbarBtn
            title="İtalik"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          ><i>I</i></ToolbarBtn>
          <ToolbarBtn
            title="Altı Çizili"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          ><u>U</u></ToolbarBtn>
          <ToolbarBtn
            title="Üstü Çizili"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          ><del>S</del></ToolbarBtn>
        </div>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <div className="flex flex-wrap items-center gap-1">
          <ToolbarBtn
            title="Liste"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >• L</ToolbarBtn>
          <ToolbarBtn
            title="Numaralı Liste"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >1. L</ToolbarBtn>
          <ToolbarBtn
            title="Blok Alıntı"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >“”</ToolbarBtn>
        </div>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <div className="flex flex-wrap items-center gap-1">
          <ToolbarBtn
            title="Sola Yasla"
            active={editor.isActive({ textAlign: 'left' })}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >⇐</ToolbarBtn>
          <ToolbarBtn
            title="Ortala"
            active={editor.isActive({ textAlign: 'center' })}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >⇔</ToolbarBtn>
          <ToolbarBtn
            title="Sağa Yasla"
            active={editor.isActive({ textAlign: 'right' })}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >⇒</ToolbarBtn>
          <ToolbarBtn
            title="İki Yana Yasla"
            active={editor.isActive({ textAlign: 'justify' })}
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          >≡</ToolbarBtn>
          <ToolbarBtn
            title="Ayraç Ekle"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >—</ToolbarBtn>
        </div>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <div className="flex flex-wrap items-center gap-1">
          <ToolbarBtn
            title="Renk: Kırmızı"
            onClick={() => editor.chain().focus().setColor('#ef4444').run()}
          ><span className="text-red-500">A</span></ToolbarBtn>
          <ToolbarBtn
            title="Renk: Mavi"
            onClick={() => editor.chain().focus().setColor('#3b82f6').run()}
          ><span className="text-blue-500">A</span></ToolbarBtn>
          <ToolbarBtn
            title="Renk: Yeşil"
            onClick={() => editor.chain().focus().setColor('#22c55e').run()}
          ><span className="text-green-500">A</span></ToolbarBtn>
          
          <div className="relative flex items-center">
            <input
              type="color"
              onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
              className="w-8 h-8 p-0 border-0 bg-transparent cursor-pointer rounded overflow-hidden"
              title="Özel Renk Seç"
            />
          </div>

          <ToolbarBtn
            title="Rengi Temizle"
            onClick={() => editor.chain().focus().unsetColor().run()}
          ><span className="text-slate-400">∅</span></ToolbarBtn>
        </div>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <div className="flex flex-wrap items-center gap-1">
          <ToolbarBtn
            title="Link Ekle"
            active={editor.isActive('link')}
            onClick={() => {
              const url = window.prompt('URL girin:');
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }}
          >🔗</ToolbarBtn>
          <ToolbarBtn
            title="Tablo Ekle"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >▦</ToolbarBtn>
          <ToolbarBtn
            title="Resim Ekle (URL)"
            onClick={() => {
              const url = window.prompt('Resim URL girin:');
              if (url) editor.chain().focus().setImage({ src: url }).run();
            }}
          >🖼️</ToolbarBtn>
        </div>

        <div className="w-px h-5 bg-slate-300 mx-1 ml-auto" />

        <div className="flex flex-wrap items-center gap-1">
          <ToolbarBtn
            title="Formatı Temizle"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          >🧹</ToolbarBtn>
          <ToolbarBtn
            title="Geri Al"
            onClick={() => editor.chain().focus().undo().run()}
          >↶</ToolbarBtn>
          <ToolbarBtn
            title="İleri Al"
            onClick={() => editor.chain().focus().redo().run()}
          >↷</ToolbarBtn>
        </div>
      </div>

      <div style={{ minHeight: height }} className="overflow-y-auto bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};


