import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription } from '../../components/ui/dialog';
import { Droplets, Ruler, Image as ImageIcon, ZoomIn, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getPools } from '../../services/adminService';

const ReceptionistPools = () => {
    const { t } = useLanguage();
    const [pools, setPools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [zoomImage, setZoomImage] = useState(null);

    useEffect(() => {
        fetchPools();
    }, []);

    const fetchPools = async () => {
        try {
            const data = await getPools();
            setPools(data);
        } catch (error) {
            console.error(error);
            toast.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {pools.length === 0 ? (
                <Card className="p-12 text-center">
                    <Droplets className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('admin.noPools')}</h3>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pools.map((pool) => (
                        <Card key={pool.id} className={`overflow-hidden border-0 shadow-lg ring-1 ${pool.active ? 'ring-slate-200' : 'ring-slate-200 bg-slate-50'}`} data-testid={`pool-card-${pool.id}`}>
                            {/* Pool Image */}
                            <div className="h-48 w-full bg-slate-100 relative group">
                                {pool.image_url ? (
                                    <>
                                        <img src={pool.image_url} alt={pool.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer" onClick={() => setZoomImage(pool.image_url)}>
                                            <ZoomIn className="w-8 h-8 text-white drop-shadow-lg" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <ImageIcon className="w-12 h-12" />
                                    </div>
                                )}
                                <div className="absolute top-3 right-3">
                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full shadow-sm ${pool.active ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'}`}>
                                        {pool.active ? t('admin.active') : t('admin.inactive')}
                                    </span>
                                </div>
                            </div>

                            <div className="p-5">
                                <h3 className="text-xl font-bold text-slate-900 mb-1">{pool.name}</h3>
                                <div className="flex items-center text-sm text-slate-500 mb-3 space-x-3">
                                    <span className="flex items-center"><Ruler className="w-4 h-4 mr-1" /> {pool.area} {t('admin.metersSquared')}</span>
                                    <span className="flex items-center"><Droplets className="w-4 h-4 mr-1" /> {pool.depth}</span>
                                </div>

                                {pool.description && (
                                    <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                                        {pool.description}
                                    </p>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Image Zoom Modal */}
            <Dialog open={!!zoomImage} onOpenChange={(open) => !open && setZoomImage(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none" aria-describedby="zoom-description">
                    <DialogDescription className="sr-only" id="zoom-description">
                        {t('admin.zoomedView')}
                    </DialogDescription>
                    {zoomImage && (
                        <img src={zoomImage} alt="Zoomed Pool" className="w-full h-auto rounded-lg shadow-2xl" />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ReceptionistPools;
