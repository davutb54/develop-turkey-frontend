import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { problemService } from '../services/problemService';
import { solutionService } from '../services/solutionService';
import { solutionVoteService } from '../services/solutionVoteService';
import type { ProblemDetailDto, SolutionDetailDto, SolutionAddDto, ProblemViewerDto, ProblemUpvoterDto, ProblemParticipantDto, SolutionVoterDto } from '../types';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import type { LatLngExpression, LeafletMouseEvent } from 'leaflet';
import Navbar from '../components/Navbar';
import CommentSection from '../components/CommentSection';
import ReportModal from '../components/ReportModal';
import { topicService } from '../services/topicService';
import { useAuth } from '../context/AuthContext';
import { useCapability } from '../hooks/useCapability';
import { getProfileImageUrl } from '../utils/imageUtils';
import { actionService } from '../services/actionService';
import { constantService } from '../services/constantService';
import { useFeature, useInstitution, useTerminology } from '../hooks/useFeature';
import MentionWrapper from '../components/MentionWrapper';
import MentionText from '../components/MentionText';
import SocialShare from '../components/SocialShare';
import SenderBadges from '../components/SenderBadges';

function roleLabel(role: string) {
    if (role === 'solution_author') return '✏️ Çözüm';
    if (role === 'commenter') return '💬 Yorum';
    if (role === 'upvoter') return '✋ Destek';
    return role;
}

interface EngagementUserListItem {
    userId: number;
    username: string;
    profileImageUrl?: string | null;
    sub?: string;
}

function EngagementUserList({ items, emptyText }: { items: EngagementUserListItem[]; emptyText: string }) {
    if (items.length === 0) return <p className="text-xs text-gray-400">{emptyText}</p>;
    return (
        <div className="flex flex-wrap gap-2">
            {items.map((item, i) => (
                <a key={`${item.userId}-${i}`} href={`/user/${item.username}`} className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl transition text-xs group">
                    <div className="h-7 w-7 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center shrink-0">
                        {item.profileImageUrl ? (
                            <img src={item.profileImageUrl.startsWith('/') ? `${import.meta.env.VITE_API_URL ?? ''}${item.profileImageUrl}` : item.profileImageUrl} alt={item.username} className="w-full h-full object-cover" />
                        ) : (
                            <span className="font-black text-indigo-700 text-[10px]">{item.username[0]?.toUpperCase()}</span>
                        )}
                    </div>
                    <div>
                        <div className="font-bold text-gray-800 group-hover:text-indigo-700">@{item.username}</div>
                        {item.sub && <div className="text-gray-400 text-[10px]">{item.sub}</div>}
                    </div>
                </a>
            ))}
        </div>
    );
}

const ProblemDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const highlightSolutionPid = searchParams.get('solution') || '';
    const solutionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
    const [focusedSolutionId, setFocusedSolutionId] = useState<number | null>(null);
    const enableUpvote = useFeature<boolean>('Social.EnableUpvote', true);
    const enableComments = useFeature<boolean>('Social.EnableNestedComments', true);
    const enableReports = useFeature<boolean>('Moderation.EnableReportSystem', true);
    const enableFollowSystem = useFeature<boolean>('Social.EnableFollowSystem', true);
    const enableSavedSolutions = useFeature<boolean>('Social.EnableSavedSolutions', true);
    const enableMapLocation = useFeature<boolean>('Content.EnableMapLocation', true);
    const allowSolutionImage = useFeature<boolean>('Content.AllowSolutionImageUpload', true);
    const maxSolutionImages = useFeature<number>('Content.MaxSolutionImageCount', 3);
    const maxProblemImages = useFeature<number>('Content.MaxProblemImageCount', 5);
    const enableMentions = useFeature<boolean>('Social.EnableMentions', true);
    const enableSharing = useFeature<boolean>('Social.EnableSharing', true);

    const [problem, setProblem] = useState<ProblemDetailDto | null>(null);
    const [solutions, setSolutions] = useState<SolutionDetailDto[]>([]);
    const [loading, setLoading] = useState(true);

    const [isFollowing, setIsFollowing] = useState(false);
    const [savedSolutionIds, setSavedSolutionIds] = useState<number[]>([]);
    const [isUpvoted, setIsUpvoted] = useState(false);
    const [followedTopicIds, setFollowedTopicIds] = useState<number[]>([]);

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportTarget, setReportTarget] = useState<{ type: 'Problem' | 'Solution', id: number } | null>(null);

    const [solutionForm, setSolutionForm] = useState({ title: '', description: '' });
    const [solutionImages, setSolutionImages] = useState<File[]>([]);
    const [submitMessage, setSubmitMessage] = useState({ text: '', type: '' });

    const { userId } = useAuth();
    const currentUserId = userId || 0;

    // Capability gating
    const canUpdateOwnProblem   = useCapability('user.problem_update_own');
    const canDeleteOwnProblem   = useCapability('user.problem_delete_own');
    const canModDeleteProblem   = useCapability('moderation.problem_delete');
    const canModResolveProblem  = useCapability('moderation.problem_resolve');
    const canModHighlight       = useCapability('moderation.problem_highlight');
    const canUpdateOwnSolution  = useCapability('user.solution_update_own');
    const canDeleteOwnSolution  = useCapability('user.solution_delete_own');
    const canModDeleteSolution  = useCapability('moderation.solution_delete');
    const canCloseProblem       = useCapability('moderation.problem_close');
    const canReopenProblem      = useCapability('moderation.problem_reopen');
    const canHideProblem        = useCapability('moderation.problem_hide');

    const [isEditingProblem, setIsEditingProblem] = useState(false);
    const [editProblemData, setEditProblemData] = useState({ title: '', description: '' });

    // Düzenlerken: konum + resim + şehir
    const DEFAULT_CENTER: [number, number] = [39.0, 35.0];
    const [cities, setCities] = useState<any[]>([]);
    const [editAddress, setEditAddress] = useState('');
    const [editLatitude, setEditLatitude] = useState<number | null>(null);
    const [editLongitude, setEditLongitude] = useState<number | null>(null);
    const [editClearLocation, setEditClearLocation] = useState(false);
    const [editImages, setEditImages] = useState<File[]>([]);
    const [editExistingImageUrls, setEditExistingImageUrls] = useState<string[]>([]);
    const [editIsLocating, setEditIsLocating] = useState(false);
    const [editLocationError, setEditLocationError] = useState('');
    const [editIsResolvingCity, setEditIsResolvingCity] = useState(false);
    const [editAutoCityName, setEditAutoCityName] = useState<string | null>(null);
    const [editCityCode, setEditCityCode] = useState<number>(-1);
    const [editCustomHierarchyId, setEditCustomHierarchyId] = useState<number | null>(null);
    const institution = useInstitution();
    const terminology = useTerminology();

    // Kategorileri (Tagleri) Düzenlemek İçin:
    const [topics, setTopics] = useState<any[]>([]); // Tüm mevcut kategoriler
    const [editSelectedTopics, setEditSelectedTopics] = useState<number[]>([]);

    // Çözüm (Solution) Düzenleme State'leri
    const [editingSolutionId, setEditingSolutionId] = useState<number | null>(null);
    const [editSolutionTitle, setEditSolutionTitle] = useState('');
    const [editSolutionDesc, setEditSolutionDesc] = useState('');
    const [editSolutionImages, setEditSolutionImages] = useState<File[]>([]);
    const [editSolutionExistingImageUrls, setEditSolutionExistingImageUrls] = useState<string[]>([]);

    // Lightbox State
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Etkileşim paneli state'leri
    const [engagementSection, setEngagementSection] = useState<'viewers' | 'upvoters' | 'participants' | null>(null);
    const [viewers, setViewers] = useState<ProblemViewerDto[] | null>(null);
    const [upvoters, setUpvoters] = useState<ProblemUpvoterDto[] | null>(null);
    const [participants, setParticipants] = useState<ProblemParticipantDto[] | null>(null);
    const [engagementLoading, setEngagementLoading] = useState(false);
    const [engagementDenied, setEngagementDenied] = useState(false);

    // Çözüm oylayanlar
    const [votersSolutionId, setVotersSolutionId] = useState<number | null>(null);
    const [voters, setVoters] = useState<SolutionVoterDto[] | null>(null);
    const [votersLoading, setVotersLoading] = useState(false);
    const [votersDenied, setVotersDenied] = useState(false);

    const openLightbox = (images: string[], index: number) => {
        setLightboxImages(images);
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    const nextLightboxImage = () => {
        setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
    };

    const prevLightboxImage = () => {
        setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
    };

    useEffect(() => {
        if (!id) return;
        // Sayısal ID'ler artık desteklenmiyor — yalnızca publicId (Sqids) çalışır
        if (/^\d+$/.test(id)) return; // numeric URL → bileşen NotFound render eder
        problemService.getByPublicId(id).then(res => {
            if (res.data?.success && res.data.data?.id) loadData(res.data.data.id);
        }).catch(() => {});
        const fetchTopics = async () => {
            const res = await topicService.getAll();
            if (res.data.success) setTopics(res.data.data);
        }
        fetchTopics();

        const fetchCities = async () => {
            try {
                const res = await constantService.getCities();
                if (res.data.success) setCities(res.data.data);
            } catch {
                setCities([]);
            }
        };
        fetchCities();
    }, [id]);

    const handleEditGetMyLocation = () => {
        setEditLocationError('');

        if (!('geolocation' in navigator)) {
            setEditLocationError('Tarayıcınız konum özelliğini desteklemiyor.');
            return;
        }

        setEditIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setEditLatitude(pos.coords.latitude);
                setEditLongitude(pos.coords.longitude);
                setEditClearLocation(false);
                setEditIsLocating(false);
            },
            (err) => {
                if (err.code === err.PERMISSION_DENIED) {
                    setEditLocationError('Konum izni verilmedi. İsterseniz haritadan pin bırakabilirsiniz.');
                } else {
                    setEditLocationError('Konum alınamadı. İsterseniz haritadan pin bırakabilirsiniz.');
                }
                setEditIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const EditLocationClickHandler = () => {
        useMapEvents({
            click(e: LeafletMouseEvent) {
                setEditLatitude(e.latlng.lat);
                setEditLongitude(e.latlng.lng);
                setEditClearLocation(false);
                setEditLocationError('');
            }
        });
        return null;
    };

    const editMapCenter: LatLngExpression = editLatitude !== null && editLongitude !== null
        ? [editLatitude, editLongitude]
        : DEFAULT_CENTER;
    const editMapZoom = editLatitude !== null && editLongitude !== null ? 15 : 6;
    const editCityLocked = !editClearLocation && editLatitude !== null && editLongitude !== null;

    useEffect(() => {
        const resolve = async () => {
            if (!isEditingProblem) return;
            if (editClearLocation) {
                setEditAutoCityName(null);
                setEditIsResolvingCity(false);
                return;
            }
            if (editLatitude === null || editLongitude === null) {
                setEditAutoCityName(null);
                setEditIsResolvingCity(false);
                return;
            }

            setEditIsResolvingCity(true);
            try {
                const res = await constantService.reverseGeocodeCity(editLatitude, editLongitude);
                if (res.data.success) {
                    setEditCityCode(res.data.data.cityCode);
                    setEditAutoCityName(res.data.data.cityName);
                    const resolvedAddress = (res.data.data.resolvedAddress || '').trim();
                    if (!editAddress.trim() && resolvedAddress) {
                        setEditAddress(resolvedAddress.slice(0, 500));
                    }
                    setEditLocationError('');
                }
            } catch (err: any) {
                setEditAutoCityName(null);
                setEditLocationError(err?.response?.data?.message || 'Konumdan şehir tespit edilemedi. Lütfen pini şehir içinde olacak şekilde düzeltin.');
            } finally {
                setEditIsResolvingCity(false);
            }
        };

        resolve();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditingProblem, editLatitude, editLongitude, editClearLocation]);

    useEffect(() => {
        if (highlightSolutionPid && solutions.length > 0) {
            const target = solutions.find(s => s.publicId === highlightSolutionPid);
            if (!target) return;
            const el = solutionRefs.current[target.id];
            if (el) {
                setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setFocusedSolutionId(target.id);
                    setTimeout(() => setFocusedSolutionId(null), 3000);
                }, 300);
            }
        }
    }, [solutions, highlightSolutionPid]);

    const loadEngagement = async (section: 'viewers' | 'upvoters' | 'participants', problemId: number) => {
        if (engagementSection === section) { setEngagementSection(null); return; }
        setEngagementSection(section);
        setEngagementDenied(false);
        setEngagementLoading(true);
        try {
            if (section === 'viewers') {
                const res = await problemService.getViewers(problemId);
                setViewers(res.data?.data ?? []);
            } else if (section === 'upvoters') {
                const res = await problemService.getUpvoters(problemId);
                setUpvoters(res.data?.data ?? []);
            } else {
                const res = await problemService.getParticipants(problemId);
                setParticipants(res.data?.data ?? []);
            }
        } catch (err: any) {
            if (err?.response?.status === 403) setEngagementDenied(true);
        } finally {
            setEngagementLoading(false);
        }
    };

    const loadVoters = async (solutionId: number) => {
        if (votersSolutionId === solutionId) { setVotersSolutionId(null); setVoters(null); return; }
        setVotersSolutionId(solutionId);
        setVotersDenied(false);
        setVotersLoading(true);
        try {
            const res = await solutionVoteService.getVoters(solutionId);
            setVoters(res.data?.data ?? []);
        } catch (err: any) {
            if (err?.response?.status === 403) setVotersDenied(true);
        } finally {
            setVotersLoading(false);
        }
    };

    const loadData = async (problemId: number) => {
        try {
            const [problemRes, solutionRes] = await Promise.all([
                problemService.getById(problemId),
                solutionService.getByProblemId(problemId)
            ]);

            if (problemRes.data.success) {
                setProblem(problemRes.data.data);
            }
            if (solutionRes.data.success) {
                const activeSolutions = solutionRes.data.data.filter((s: any) => !s.isDeleted);
                setSolutions(activeSolutions);
                
                // Fetch saved statuses for active solutions
                if (currentUserId !== 0) {
                    Promise.all(activeSolutions.map((s: any) => actionService.checkSolutionSave(s.id)))
                        .then(results => {
                            const savedIds = activeSolutions
                                .filter((_: any, idx: number) => results[idx].data.isSaved)
                                .map((s: any) => s.id);
                            setSavedSolutionIds(savedIds);
                        })
                        .catch(() => {});
                }
            }

            if (currentUserId !== 0) {
                actionService.checkProblemFollow(problemId)
                    .then(res => setIsFollowing(res.data.isFollowing))
                    .catch(() => {});
                
                actionService.checkProblemUpvote(problemId)
                    .then(res => setIsUpvoted(res.data.isUpvoted))
                    .catch(() => {});

                if (problemRes.data.success && problemRes.data.data.topics) {
                    const topicIds = problemRes.data.data.topics.map((t: any) => t.id);
                    Promise.all(topicIds.map((tid: number) => actionService.checkTopicFollow(tid)))
                        .then(results => {
                            const followedIds = topicIds.filter((_: any, i: number) => results[i].data.isFollowing);
                            setFollowedTopicIds(followedIds);
                        })
                        .catch(() => {});
                }
            }

        } catch (err) {
            console.error("Veri yükleme hatası", err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFollow = async () => {
        if (!currentUserId || currentUserId === 0) {
            alert("Takip etmek için giriş yapmalısınız.");
            return;
        }
        setIsFollowing(!isFollowing); // Optimistic
        try {
            await actionService.toggleProblemFollow(problem!.id);
        } catch {
            setIsFollowing(isFollowing); // Revert
        }
    };

    const handleToggleUpvote = async () => {
        if (!currentUserId || currentUserId === 0) {
            alert("Desteklemek için giriş yapmalısınız.");
            return;
        }
        setIsUpvoted(!isUpvoted);
        setProblem(prev => prev ? { ...prev, upvoteCount: (prev.upvoteCount || 0) + (isUpvoted ? -1 : 1) } : null);
        try {
            await actionService.toggleProblemUpvote(problem!.id);
        } catch {
            setIsUpvoted(isUpvoted);
            setProblem(prev => prev ? { ...prev, upvoteCount: (prev.upvoteCount || 0) + (isUpvoted ? 1 : -1) } : null);
        }
    };

    const handleToggleTopicFollow = async (topicId: number) => {
        if (!currentUserId || currentUserId === 0) {
            alert("Kategori takip etmek için giriş yapmalısınız.");
            return;
        }
        const isTopicFollowed = followedTopicIds.includes(topicId);
        
        if (isTopicFollowed) {
            setFollowedTopicIds(prev => prev.filter(id => id !== topicId));
        } else {
            setFollowedTopicIds(prev => [...prev, topicId]);
        }

        try {
            await actionService.toggleTopicFollow(topicId);
        } catch {
            if (isTopicFollowed) {
                setFollowedTopicIds(prev => [...prev, topicId]);
            } else {
                setFollowedTopicIds(prev => prev.filter(id => id !== topicId));
            }
        }
    };

    const handleToggleSave = async (solutionId: number) => {
        if (!enableSavedSolutions) return;
        if (!currentUserId || currentUserId === 0) {
            alert("Kaydetmek için giriş yapmalısınız.");
            return;
        }
        const isCurrentlySaved = savedSolutionIds.includes(solutionId);
        
        // Optimistic UI update
        if (isCurrentlySaved) {
            setSavedSolutionIds(prev => prev.filter(id => id !== solutionId));
        } else {
            setSavedSolutionIds(prev => [...prev, solutionId]);
        }

        try {
            await actionService.toggleSolutionSave(solutionId);
        } catch {
            // Revert on failure
            if (isCurrentlySaved) {
                setSavedSolutionIds(prev => [...prev, solutionId]);
            } else {
                setSavedSolutionIds(prev => prev.filter(id => id !== solutionId));
            }
        }
    };

    const handleSolutionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUserId || !problem) {
            alert("Lütfen önce giriş yapın.");
            return;
        }

        const newSolution: SolutionAddDto = {
            senderId: currentUserId,
            problemId: problem.id,
            title: solutionForm.title,
            description: solutionForm.description,
            images: solutionImages
        };

        try {
            const result = await solutionService.add(newSolution);
            if (result.data.success) {
                setSubmitMessage({ text: "Çözümünüz başarıyla eklendi!", type: 'success' });
                setSolutionForm({ title: '', description: '' });
                setSolutionImages([]);
                loadData(problem.id);
            } else {
                setSubmitMessage({ text: "Hata: " + result.data.message, type: 'error' });
            }
        } catch (err: any) {
            let errMsg = "Sunucu hatası oluştu.";
            if (err.response?.data) {
                if (typeof err.response.data === 'string') errMsg = err.response.data;
                else if (err.response.data.message) errMsg = err.response.data.message;
                else if (err.response.data.errors) errMsg = Object.values(err.response.data.errors).flat().join('\n');
            }
            setSubmitMessage({ text: "Hata: " + errMsg, type: 'error' });
        }
    };

    const handleUpdateProblem = async () => {
        try {
            const updatedProblem = {
                ...problem,
                title: editProblemData.title,
                description: editProblemData.description,
                topicIds: editSelectedTopics,
                cityCode: editCityCode,
                address: editAddress.trim() ? editAddress.trim() : null,
                latitude: editLatitude,
                longitude: editLongitude,
                clearLocation: editClearLocation,
                customHierarchyId: editCustomHierarchyId,
                imageUrls: editExistingImageUrls.join(','),
                images: editImages
            };

            await problemService.update(updatedProblem);

            // Konum/şehir/resim değişebileceği için yeniden çek
            await loadData(problem!.id);
            setIsEditingProblem(false);
        } catch (err: any) {
            let errMsg = "Güncellenemedi.";
            if (err.response?.data) {
                if (typeof err.response.data === 'string') errMsg = err.response.data;
                else if (err.response.data.message) errMsg = err.response.data.message;
                else if (err.response.data.errors) errMsg = Object.values(err.response.data.errors).flat().join('\n');
            }
            alert("Hata: " + errMsg);
        }
    };

    const handleVote = async (solutionId: number, isUpvote: boolean) => {
        if (!currentUserId) {
            alert("Oy vermek için giriş yapmalısınız.");
            return;
        }
        try {
            await solutionVoteService.vote(solutionId, currentUserId, isUpvote);
            if (problem?.id) loadData(problem.id);
        } catch (err) {
            console.error("Oy verme hatası", err);
        }
    };

    const handleDeleteProblem = async () => {
        if (!window.confirm("Bu sorunu tamamen silmek istediğinize emin misiniz?")) return;
        try {
            await problemService.delete(problem!.id);
            alert("Sorun başarıyla silindi.");
            navigate('/');
        } catch (err) { alert("Sorun silinemedi."); }
    };

    const handleUpdateSolution = async (currentSolution: any) => {
        try {
            const updatedData: any = {
                ...currentSolution,
                title: editSolutionTitle,
                description: editSolutionDesc,
                imageUrls: editSolutionExistingImageUrls.join(','),
                images: editSolutionImages
            };
            await solutionService.update(updatedData);

            // UI'ı anında güncelle (Sayfa yenilemeden) - Resimler değiştiği için reload etmek daha sağlıklı olabilir
            await loadData(problem!.id);
            setEditingSolutionId(null);
            setEditSolutionImages([]);
        } catch (err: any) {
            let errMsg = "Çözüm güncellenemedi.";
            if (err.response?.data) {
                if (typeof err.response.data === 'string') errMsg = err.response.data;
                else if (err.response.data.message) errMsg = err.response.data.message;
                else if (err.response.data.errors) errMsg = Object.values(err.response.data.errors).flat().join('\n');
            }
            alert("Hata: " + errMsg);
        }
    };


    const handleDeleteSolution = async (solutionId: number) => {
        if (!window.confirm("Çözümünüzü silmek istediğinize emin misiniz?")) return;
        try {
            await solutionService.delete(solutionId);
            alert("Çözüm silindi.");
            loadData(problem!.id);
        } catch (err) { alert("Çözüm silinemedi."); }
    };

    const openReportModal = (type: 'Problem' | 'Solution', targetId: number) => {
        setReportTarget({ type, id: targetId });
        setIsReportModalOpen(true);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('tr-TR', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    // Sayısal URL'ler artık geçersiz — sadece publicId (opak string) kabul edilir
    if (id && /^\d+$/.test(id)) return <Navigate to="/404" replace />;

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Yükleniyor...</div>;
    if (!problem) return <div className="min-h-screen flex items-center justify-center font-bold text-red-500">Sorun bulunamadı veya silinmiş.</div>;

    // YENİ EKLENEN AKILLI KONTROL: Çözümler içinde statüsü 1 (Onaylı) olan var mı?
    const isProblemResolved = solutions.some((sol: any) => sol.expertApprovalStatus === 1);

    const hasCoords = problem.latitude !== undefined && problem.latitude !== null && problem.longitude !== undefined && problem.longitude !== null;
    const googleMapsUrl = hasCoords
        ? `https://www.google.com/maps?q=${problem.latitude},${problem.longitude}`
        : (problem.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(problem.address)}` : '');

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Navbar />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

                {/* ÜST KISIM: SORUN KARTI */}
                <div className="bg-white shadow-sm border border-gray-100 rounded-3xl overflow-hidden mb-8 relative">

                    {/* Uzman Tarafından Çözüldüyse Üstte İnce Bir Yeşil Çizgi Göster */}
                    {isProblemResolved && (
                        <div className="h-2 w-full bg-green-500"></div>
                    )}

                    {problem.imageUrls && problem.imageUrls.length > 0 && (
                        <div className="flex overflow-x-auto gap-4 p-4 bg-gray-50 border-b custom-scrollbar">
                            {problem.imageUrls.map((url, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => openLightbox(problem.imageUrls!.map(u => `/uploads/problems/${u}`), idx)}
                                    className="h-64 w-96 flex-shrink-0 rounded-2xl overflow-hidden border bg-white group relative shadow-sm cursor-zoom-in"
                                >
                                     <img src={`/uploads/problems/${url}`} alt={`${problem.title} ${idx + 1}`} className="w-full h-full object-cover transition duration-300 group-hover:scale-105" />
                                </div>
                            ))}
                        </div>
                    )}

                    {problem.videoUrls && problem.videoUrls.length > 0 && (
                        <div className="flex overflow-x-auto gap-4 p-4 bg-gray-900 border-b custom-scrollbar">
                            {problem.videoUrls.map((url, idx) => (
                                <video
                                    key={idx}
                                    src={url}
                                    controls
                                    className="h-56 w-80 flex-shrink-0 rounded-xl bg-black shadow-lg"
                                    preload="metadata"
                                />
                            ))}
                        </div>
                    )}

                    <div className="p-8">
                        {/* Başlık ve Rozetler */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg">
                                {(() => {
                                    if (problem.customHierarchyId != null && institution?.customHierarchyJson) {
                                        try {
                                            const items = JSON.parse(institution.customHierarchyJson) as string[];
                                            return items[problem.customHierarchyId] || problem.cityName;
                                        } catch { return problem.cityName; }
                                    }
                                    return problem.cityName;
                                })()}
                            </span>

                            {/* Sorun çözüldüyse Rozeti Göster */}
                            {isProblemResolved && (
                                <span className="bg-green-100 text-green-700 border border-green-200 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    Çözüldü
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {problem?.topics && problem.topics.map(t => (
                                <span key={t.id} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                                    {t.name}
                                    {enableFollowSystem && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleToggleTopicFollow(t.id); }}
                                            title={followedTopicIds.includes(t.id) ? "Kategori takibini bırak" : "Bu kategoriyi takip et"}
                                            className="ml-1 hover:scale-110 transition-transform focus:outline-none"
                                        >
                                            {followedTopicIds.includes(t.id) ? '🔔' : '🔕'}
                                        </button>
                                    )}
                                </span>
                            ))}
                        </div>

                        {(problem.address || hasCoords) && enableMapLocation && (
                            <div className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div>
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Konum</div>
                                        {problem.address && (
                                            <div className="mt-1 text-sm font-bold text-slate-800">{problem.address}</div>
                                        )}
                                        {hasCoords && (
                                            <div className="mt-1 text-xs text-slate-600">
                                                <span className="font-bold">Enlem:</span> {Number(problem.latitude).toFixed(6)}{' '}
                                                <span className="font-bold ml-2">Boylam:</span> {Number(problem.longitude).toFixed(6)}
                                            </div>
                                        )}
                                    </div>

                                    {googleMapsUrl && (
                                        <a
                                            href={googleMapsUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                                        >
                                            🗺️ Google Maps’te Aç
                                        </a>
                                    )}
                                </div>

                                {hasCoords && (
                                    <div className="mt-4 h-56 w-full rounded-2xl overflow-hidden border border-slate-200 bg-white">
                                        <MapContainer
                                            center={[Number(problem.latitude), Number(problem.longitude)] as LatLngExpression}
                                            zoom={15}
                                            scrollWheelZoom={false}
                                            className="h-full w-full"
                                        >
                                            <TileLayer
                                                attribution='&copy; OpenStreetMap katkıda bulunanlar'
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />
                                            <Marker position={[Number(problem.latitude), Number(problem.longitude)] as LatLngExpression} />
                                        </MapContainer>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* DÜZENLEME FORMU AÇIKSA */}
                        {isEditingProblem ? (
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6 animate-fade-in-down space-y-4">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2 border-b pb-2">Sorunu Düzenle</h3>

                                <input
                                    type="text"
                                    className="w-full border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none p-3 rounded-xl font-bold bg-white shadow-sm"
                                    value={editProblemData.title}
                                    onChange={e => setEditProblemData({ ...editProblemData, title: e.target.value })}
                                />

                                <textarea
                                    className="w-full border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none p-3 rounded-xl text-sm bg-white shadow-sm"
                                    rows={5}
                                    value={editProblemData.description}
                                    onChange={e => setEditProblemData({ ...editProblemData, description: e.target.value })}
                                ></textarea>

                                {/* ÇOKLU KATEGORİ (TAG) SEÇİCİ */}
                                <div className="pt-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Kategoriler</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {topics.map(topic => {
                                            const isSelected = editSelectedTopics.includes(topic.id);
                                            return (
                                                <button
                                                    key={topic.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setEditSelectedTopics(prev =>
                                                            prev.includes(topic.id) ? prev.filter(id => id !== topic.id) : [...prev, topic.id]
                                                        );
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 shadow-sm ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'
                                                        }`}
                                                >
                                                    {topic.name}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* ŞEHİR (DROPDOWN) */}
                                <div className="pt-2 border-t border-slate-200 mt-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{terminology.cityLabel}</label>
                                    {institution?.customHierarchyJson ? (
                                        <select
                                            value={editCustomHierarchyId ?? ''}
                                            onChange={(e) => setEditCustomHierarchyId(e.target.value === '' ? null : Number(e.target.value))}
                                            className="w-full border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none p-3 rounded-xl font-bold bg-white shadow-sm"
                                        >
                                            <option value="">{terminology.cityLabel} Seçiniz</option>
                                            {(() => {
                                                try {
                                                    const items = JSON.parse(institution.customHierarchyJson) as string[];
                                                    return items.map((item, idx) => (
                                                        <option key={idx} value={idx}>{item}</option>
                                                    ));
                                                } catch { return null; }
                                            })()}
                                        </select>
                                    ) : (
                                        <select
                                            value={editCityCode}
                                            onChange={(e) => {
                                                setEditCityCode(Number(e.target.value));
                                                setEditAutoCityName(null);
                                                setEditClearLocation(false);
                                            }}
                                            disabled={editCityLocked || editIsResolvingCity}
                                            className="w-full border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none p-3 rounded-xl font-bold bg-white shadow-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                                        >
                                            <option value={0}>Şehir seçin</option>
                                            {cities.map((c: any) => (
                                                <option key={c.value} value={c.value}>{c.text}</option>
                                            ))}
                                        </select>
                                    )}
                                    {!institution?.customHierarchyJson && (
                                        <div className="text-[11px] font-bold text-slate-500 mt-2">
                                            {editCityLocked ? 'Konum seçili olduğu için şehir kilitlidir.' : 'Konum seçmezseniz şehir bilgisini buradan değiştirebilirsiniz.'}
                                        </div>
                                    )}
                                </div>

                                {enableMapLocation && (
                                    <div className="pt-2 border-t border-slate-200 mt-2">
                                        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Konum</label>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleEditGetMyLocation}
                                                    disabled={editIsLocating}
                                                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                                                >
                                                    {editIsLocating ? 'Konum alınıyor…' : 'Konumumu Al'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditClearLocation(true);
                                                        setEditLatitude(null);
                                                        setEditLongitude(null);
                                                        setEditAddress('');
                                                        setEditAutoCityName(null);
                                                        setEditLocationError('');
                                                    }}
                                                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                                                >
                                                    Konumu Temizle
                                                </button>
                                            </div>
                                        </div>

                                        <div className="text-[11px] font-bold text-slate-600 mb-2 pl-1">
                                            {editClearLocation ? (
                                                <span>Konum kaldırılacak.</span>
                                            ) : editIsResolvingCity ? (
                                                <span>Şehir tespit ediliyor…</span>
                                            ) : editAutoCityName ? (
                                                <span>Şehir (otomatik): <span className="text-slate-900">{editAutoCityName}</span></span>
                                            ) : (
                                                <span>Pin bırakır veya konum alırsanız şehir otomatik seçilir.</span>
                                            )}
                                        </div>

                                        {editLocationError && (
                                            <div className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 mb-2">
                                                {editLocationError}
                                            </div>
                                        )}

                                        <input
                                            type="text"
                                            placeholder="Adres (opsiyonel)"
                                            className="w-full border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none p-3 rounded-xl text-sm bg-white shadow-sm"
                                            value={editAddress}
                                            onChange={e => {
                                                setEditAddress(e.target.value);
                                                setEditClearLocation(false);
                                            }}
                                        />

                                        <div className="mt-3 h-56 w-full rounded-2xl overflow-hidden border border-slate-200 bg-white">
                                            <MapContainer
                                                center={editMapCenter}
                                                zoom={editMapZoom}
                                                scrollWheelZoom={false}
                                                className="h-full w-full"
                                            >
                                                <TileLayer
                                                    attribution='&copy; OpenStreetMap katkıda bulunanlar'
                                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                />
                                                <EditLocationClickHandler />
                                                {!editClearLocation && editLatitude !== null && editLongitude !== null && (
                                                    <Marker position={[editLatitude, editLongitude] as LatLngExpression} />
                                                )}
                                            </MapContainer>
                                        </div>
                                    </div>
                                )}

                                {/* RESİMLER */}
                                <div className="pt-2 border-t border-slate-200 mt-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Resimler (Maks: {maxProblemImages})</label>
                                    
                                    {/* Mevcut Resimler */}
                                    {editExistingImageUrls.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {editExistingImageUrls.map((url, idx) => (
                                                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border shadow-sm group">
                                                    <img src={`/uploads/problems/${url}`} alt="Mevcut" className="w-full h-full object-cover" />
                                                    <button 
                                                        onClick={() => setEditExistingImageUrls(prev => prev.filter((_, i) => i !== idx))}
                                                        className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg opacity-0 group-hover:opacity-100 transition"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="w-full text-sm"
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files || []);
                                            if (files.length + editExistingImageUrls.length > maxProblemImages) {
                                                alert(`En fazla ${maxProblemImages} görsel seçebilirsiniz.`);
                                                e.target.value = '';
                                                return;
                                            }
                                            setEditImages(files);
                                        }}
                                    />
                                    <div className="text-[11px] font-bold text-slate-500 mt-1">
                                        {editImages.length > 0 ? `${editImages.length} yeni görsel seçildi.` : 'Yeni resim seçmezseniz mevcutlar korunur.'}
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end pt-4 border-t mt-4">
                                    <button onClick={() => setIsEditingProblem(false)} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-sm hover:bg-slate-50">İptal</button>
                                    <button onClick={handleUpdateProblem} className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-indigo-700">Kaydet</button>
                                </div>
                            </div>
                        ) : (
                            // NORMAL GÖSTERİM (Form kapalıyken eski başlık vs çıkacak)
                            <div>
                                <div className="flex flex-wrap items-center gap-4 mb-4">
                                    <h1 className="text-3xl font-black text-gray-900">{problem.title}</h1>
                                    {enableFollowSystem && (
                                    <button
                                        onClick={handleToggleFollow}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border shadow-sm ${isFollowing ? 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}`}
                                    >
                                        {isFollowing ? '🔕 Takipten Çık' : '🔔 Takip Et'}
                                    </button>
                                    )}
                                    {enableUpvote && (
                                    <button
                                        onClick={handleToggleUpvote}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border shadow-sm ${
                                            isUpvoted
                                            ? 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200'
                                            : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                                        }`}
                                    >
                                        ✋ Ben de Yaşıyorum ({problem.upvoteCount || 0})
                                    </button>
                                    )}
                                    {enableSharing && (
                                        <div className="ml-2">
                                            <SocialShare
                                                url={`/problem/${problem.publicId || problem.id}`}
                                                title={problem.title}
                                                description={problem.description}
                                            />
                                        </div>
                                    )}
                                </div>
                                <MentionText 
                                    text={problem.description} 
                                    className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap mb-8 block"
                                />
                            </div>
                        )}

                        {/* Alt Bilgi & Aksiyonlar */}
                        <div className="flex flex-wrap items-center justify-between border-t border-gray-100 pt-6">
                            <div className="flex items-center gap-3">
                                <Link to={`/user/${problem.senderUsername}`} className="h-12 w-12 rounded-full overflow-hidden bg-gradient-to-tr from-blue-100 to-indigo-100 flex items-center justify-center shadow-inner shrink-0 border border-gray-100">
                                    {problem.senderImageUrl ? (
                                        <img src={getProfileImageUrl(problem.senderImageUrl)} alt={problem.senderUsername} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-lg font-black text-blue-800">{problem.senderUsername[0].toUpperCase()}</span>
                                    )}
                                </Link>
                                <div>
                                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">Gönderen</div>
                                    <Link to={`/user/${problem.senderUsername}`} className="font-bold text-gray-900 text-sm hover:text-blue-600 hover:underline">@{problem.senderUsername}</Link>
                                    <SenderBadges
                                        isExpert={problem.senderIsExpert}
                                        isOfficial={problem.senderIsOfficial}
                                        titles={problem.senderTitles}
                                        size="sm"
                                    />
                                </div>
                                <div className="ml-4 pl-4 border-l border-gray-200">
                                    <div className="text-xs text-gray-400 font-medium">{formatDate(problem.sendDate)}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-4 sm:mt-0">
                                {currentUserId === problem.senderId && (
                                    <div className="flex justify-end mb-4 gap-2">
                                        {canUpdateOwnProblem && (
                                        <button
                                            onClick={() => {
                                                setIsEditingProblem(true);
                                                setEditProblemData({ title: problem.title, description: problem.description });
                                                setEditSelectedTopics(problem.topics ? problem.topics.map(t => t.id) : []);

                                                setEditAddress(problem.address || '');
                                                setEditLatitude((problem as any).latitude ?? null);
                                                setEditLongitude((problem as any).longitude ?? null);
                                                setEditCityCode((problem as any).cityCode ?? 0);
                                                setEditCustomHierarchyId(problem.customHierarchyId ?? null);
                                                setEditAutoCityName(null);
                                                setEditClearLocation(false);
                                                setEditExistingImageUrls(problem.imageUrls || []);
                                                setEditImages([]);
                                                setEditLocationError('');
                                            }}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 font-bold text-xs rounded-lg shadow-sm hover:bg-yellow-100 transition"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            Sorunu Düzenle
                                        </button>
                                        )}
                                        {canDeleteOwnProblem && (
                                        <button onClick={handleDeleteProblem} className="text-xs font-bold text-red-500 hover:text-white bg-red-50 hover:bg-red-500 border border-red-200 px-4 py-2 rounded-xl transition flex items-center gap-1.5">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            Sorunumu Sil
                                        </button>
                                        )}
                                    </div>
                                )}
                                {/* Moderasyon butonları — sahip olmayanlara göster */}
                                {currentUserId !== problem.senderId && currentUserId !== 0 && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {canModResolveProblem && !isProblemResolved && (
                                            <button
                                                onClick={async () => {
                                                    if (!window.confirm('Sorunu çözüldü olarak işaretlemek istediğinize emin misiniz?')) return;
                                                    try {
                                                        await (problemService as any).setResolved?.(problem.id);
                                                        await loadData(problem.id);
                                                    } catch { alert('İşlem gerçekleştirilemedi.'); }
                                                }}
                                                className="text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-4 py-2 rounded-xl transition flex items-center gap-1.5"
                                            >
                                                ✅ Çözüldü İşaretle
                                            </button>
                                        )}
                                        {canModHighlight && (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await (problemService as any).setHighlight?.(problem.id);
                                                        await loadData(problem.id);
                                                    } catch { alert('İşlem gerçekleştirilemedi.'); }
                                                }}
                                                className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2 rounded-xl transition flex items-center gap-1.5"
                                            >
                                                ⭐ Öne Çıkar
                                            </button>
                                        )}
                                        {!problem.isClosed && canCloseProblem && (
                                            <button
                                                onClick={async () => {
                                                    const reason = window.prompt('Kapatma sebebi (opsiyonel):');
                                                    if (reason === null) return;
                                                    try {
                                                        await problemService.closeProblem(problem.id, reason || undefined);
                                                        await loadData(problem.id);
                                                    } catch { alert('İşlem gerçekleştirilemedi.'); }
                                                }}
                                                className="text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-4 py-2 rounded-xl transition flex items-center gap-1.5"
                                            >
                                                🔒 Kapat
                                            </button>
                                        )}
                                        {problem.isClosed && canReopenProblem && (
                                            <button
                                                onClick={async () => {
                                                    if (!window.confirm('Sorunu yeniden açmak istediğinize emin misiniz?')) return;
                                                    try {
                                                        await problemService.reopenProblem(problem.id);
                                                        await loadData(problem.id);
                                                    } catch { alert('İşlem gerçekleştirilemedi.'); }
                                                }}
                                                className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-xl transition flex items-center gap-1.5"
                                            >
                                                🔓 Yeniden Aç
                                            </button>
                                        )}
                                        {canHideProblem && (
                                            <button
                                                onClick={async () => {
                                                    const msg = problem.isHidden
                                                        ? 'Sorunu herkese görünür yapmak istediğinize emin misiniz?'
                                                        : 'Sorunu gizlemek istediğinize emin misiniz?';
                                                    if (!window.confirm(msg)) return;
                                                    try {
                                                        await problemService.toggleHide(problem.id);
                                                        await loadData(problem.id);
                                                    } catch { alert('İşlem gerçekleştirilemedi.'); }
                                                }}
                                                className={`text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 border ${problem.isHidden ? 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300' : 'text-slate-600 bg-slate-50 hover:bg-slate-100 border-slate-200'}`}
                                            >
                                                {problem.isHidden ? '👁️ Göster' : '🚫 Gizle'}
                                            </button>
                                        )}
                                        {canModDeleteProblem && (
                                            <button onClick={handleDeleteProblem} className="text-xs font-bold text-red-500 hover:text-white bg-red-50 hover:bg-red-500 border border-red-200 px-4 py-2 rounded-xl transition flex items-center gap-1.5">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                Mod: Sil
                                            </button>
                                        )}
                                    </div>
                                )}
                                {enableReports && currentUserId !== problem.senderId && currentUserId !== 0 && (
                                    <button onClick={() => openReportModal('Problem', problem.id)} className="text-xs font-bold text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-100 px-4 py-2 rounded-xl transition flex items-center gap-1.5">
                                        🚩 Şikayet Et
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* KAPALI SORUN BANNERI */}
                {problem.isClosed && (
                    <div className="mb-6 bg-orange-50 border border-orange-200 rounded-2xl p-5 shadow-sm flex items-start gap-3">
                        <span className="text-2xl mt-0.5">🔒</span>
                        <div>
                            <p className="font-black text-orange-800 text-sm">Bu sorun kapatılmıştır</p>
                            {problem.closeReason && (
                                <p className="text-orange-700 text-sm mt-1">{problem.closeReason}</p>
                            )}
                            {problem.closedAt && (
                                <p className="text-orange-500 text-xs mt-1">
                                    {new Date(problem.closedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            )}
                            <p className="text-orange-600 text-xs mt-1.5">Yeni çözüm ve yorum eklenemez.</p>
                        </div>
                    </div>
                )}

                {/* GİZLİ SORUN BANNERI (sadece moderatöre) */}
                {problem.isHidden && canHideProblem && (
                    <div className="mb-6 bg-slate-100 border border-slate-300 rounded-2xl p-4 flex items-center gap-3">
                        <span className="text-xl">🚫</span>
                        <p className="text-slate-600 font-bold text-sm">Bu sorun herkese gizlenmiştir. Sadece moderatörler görebilir.</p>
                    </div>
                )}

                {/* RESMİ YANITLAR */}
                {problem.officialResponses && problem.officialResponses.length > 0 && (
                    <div className="mb-8 space-y-4">
                        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <span className="text-blue-600">🏛️</span> Kurumsal Yanıtlar
                        </h2>
                        {problem.officialResponses.map(resp => {
                            const statusConfig: Record<string, { label: string; color: string }> = {
                                acknowledged: { label: 'İncelendi',    color: 'bg-blue-100 text-blue-700 border-blue-200' },
                                in_progress:  { label: 'İşlemde',      color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                                info:         { label: 'Bilgi',         color: 'bg-gray-100 text-gray-600 border-gray-200' },
                                closed:       { label: 'Tamamlandı',   color: 'bg-green-100 text-green-700 border-green-200' },
                            };
                            const cfg = statusConfig[resp.status] ?? statusConfig.info;
                            return (
                                <div key={resp.id} className="bg-blue-50/60 border border-blue-200 rounded-2xl p-5 shadow-sm">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Link to={`/user/${resp.authorUsername}`} className="h-9 w-9 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200">
                                                {resp.authorImageUrl ? (
                                                    <img src={getProfileImageUrl(resp.authorImageUrl)} alt={resp.authorUsername} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-black text-blue-800">{resp.authorUsername[0].toUpperCase()}</span>
                                                )}
                                            </Link>
                                            <div>
                                                <Link to={`/user/${resp.authorUsername}`} className="font-bold text-gray-900 text-sm hover:underline">@{resp.authorUsername}</Link>
                                                <SenderBadges titles={resp.authorTitles} size="xs" />
                                                <div className="text-[10px] text-gray-400 mt-0.5">{new Date(resp.createdAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${cfg.color}`}>{cfg.label}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{resp.body}</p>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Etkileşim İstatistikleri Paneli — sadece en az bir bölüm kapalı değilse göster */}
                {problem && (() => {
                    const showViewers     = problem.viewersVisibility     !== 'closed';
                    const showUpvoters    = enableUpvote && problem.upvotersVisibility !== 'closed';
                    const showParticipants = problem.participantsVisibility !== 'closed';
                    if (!showViewers && !showUpvoters && !showParticipants) return null;
                    return (
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-6">
                            <div className="flex flex-wrap gap-3 mb-3">
                                {showViewers && (
                                    <button
                                        onClick={() => loadEngagement('viewers', problem.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition ${engagementSection === 'viewers' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        👁️ {problem.viewCount ?? 0} Görüntülenme
                                    </button>
                                )}
                                {showUpvoters && (
                                    <button
                                        onClick={() => loadEngagement('upvoters', problem.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition ${engagementSection === 'upvoters' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        ✋ {problem.upvoteCount ?? 0} Destek
                                    </button>
                                )}
                                {showParticipants && (
                                    <button
                                        onClick={() => loadEngagement('participants', problem.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition ${engagementSection === 'participants' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        👥 Katılımcılar
                                    </button>
                                )}
                            </div>

                            {engagementSection && (
                                <div className="border-t border-gray-100 pt-4">
                                    {engagementLoading && <p className="text-xs text-gray-400">Yükleniyor…</p>}
                                    {engagementDenied && (
                                        <p className="text-xs text-gray-400 flex items-center gap-1.5">🔒 Bu liste gizlidir.</p>
                                    )}
                                    {!engagementLoading && !engagementDenied && engagementSection === 'viewers' && viewers && (
                                        <EngagementUserList
                                            items={viewers.filter(v => v.userId).map(v => ({ userId: v.userId!, username: v.username ?? 'Anonim', profileImageUrl: v.profileImageUrl, sub: new Date(v.viewedAt).toLocaleDateString('tr-TR') }))}
                                            emptyText="Henüz görüntüleyen yok."
                                        />
                                    )}
                                    {!engagementLoading && !engagementDenied && engagementSection === 'upvoters' && upvoters && (
                                        <EngagementUserList
                                            items={upvoters.map(u => ({ userId: u.userId, username: u.username, profileImageUrl: u.profileImageUrl, sub: new Date(u.createdAt).toLocaleDateString('tr-TR') }))}
                                            emptyText="Henüz destek veren yok."
                                        />
                                    )}
                                    {!engagementLoading && !engagementDenied && engagementSection === 'participants' && participants && (
                                        <EngagementUserList
                                            items={participants.map(p => ({ userId: p.userId, username: p.username, profileImageUrl: p.profileImageUrl, sub: roleLabel(p.role) }))}
                                            emptyText="Henüz katılımcı yok."
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* ALT KISIM: ÇÖZÜMLER VE FORM */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Sol Taraf: Çözüm Listesi */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-gray-900">Çözümler <span className="text-gray-400 text-lg">({solutions.length})</span></h2>
                        </div>

                        {solutions.length === 0 ? (
                            <div className="bg-white p-8 rounded-3xl border border-gray-100 text-center shadow-sm">
                                <div className="text-4xl mb-3">💬</div>
                                <h3 className="text-lg font-bold text-gray-800">İlk çözen sen ol!</h3>
                                <p className="text-gray-500 text-sm">Bu sorunun henüz bir çözümü yok. Eğer fikrin varsa hemen yandaki formdan paylaşabilirsin.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {[...solutions]
                                    .sort((a: any, b: any) => {
                                        // 1. Kural: Uzman çözümleri (Onaylı) en üste
                                        if (a.senderIsExpert && a.expertApprovalStatus === 1) return -1;
                                        if (b.senderIsExpert && b.expertApprovalStatus === 1) return 1;
                                        // 2. Kural: Uzman çözümleri (Bekleyenler) ikinci sıraya
                                        if (a.senderIsExpert && a.expertApprovalStatus === 0) return -1;
                                        if (b.senderIsExpert && b.expertApprovalStatus === 0) return 1;
                                        // 3. Kural: En çok oy alanlar (voteCount) sıralansın
                                        const voteA = a.voteCount || 0;
                                        const voteB = b.voteCount || 0;
                                        return voteB - voteA;
                                    })
                                    .map((sol: any) => {

                                        const isExpert = sol.senderIsExpert;
                                        const status = sol.expertApprovalStatus; // 0: Bekliyor, 1: Onaylı, 2: Red

                                        let borderColor = "border-blue-100";
                                        let badge = null;
                                        let bgColor = "bg-white";

                                        if (isExpert) {
                                            if (status === 1) {
                                                borderColor = "border-green-400 ring-4 ring-green-50";
                                                bgColor = "bg-green-50/20";
                                                badge = <span className="bg-green-500 text-white text-[10px] font-black tracking-wider uppercase px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>Uzman Tarafından Onaylandı</span>;
                                            } else if (status === 2) {
                                                borderColor = "border-red-200";
                                                bgColor = "bg-red-50/20";
                                                badge = <span className="bg-red-500 text-white text-[10px] font-black tracking-wider uppercase px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>Uzman Çözümü Reddedildi</span>;
                                            } else {
                                                borderColor = "border-yellow-400";
                                                badge = <span className="bg-yellow-500 text-white text-[10px] font-black tracking-wider uppercase px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Uzman Çözümü (Onay Bekliyor)</span>;
                                            }
                                        }

                                        return (
                                            <div
                                                key={sol.id}
                                                ref={el => { solutionRefs.current[sol.id] = el; }}
                                                className={`${bgColor} p-6 rounded-3xl shadow-sm border-l-4 border-y border-r ${borderColor} transition-all relative overflow-hidden ${focusedSolutionId === sol.id ? 'ring-4 ring-blue-400 ring-offset-2 shadow-blue-200 shadow-lg' : ''}`}
                                            >

                                                {/* SAĞ ÜST ROZET */}
                                                <div className="absolute top-5 right-5 z-10">
                                                    {badge}
                                                </div>

                                                <div className='flex mt-2'>
                                                    {/* OYLAMA VE KAYDETME KISMI (SOL TARAFTA) */}
                                                    {(enableUpvote || enableSavedSolutions || enableSharing) && (
                                                    <div className="flex flex-col items-center justify-start mr-5 space-y-2 bg-gray-50/50 p-2 rounded-2xl h-fit border border-gray-100/50 shadow-sm">
                                                        {enableSharing && (
                                                            <SocialShare 
                                                                variant="dropdown"
                                                                url={`/problem/${problem.publicId || problem.id}?solution=${sol.publicId || sol.id}`}
                                                                title={`${problem.title} - ${sol.title}`}
                                                            />
                                                        )}
                                                        {enableUpvote && (
                                                            <>
                                                                <button onClick={() => handleVote(sol.id, true)} className="text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-xl transition p-1.5">
                                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                                                                </button>
                                                                <span className="text-lg font-black text-gray-800 py-0.5">{sol.voteCount || 0}</span>
                                                                <button onClick={() => handleVote(sol.id, false)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition p-1.5">
                                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                                                </button>
                                                            </>
                                                        )}

                                                        {enableSavedSolutions && (
                                                            <button
                                                                onClick={() => handleToggleSave(sol.id)}
                                                                className={`p-2 rounded-xl transition-all duration-200 flex flex-col items-center shadow-sm active:scale-95 ${
                                                                    savedSolutionIds.includes(sol.id) 
                                                                    ? 'text-amber-600 bg-amber-100 border border-amber-200 ring-2 ring-amber-500/20' 
                                                                    : 'text-gray-400 bg-white border border-gray-100 hover:text-amber-500 hover:bg-amber-50 hover:border-amber-100'
                                                                }`}
                                                                title={savedSolutionIds.includes(sol.id) ? "Kaydedilenlerden Çıkar" : "Çözümü Kaydet"}
                                                            >
                                                                {savedSolutionIds.includes(sol.id) ? (
                                                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                    )}
                                                    {/* EĞER DÜZENLE BUTONUNA BASILDIYSA FORM AÇILIR */}
                                                    {editingSolutionId === sol.id ? (
                                                        <div className="space-y-3 animate-fade-in-down bg-slate-50 p-5 rounded-xl border border-indigo-100">
                                                            <input
                                                                type="text"
                                                                className="w-full border border-slate-200 p-3 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white shadow-sm"
                                                                value={editSolutionTitle}
                                                                onChange={e => setEditSolutionTitle(e.target.value)}
                                                                placeholder="Çözüm Başlığı"
                                                            />
                                                            {enableMentions ? (
                                                                <MentionWrapper 
                                                                    value={editSolutionDesc} 
                                                                    onChange={(val) => setEditSolutionDesc(val)}
                                                                    institutionId={problem?.institutionId}
                                                                >
                                                                    <textarea
                                                                        className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm"
                                                                        rows={4}
                                                                        value={editSolutionDesc}
                                                                        onChange={e => setEditSolutionDesc(e.target.value)}
                                                                        placeholder="Çözüm Detayları"
                                                                    ></textarea>
                                                                </MentionWrapper>
                                                            ) : (
                                                                <textarea
                                                                    className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm"
                                                                    rows={4}
                                                                    value={editSolutionDesc}
                                                                    onChange={e => setEditSolutionDesc(e.target.value)}
                                                                    placeholder="Çözüm Detayları"
                                                                ></textarea>
                                                            )}

                                                            {/* Mevcut Resimleri Düzenle */}
                                                            {allowSolutionImage && (
                                                                <div className="mt-3 space-y-3">
                                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mevcut Resimler</label>
                                                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                                                        {editSolutionExistingImageUrls.map((url, idx) => (
                                                                            <div key={idx} className="relative h-20 w-28 rounded-lg overflow-hidden border group shrink-0 shadow-sm">
                                                                                <img src={`/uploads/solutions/${url}`} className="w-full h-full object-cover" alt="Eski resim" />
                                                                                <button 
                                                                                    onClick={() => setEditSolutionExistingImageUrls(prev => prev.filter((_, i) => i !== idx))}
                                                                                    className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                                                >
                                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Yeni Resim Ekle (Toplam Maks: {maxSolutionImages})</label>
                                                                    <input 
                                                                        type="file" multiple accept="image/*"
                                                                        onChange={(e) => {
                                                                            const files = Array.from(e.target.files || []);
                                                                            if (files.length + editSolutionExistingImageUrls.length > maxSolutionImages) {
                                                                                alert(`Toplamda en fazla ${maxSolutionImages} görsel olabilir.`);
                                                                                e.target.value = '';
                                                                                return;
                                                                            }
                                                                            setEditSolutionImages(files);
                                                                        }}
                                                                        className="w-full text-xs text-indigo-600 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                                                    />
                                                                    {editSolutionImages.length > 0 && (
                                                                        <div className="flex gap-2 overflow-x-auto">
                                                                            {editSolutionImages.map((img, idx) => (
                                                                                <div key={idx} className="relative h-20 w-28 rounded-lg overflow-hidden border shrink-0 shadow-sm">
                                                                                    <img src={URL.createObjectURL(img)} className="w-full h-full object-cover" alt="Yeni resim" />
                                                                                    <button onClick={() => setEditSolutionImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-md shadow-sm"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <div className="flex justify-end gap-2 pt-4">
                                                                <button onClick={() => setEditingSolutionId(null)} className="px-4 py-2 bg-white border border-slate-300 text-slate-600 font-bold text-xs rounded-xl shadow-sm hover:bg-slate-50">İptal</button>
                                                                <button onClick={() => handleUpdateSolution(sol)} className="px-6 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-indigo-700 transition">Güncelle</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // NORMAL GÖSTERİM MODU
                                                        <div className="flex-1 pr-0 md:pr-12">
                                                            <h4 className="text-xl font-bold text-gray-900 mb-3">{sol.title}</h4>
                                                            <MentionText 
                                                                text={sol.description} 
                                                                className="text-gray-700 leading-relaxed whitespace-pre-wrap block"
                                                            />

                                                            {/* Çözüm Resimleri */}
                                                            {sol.imageUrls && sol.imageUrls.length > 0 && (
                                                                <div className="mt-4 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                                                    {sol.imageUrls.map((url: string, idx: number) => (
                                                                        <div
                                                                            key={idx}
                                                                            onClick={() => openLightbox(sol.imageUrls!.map((u: string) => `/uploads/solutions/${u}`), idx)}
                                                                            className="h-32 w-44 sm:h-40 sm:w-60 flex-shrink-0 rounded-xl overflow-hidden border shadow-sm group cursor-zoom-in"
                                                                        >
                                                                            <img src={`/uploads/solutions/${url}`} alt={`Çözüm ${idx + 1}`} className="w-full h-full object-cover transition hover:scale-105" />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Çözüm Videoları */}
                                                            {sol.videoUrls && sol.videoUrls.length > 0 && (
                                                                <div className="mt-3 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                                                    {sol.videoUrls.map((url: string, idx: number) => (
                                                                        <video
                                                                            key={idx}
                                                                            src={url}
                                                                            controls
                                                                            className="h-36 w-56 flex-shrink-0 rounded-lg bg-black shadow-sm"
                                                                            preload="metadata"
                                                                        />
                                                                    ))}
                                                                </div>
                                                            )}

                                                            <div className="mt-5 flex items-center gap-3">
                                                                <Link to={`/user/${sol.senderUsername}`} className="h-10 w-10 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
                                                                    {sol.senderImageUrl ? (
                                                                        <img src={getProfileImageUrl(sol.senderImageUrl)} alt={sol.senderUsername} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <span className="text-sm font-black text-blue-800">{sol.senderUsername[0].toUpperCase()}</span>
                                                                    )}
                                                                </Link>
                                                                <div>
                                                                    <Link to={`/user/${sol.senderUsername}`} className="font-bold text-gray-900 text-sm hover:underline">@{sol.senderUsername}</Link>
                                                                    <SenderBadges
                                                                        isExpert={sol.senderIsExpert}
                                                                        isOfficial={sol.senderIsOfficial}
                                                                        titles={sol.senderTitles}
                                                                    />
                                                                    <div className="text-[11px] text-gray-500">{formatDate(sol.sendDate)}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* İÇERİK KISMI */}

                                                </div>

                                                {/* Çözüm oylayanlar — solutionVotersVisibility 'closed' ise tamamen gizle */}
                                                {enableUpvote && problem?.solutionVotersVisibility !== 'closed' && (
                                                <div className="mt-4">
                                                    <button
                                                        onClick={() => loadVoters(sol.id)}
                                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${votersSolutionId === sol.id ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                                    >
                                                        📊 Oylayanlar ({sol.voteCount || 0})
                                                    </button>
                                                    {votersSolutionId === sol.id && (
                                                        <div className="mt-3">
                                                            {votersLoading && <p className="text-xs text-gray-400">Yükleniyor…</p>}
                                                            {votersDenied && <p className="text-xs text-gray-400 flex items-center gap-1">🔒 Bu liste gizlidir.</p>}
                                                            {!votersLoading && !votersDenied && voters && (
                                                                <EngagementUserList
                                                                    items={voters.map(v => ({ userId: v.userId, username: v.username, profileImageUrl: v.profileImageUrl, sub: v.isUpvote ? '👍 Olumlu' : '👎 Olumsuz' }))}
                                                                    emptyText="Henüz oy yok."
                                                                />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                )}

                                                {enableComments && (
                                                <div className="mt-6">
                                                    <CommentSection solutionId={sol.id} institutionId={problem?.institutionId} isClosed={problem?.isClosed} />
                                                </div>
                                                )}

                                                <div className="flex justify-end mt-4 pt-4 border-t border-gray-100/60 gap-2">
                                                    {currentUserId === sol.senderId && (
                                                        <div className="flex gap-2">
                                                            {canUpdateOwnSolution && (
                                                            <button
                                                                onClick={() => {
                                                                    setEditingSolutionId(sol.id);
                                                                    setEditSolutionTitle(sol.title);
                                                                    setEditSolutionDesc(sol.description);
                                                                    setEditSolutionExistingImageUrls(sol.imageUrls || []);
                                                                    setEditSolutionImages([]);
                                                                }}
                                                                className="px-3 py-1.5 bg-yellow-50 text-yellow-700 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-yellow-200 hover:bg-yellow-100 transition shadow-sm"
                                                            >
                                                                Düzenle
                                                            </button>
                                                            )}
                                                            {canDeleteOwnSolution && (
                                                            <button onClick={() => handleDeleteSolution(sol.id)} className="text-[10px] text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition">
                                                                🗑️ Çözümü Sil
                                                            </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {/* Moderatör çözüm silme butonu */}
                                                    {canModDeleteSolution && currentUserId !== sol.senderId && (
                                                        <button onClick={() => handleDeleteSolution(sol.id)} className="text-[10px] text-red-500 hover:text-white bg-red-50 hover:bg-red-500 border border-red-100 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition">
                                                            🛡️ Mod: Sil
                                                        </button>
                                                    )}
                                                    {enableReports && currentUserId !== sol.senderId && currentUserId !== 0 && (
                                                        <button onClick={() => openReportModal('Solution', sol.id)} className="text-[10px] text-red-500 hover:text-white bg-red-50 hover:bg-red-500 border border-red-100 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition">
                                                            🚩 Şikayet Et
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        )}
                    </div>

                    {/* Sağ Taraf: Çözüm Ekleme Formu */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-24">
                            <h3 className="text-xl font-black text-gray-900 mb-2">Çözümün var mı?</h3>
                            <p className="text-sm text-gray-500 mb-6">Diğer kullanıcılara yardımcı olmak için fikrini veya tecrübeni paylaş.</p>

                            {problem.isClosed ? (
                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                                    <p className="text-orange-700 font-bold text-sm">🔒 Bu sorun kapatılmıştır.</p>
                                    <p className="text-orange-600 text-xs mt-1">Yeni çözüm eklenemiyor.</p>
                                </div>
                            ) : currentUserId !== 0 ? (
                                <form onSubmit={handleSolutionSubmit}>
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Çözüm Başlığı</label>
                                        <input
                                            type="text" required
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                                            placeholder="Örn: Bu adımları izleyerek çözdüm"
                                            value={solutionForm.title}
                                            onChange={(e) => setSolutionForm({ ...solutionForm, title: e.target.value })}
                                        />
                                    </div>
                                    <div className="mb-6">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Detaylı Açıklama</label>
                                        {enableMentions ? (
                                            <MentionWrapper 
                                                value={solutionForm.description} 
                                                onChange={(val) => setSolutionForm({ ...solutionForm, description: val })}
                                                institutionId={problem?.institutionId}
                                            >
                                                <textarea
                                                    required rows={5}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
                                                    placeholder="Ayrıntılarıyla anlat..."
                                                    value={solutionForm.description}
                                                    onChange={(e) => setSolutionForm({ ...solutionForm, description: e.target.value })}
                                                />
                                            </MentionWrapper>
                                        ) : (
                                            <textarea
                                                required rows={5}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
                                                placeholder="Ayrıntılarıyla anlat..."
                                                value={solutionForm.description}
                                                onChange={(e) => setSolutionForm({ ...solutionForm, description: e.target.value })}
                                            />
                                        )}
                                    </div>

                                    {allowSolutionImage && (
                                        <div className="mb-6">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Resimler (Maks: {maxSolutionImages})</label>
                                            <input 
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const files = Array.from(e.target.files || []);
                                                    if (files.length > maxSolutionImages) {
                                                        alert(`En fazla ${maxSolutionImages} görsel seçebilirsiniz.`);
                                                        e.target.value = '';
                                                        return;
                                                    }
                                                    setSolutionImages(files);
                                                }}
                                                className="w-full text-xs"
                                            />
                                            {solutionImages.length > 0 && (
                                                <div className="mt-2 text-xs font-bold text-blue-600">
                                                    {solutionImages.length} görsel seçildi.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {submitMessage.text && (
                                        <div className={`mb-4 text-sm font-bold p-3 rounded-xl ${submitMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                            {submitMessage.text}
                                        </div>
                                    )}

                                    <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition shadow-lg shadow-gray-200 active:scale-95">
                                        Çözümü Gönder
                                    </button>
                                </form>
                            ) : (
                                <div className="text-center py-6 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-gray-600 text-sm font-medium mb-4">Çözüm yazmak için giriş yapmalısın.</p>
                                    <Link to="/login" className="inline-block bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-blue-700 transition">
                                        Giriş Yap
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </main>

            {/* Şikayet Modalı */}
            {enableReports && reportTarget && (
                <ReportModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    targetType={reportTarget.type}
                    targetId={reportTarget.id}
                />
            )}

            {/* LIGHTBOX (Resim Galerisi) */}
            {lightboxOpen && (
                <div 
                    onClick={() => setLightboxOpen(false)}
                    className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in cursor-zoom-out"
                >
                    {/* Üst Bar */}
                    <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center text-white z-20">
                        <div className="text-sm font-bold bg-white/10 px-4 py-2 rounded-full backdrop-blur-md">
                            {lightboxIndex + 1} / {lightboxImages.length}
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
                            className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-300 group"
                        >
                            <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Ana Resim */}
                    <div className="relative w-full h-full flex items-center justify-center p-4 md:p-12" onClick={(e) => e.stopPropagation()}>
                        {lightboxImages.length > 1 && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); prevLightboxImage(); }}
                                className="absolute left-4 md:left-8 z-10 p-4 bg-white/5 hover:bg-white/20 text-white rounded-full transition-all group"
                            >
                                <svg className="w-8 h-8 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}

                        <div className="max-w-7xl max-h-full flex items-center justify-center">
                            <img 
                                src={lightboxImages[lightboxIndex]} 
                                alt={`Galeri ${lightboxIndex + 1}`}
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-zoom-in cursor-default"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>

                        {lightboxImages.length > 1 && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); nextLightboxImage(); }}
                                className="absolute right-4 md:right-8 z-10 p-4 bg-white/5 hover:bg-white/20 text-white rounded-full transition-all group"
                            >
                                <svg className="w-8 h-8 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Alt Önizlemeler */}
                    {lightboxImages.length > 1 && (
                        <div className="absolute bottom-10 flex gap-3 px-6 overflow-x-auto max-w-full custom-scrollbar py-2">
                            {lightboxImages.map((img, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => setLightboxIndex(i)}
                                    className={`h-16 w-24 shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-300 ${lightboxIndex === i ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                >
                                    <img src={img} className="w-full h-full object-cover" alt="Önizleme" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProblemDetail;