import { TrainingExample } from '@/lib/supabase/types';

export interface TrainingMetrics {
    accuracy: number;
    total_examples: number;
    last_trained: string | null;
}

export class TrainingService {
    static async listExamples(orgId: string, modelId?: string): Promise<TrainingExample[]> {
        const params = new URLSearchParams({ org_id: orgId });
        if (modelId) params.append('model_id', modelId);

        const response = await fetch(`/api/training?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch training examples');

        const json = await response.json();
        return json.data;
    }

    static async retrain(modelId: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch('/api/training/retrain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model_id: modelId }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to trigger retraining');
        }

        return response.json();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static async getMetrics(_modelId: string): Promise<TrainingMetrics> {
        // Mock metrics for now as real calculation would happen in Python backend
        // In a real app, this would fetch from an API
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    accuracy: 0.85 + Math.random() * 0.1, // Mock 85-95% accuracy
                    total_examples: Math.floor(Math.random() * 100) + 50,
                    last_trained: new Date(Date.now() - 86400000 * Math.random()).toISOString(),
                });
            }, 500);
        });
    }
}
