import EmailTemplatesList from '../../../components/admin/EmailTemplatesList';
import { useCapability } from '../../../hooks/useCapability';

export default function EmailTemplatesTab() {
    const canManage = useCapability('admin.email_template_manage');
    if (!canManage) return <div className="p-10 text-center text-slate-500">Bu sayfayı görüntüleme yetkiniz yok.</div>;
    return (
        <div className="p-6 md:p-10">
            <EmailTemplatesList />
        </div>
    );
}
