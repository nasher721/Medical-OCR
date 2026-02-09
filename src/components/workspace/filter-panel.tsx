import { useState, useEffect } from 'react';
import { SearchDocumentsParams } from '@/lib/services/document-service';
import { PresetService } from '@/lib/services/preset-service';
import { FilterPreset } from '@/lib/supabase/types';
import { Filter, Save, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
    orgId: string;
    onApply: (filters: Partial<SearchDocumentsParams>) => void;
    activeFilters: Partial<SearchDocumentsParams>;
    className?: string;
}

export function FilterPanel({ orgId, onApply, activeFilters, className }: FilterPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [localFilters, setLocalFilters] = useState<Partial<SearchDocumentsParams>>(activeFilters);
    const [presets, setPresets] = useState<FilterPreset[]>([]);
    const [presetName, setPresetName] = useState('');
    const [showSave, setShowSave] = useState(false);

    useEffect(() => {
        if (isOpen && orgId) {
            loadPresets();
        }
    }, [isOpen, orgId]);

    // specific effect to update local state if parent changes (e.g. clear all)
    useEffect(() => {
        setLocalFilters(activeFilters);
    }, [activeFilters]);

    const loadPresets = async () => {
        try {
            const data = await PresetService.list(orgId);
            setPresets(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleApply = () => {
        onApply(localFilters);
        setIsOpen(false);
    };

    const handleClear = () => {
        const reset = { org_id: orgId, limit: 50, page: 1 };
        setLocalFilters(reset);
        onApply(reset);
    };

    const handleSavePreset = async () => {
        if (!presetName.trim()) return;
        try {
            await PresetService.create(orgId, presetName, localFilters);
            setPresetName('');
            setShowSave(false);
            loadPresets();
        } catch (e) {
            console.error(e);
        }
    };

    const handleLoadPreset = (preset: FilterPreset) => {
        const filters = preset.filters as Partial<SearchDocumentsParams>;
        setLocalFilters(filters);
        onApply(filters);
    };

    const handleDeletePreset = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await PresetService.delete(id);
            loadPresets();
        } catch (e) {
            console.error(e);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    Object.keys(activeFilters).length > 3 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                )}
            >
                <Filter className="h-4 w-4" />
                Filters
                {Object.keys(activeFilters).length > 3 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                        {Object.keys(activeFilters).length - 3} {/* -3 for org_id, limit, page default */}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className={cn("absolute top-12 left-4 z-50 w-80 rounded-lg border bg-background p-4 shadow-lg", className)}>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Filters</h3>
                <button onClick={() => setIsOpen(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>

            <div className="space-y-4">
                {/* Status */}
                <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
                    <select
                        value={localFilters.status || ''}
                        onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value || undefined })}
                        className="w-full rounded border p-2 text-sm"
                    >
                        <option value="">All Statuses</option>
                        <option value="uploaded">Uploaded</option>
                        <option value="processing">Processing</option>
                        <option value="needs_review">Needs Review</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>

                {/* Doc Type */}
                <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Document Type</label>
                    <input
                        type="text"
                        placeholder="e.g. invoice, receipt"
                        value={localFilters.doc_type?.[0] || ''}
                        onChange={(e) => setLocalFilters({ ...localFilters, doc_type: e.target.value ? [e.target.value] : undefined })}
                        className="w-full rounded border p-2 text-sm"
                    />
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
                        <input
                            type="date"
                            value={localFilters.date_from || ''}
                            onChange={(e) => setLocalFilters({ ...localFilters, date_from: e.target.value })}
                            className="w-full rounded border p-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
                        <input
                            type="date"
                            value={localFilters.date_to || ''}
                            onChange={(e) => setLocalFilters({ ...localFilters, date_to: e.target.value })}
                            className="w-full rounded border p-2 text-sm"
                        />
                    </div>
                </div>

                {/* Presets */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-muted-foreground">Saved Presets</label>
                        <button onClick={() => setShowSave(!showSave)} className="text-xs text-primary hover:underline flex items-center gap-1">
                            <Save className="h-3 w-3" /> Save Current
                        </button>
                    </div>

                    {showSave && (
                        <div className="mb-2 flex gap-2">
                            <input
                                value={presetName}
                                onChange={(e) => setPresetName(e.target.value)}
                                placeholder="Preset name..."
                                className="flex-1 rounded border px-2 py-1 text-sm"
                            />
                            <button onClick={handleSavePreset} disabled={!presetName} className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground">Save</button>
                        </div>
                    )}

                    {presets.length > 0 ? (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                            {presets.map(p => (
                                <div key={p.id} className="group flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-muted cursor-pointer" onClick={() => handleLoadPreset(p)}>
                                    <span>{p.name}</span>
                                    <button onClick={(e) => handleDeletePreset(p.id, e)} className="opacity-0 group-hover:opacity-100 text-red-500"><Trash2 className="h-3 w-3" /></button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground italic">No saved presets</p>
                    )}
                </div>

                <div className="flex gap-2 border-t pt-4">
                    <button onClick={handleApply} className="flex-1 rounded bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                        Apply Filters
                    </button>
                    <button onClick={handleClear} className="rounded border px-4 py-2 text-sm font-medium hover:bg-muted">
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
}
