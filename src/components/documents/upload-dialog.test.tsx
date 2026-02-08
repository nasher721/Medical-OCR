import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UploadDialog } from './upload-dialog';
import { useOrgStore } from '@/lib/hooks/use-org';

const uploadMock = vi.fn().mockResolvedValue({ error: null });
const createClientMock = vi.fn(() => ({
  storage: {
    from: () => ({ upload: uploadMock }),
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => createClientMock(),
}));

describe('UploadDialog', () => {
  beforeEach(() => {
    useOrgStore.setState({ currentOrg: { id: 'org-123' } as never });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url === '/api/documents') {
        return new Response(JSON.stringify({ data: { id: 'doc-1' } }), { status: 200 });
      }
      if (url === '/api/documents/doc-1/process') {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('uploads files and triggers document processing', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onUploaded = vi.fn();

    render(<UploadDialog open={true} onClose={onClose} onUploaded={onUploaded} />);

    const input = screen.getByLabelText(/browse files/i) as HTMLInputElement;
    const file = new File(['test'], 'invoice.pdf', { type: 'application/pdf' });
    await user.upload(input, file);

    await user.click(screen.getByRole('button', { name: /upload 1 file/i }));

    await waitFor(() => {
      expect(uploadMock).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith('/api/documents', expect.objectContaining({ method: 'POST' }));
      expect(fetch).toHaveBeenCalledWith('/api/documents/doc-1/process', { method: 'POST' });
    });

    expect(onUploaded).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
