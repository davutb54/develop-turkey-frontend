import React, { useState, useEffect } from 'react';
import { type EmailTemplate } from '../../types';
import { emailTemplateService } from '../../services/emailTemplateService';
import { EmailTemplateEditor } from './EmailTemplateEditor';
import { toast } from 'react-hot-toast';

const EmailTemplatesList: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await emailTemplateService.getAll();
      if (response.success) {
        setTemplates(response.data);
      }
    } catch (error) {
      toast.error('Şablonlar yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsEditing(true);
  };

  const handleSave = async (template: EmailTemplate) => {
    try {
      let response;
      if (template.id > 0) {
        response = await emailTemplateService.update(template);
      } else {
        response = await emailTemplateService.add(template);
      }

      if (response.success) {
        toast.success(response.message);
        setIsEditing(false);
        setSelectedTemplate(null);
        fetchTemplates();
      }
    } catch (error) {
      toast.error('Kaydedilirken bir hata oluştu.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bu şablonu silmek istediğinize emin misiniz?')) return;
    const template = templates.find(t => t.id === id);
    if (!template) return;

    try {
      const response = await emailTemplateService.delete(template);
      if (response.success) {
        toast.success(response.message);
        fetchTemplates();
      }
    } catch (error) {
      toast.error('Silinirken bir hata oluştu.');
    }
  };

  const handleAddNew = () => {
    const newTemplate: EmailTemplate = {
      id: 0,
      templateKey: '',
      subject: '',
      body: '',
      description: '',
      availablePlaceholders: '',
      isActive: true
    };
    setSelectedTemplate(newTemplate);
    setIsEditing(true);
  };

  if (isEditing && selectedTemplate) {
    return (
      <EmailTemplateEditor
        template={selectedTemplate}
        onSave={handleSave}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">E-posta Şablonları</h2>
          <p className="text-slate-500 mt-1">Sistem tarafından gönderilen otomatik e-postaları buradan yönetebilirsiniz.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
        >
          <span className="text-xl">+</span> Yeni Şablon Ekle
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{template.templateKey}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{template.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    template.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {template.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="text-sm">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Konu Satırı</span>
                    <span className="text-slate-700 font-medium line-clamp-1 italic">"{template.subject}"</span>
                  </div>
                  <div className="text-sm">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kullanılabilir Değişkenler</span>
                    <div className="flex flex-wrap gap-1">
                      {template.availablePlaceholders?.split(',').map(p => (
                        <code key={p} className="bg-indigo-50 text-indigo-600 text-[10px] px-1.5 py-0.5 rounded border border-indigo-100">
                          {p.trim()}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex border-t border-slate-100">
                <button
                  onClick={() => handleEdit(template)}
                  className="flex-1 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors border-r border-slate-100"
                >
                  Düzenle
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                  title="Sil"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmailTemplatesList;
