import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, Save } from 'lucide-react';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import { Card, PageHeader, Button, Input } from '../components/ui';
import MarkdownEditor from '../components/markdown/MarkdownEditor';
import SectionSidebar from '../components/markdown/SectionSidebar';

const AUTOSAVE_DELAY_MS = 1500;

export default function MarkdownEditorPage() {
  const { submissionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDocumentId = searchParams.get('documentId') || '';

  const [documentId, setDocumentId] = useState(initialDocumentId);
  const [title, setTitle] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(Boolean(initialDocumentId));
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState(null);
  const [dirty, setDirty] = useState(false);

  const lastSavedRef = useRef({ title: '', markdown: '' });
  const autosaveTimerRef = useRef(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!initialDocumentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(
          apiConfig.endpoints.markdownDocuments.get(initialDocumentId),
        );
        if (cancelled) return;
        const data = res.data || {};
        setTitle(data.title || '');
        setMarkdown(data.contentMarkdown || '');
        setSections(data.sections || []);
        lastSavedRef.current = {
          title: data.title || '',
          markdown: data.contentMarkdown || '',
        };
      } catch (err) {
        if (cancelled) return;
        setLoadError(err.response?.data?.message || err.message || 'Failed to load document.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialDocumentId]);

  const performSave = useCallback(async () => {
    if (savingRef.current) return;
    if (!title.trim()) return;
    if (!submissionId && !documentId) return;

    const payloadTitle = title.trim();
    const payloadMarkdown = markdown;
    if (
      payloadTitle === lastSavedRef.current.title &&
      payloadMarkdown === lastSavedRef.current.markdown &&
      documentId
    ) {
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      let res;
      if (!documentId) {
        res = await apiClient.post(apiConfig.endpoints.markdownDocuments.create, {
          submissionId,
          title: payloadTitle,
          contentMarkdown: payloadMarkdown,
        });
      } else {
        const patch = {};
        if (payloadTitle !== lastSavedRef.current.title) patch.title = payloadTitle;
        if (payloadMarkdown !== lastSavedRef.current.markdown) patch.contentMarkdown = payloadMarkdown;
        res = await apiClient.put(
          apiConfig.endpoints.markdownDocuments.update(documentId),
          patch,
        );
      }
      const data = res.data || {};
      const newId = data.documentId || documentId;
      if (!documentId && newId) {
        setDocumentId(newId);
        const next = new URLSearchParams(searchParams);
        next.set('documentId', newId);
        setSearchParams(next, { replace: true });
      }
      setSections(data.sections || []);
      lastSavedRef.current = {
        title: data.title ?? payloadTitle,
        markdown: data.contentMarkdown ?? payloadMarkdown,
      };
      setDirty(false);
      toast.success('Saved.');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Save failed.';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [documentId, markdown, searchParams, setSearchParams, submissionId, title]);

  useEffect(() => {
    if (!dirty) return;
    if (loading) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      performSave();
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [dirty, loading, performSave]);

  const handleTitleChange = (event) => {
    setTitle(event.target.value);
    setDirty(true);
  };

  const handleMarkdownChange = (next) => {
    setMarkdown(next);
    setDirty(true);
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Card className="text-rose-300">{loadError}</Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-6 py-8">
      <PageHeader
        eyebrow="Document"
        title={title.trim() || 'Untitled document'}
        subtitle={
          submissionId
            ? `Markdown editor · submission ${submissionId}`
            : 'Markdown editor'
        }
        actions={
          <Button
            variant="primary"
            size="md"
            loading={saving}
            disabled={!title.trim() || (!dirty && Boolean(documentId))}
            onClick={performSave}
          >
            <Save size={14} />
            {saving ? 'Saving' : 'Save'}
          </Button>
        }
      />

      {loading ? (
        <Card>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 size={14} className="animate-spin" />
            Loading document…
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
          <div className="space-y-5 lg:col-span-3">
            <Card>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Title
              </label>
              <div className="mt-2">
                <Input
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Document title"
                  maxLength={200}
                />
              </div>
              <p className="mt-2 text-[12px] text-zinc-600">
                Autosaves {AUTOSAVE_DELAY_MS / 1000}s after you stop editing.
              </p>
            </Card>
            <Card>
              <MarkdownEditor
                initialMarkdown={markdown}
                onChange={handleMarkdownChange}
                onEditorReady={setEditor}
              />
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card>
              <SectionSidebar sections={sections} editor={editor} />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
