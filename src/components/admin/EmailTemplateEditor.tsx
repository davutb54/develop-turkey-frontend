import React, { useState } from 'react';
import { type EmailTemplate } from '../../types';
import { EmailWysiwygEditor } from './EmailWysiwygEditor';
import { toast } from 'react-hot-toast';

interface EmailTemplateEditorProps {
  template: EmailTemplate;
  onSave: (template: EmailTemplate) => void;
  onCancel: () => void;
}

export const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({ template, onSave, onCancel }) => {
  const [editedTemplate, setEditedTemplate] = useState<EmailTemplate>({ ...template });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedTemplate(prev => ({ ...prev, [name]: value }));
  };

  const handleBodyChange = (html: string) => {
    setEditedTemplate(prev => ({ ...prev, body: html }));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-slate-50 px-8 py-4 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Şablon Düzenle: {template.templateKey}</h3>
          <p className="text-sm text-slate-500">Bu şablon sistem tarafından "{template.description}" durumunda kullanılır.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => onSave(editedTemplate)}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
          >
            Değişiklikleri Kaydet
          </button>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">E-posta Konusu</label>
            <input
              type="text"
              name="subject"
              value={editedTemplate.subject}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              placeholder="E-posta konusunu girin..."
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">Kullanılabilir Değişkenler</label>
            <div className="flex flex-wrap gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl min-h-[46px]">
              {template.availablePlaceholders?.split(',').map(p => {
                const placeholder = p.trim();
                return (
                  <code 
                    key={placeholder} 
                    onClick={() => {
                      navigator.clipboard.writeText(placeholder);
                      toast.success(`${placeholder} kopyalandı`);
                    }}
                    className="bg-white px-2 py-0.5 rounded text-indigo-700 text-xs font-mono border border-indigo-200 cursor-pointer hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all active:scale-95"
                    title="Kopyalamak için tıkla"
                  >
                    {placeholder}
                  </code>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 italic mt-1">Değişkeni kopyalamak için üzerine tıklayın, ardından editöre yapıştırın.</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700">E-posta İçeriği (HTML)</label>
          <EmailWysiwygEditor 
            value={editedTemplate.body} 
            onChange={handleBodyChange} 
          />
        </div>

        <div className="flex items-center gap-2 pt-4">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={editedTemplate.isActive}
            onChange={(e) => setEditedTemplate(prev => ({ ...prev, isActive: e.target.checked }))}
            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-slate-700 select-none cursor-pointer">
            Bu şablonu aktif olarak kullan
          </label>
        </div>
      </div>
    </div>
  );
};


