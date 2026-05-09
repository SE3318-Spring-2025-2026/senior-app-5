import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, Save } from 'lucide-react';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import { Card, Button } from '../components/ui';
import MarkdownEditor from '../components/markdown/MarkdownEditor';
import SectionSidebar from '../components/markdown/SectionSidebar';

const AUTOSAVE_DELAY_MS = 1500;

function formatRelative(from, now) {
  if (!from) return '';
  const diff = Math.max(0, Math.floor((now - from) / 1000));
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function SaveStatus({ saving, dirty, lastSavedAt, saveError, now }) {
  let dotClass = 'bg-zinc-600';
  let label = 'Not saved yet';

  if (saveError) {
    dotClass = 'bg-rose-500';
    label = 'Save failed';
  } else if (saving) {
    dotClass = 'bg-sky-400 animate-pulse';
    label = 'Saving…';
  } else if (dirty) {
    dotClass = 'bg-amber-400';
    label = 'Unsaved changes';
  } else if (lastSavedAt) {
    dotClass = 'bg-emerald-400';
    label = `Saved · ${formatRelative(lastSavedAt, now)}`;
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#26262b] bg-[#131316] px-3 py-1 text-[12px] text-zinc-400">
      {saving ? (
        <Loader2 size={12} className="animate-spin text-sky-400" />
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden />
      )}
      {label}
    </span>
  );
}

function findActiveSectionId(editor, sections) {
  if (!editor || !sections?.length) return null;
  const { $from } = editor.state.selection;
  let cursorTopPos = null;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === 'heading') {
      cursorTopPos = $from.before(depth);
      break;
    }
  }

  let bestPos = -1;
  let bestMatch = null;
  const cursorPos = cursorTopPos ?? $from.pos;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return true;
    if (pos > cursorPos) return false;
    const match = sections.find(
      (s) => s.level === node.attrs?.level && s.heading === node.textContent,
    );
    if (match && pos >= bestPos) {
      bestPos = pos;
      bestMatch = match;
    }
    return false;
  });
  return bestMatch?.sectionId ?? null;
}

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
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saveError, setSaveError] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [now, setNow] = useState(() => Date.now());

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
      setSaveError(false);
      setLastSavedAt(Date.now());
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Save failed.';
      setSaveError(true);
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

  // Ctrl/Cmd+S to force save
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        performSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [performSave]);

  // Tick clock so "X ago" stays fresh
  useEffect(() => {
    if (!lastSavedAt) return undefined;
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, [lastSavedAt]);

  // Track active section from editor selection
  useEffect(() => {
    if (!editor) return undefined;
    const update = () => {
      setActiveSectionId(findActiveSectionId(editor, sections));
    };
    update();
    editor.on('selectionUpdate', update);
    editor.on('update', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('update', update);
    };
  }, [editor, sections]);

  const handleTitleChange = (event) => {
    setTitle(event.target.value);
    setDirty(true);
  };

  const handleMarkdownChange = (next) => {
    setMarkdown(next);
    setDirty(true);
  };

  const wordCount = useMemo(() => {
    const trimmed = markdown.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [markdown]);

  const readingMinutes = Math.max(1, Math.round(wordCount / 200));

  if (loadError) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Card className="text-rose-300">{loadError}</Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Document
          </span>
          {submissionId && (
            <span className="rounded-full border border-[#26262b] bg-[#131316] px-2.5 py-0.5 text-[11px] text-zinc-500">
              Submission · {submissionId.slice(-6)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SaveStatus
            saving={saving}
            dirty={dirty}
            lastSavedAt={lastSavedAt}
            saveError={saveError}
            now={now}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={performSave}
            disabled={!title.trim() || saving || (!dirty && Boolean(documentId))}
            title="Save now (Ctrl+S)"
          >
            <Save size={14} />
            Save
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="min-h-[60vh]">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 size={14} className="animate-spin" />
            Loading document…
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <Card className="min-h-[80vh] !p-0">
              <div className="border-b border-[#1f1f23] px-8 pb-5 pt-7">
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Untitled document"
                  maxLength={200}
                  aria-label="Document title"
                  className="w-full border-0 bg-transparent p-0 text-3xl font-semibold leading-tight text-zinc-100 placeholder-zinc-600 outline-none focus:ring-0"
                />
              </div>
              <div className="px-8 pb-6 pt-4">
                <MarkdownEditor
                  initialMarkdown={markdown}
                  onChange={handleMarkdownChange}
                  onEditorReady={setEditor}
                />
              </div>
              <div className="flex items-center justify-between border-t border-[#1f1f23] px-8 py-3 text-[12px] text-zinc-500">
                <span>
                  {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
                  {wordCount > 0 && <> · ~{readingMinutes} min read</>}
                </span>
                <span className="hidden sm:inline text-zinc-600">
                  Autosaves · <kbd className="rounded border border-[#26262b] bg-[#131316] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">Ctrl</kbd> <kbd className="rounded border border-[#26262b] bg-[#131316] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">S</kbd> to save now
                </span>
              </div>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-4">
              <Card>
                <SectionSidebar
                  sections={sections}
                  editor={editor}
                  activeSectionId={activeSectionId}
                />
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
