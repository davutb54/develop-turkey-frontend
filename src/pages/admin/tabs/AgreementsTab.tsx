import AgreementsTabComponent from '../../../components/AgreementsTab';
import { useCapability } from '../../../hooks/useCapability';

export default function AgreementsTab() {
    const canManage = useCapability('admin.legal_agreement_manage');
    if (!canManage) return <div className="p-10 text-center text-slate-500">Bu sayfayı görüntüleme yetkiniz yok.</div>;
    return (
        <div className="p-6 md:p-10">
            <AgreementsTabComponent />
        </div>
    );
}
