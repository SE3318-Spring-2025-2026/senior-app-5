import { useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import {
  Bold, Italic, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote,
  Code, CodeSquare, ImageIcon, Loader2,
} from 'lucide-react';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';

function ToolbarBtn({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded transition-colors
        ${active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-[#1e293b] hover:text-slate-200'}
        ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="mx-0.5 h-4 w-px bg-[#1e293b]" />;
}

export default function MarkdownEditor({ submissionId, value, onChange, disabled, placeholder = 'Start writing your document…' }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
      Markdown.configure({ html: false, transformPastedText: true }),
    ],
    content: value ?? '',
    editable: !disabled,
    onUpdate({ editor: e }) {
      onChange(e.storage.markdown.getMarkdown());
    },
  });

  const handleImageFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !submissionId || !editor) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await apiClient.post(`/submissions/${submissionId}/images`, form);
      const { imageId } = res.data;
      const src = `${apiConfig.baseURL}/submissions/${submissionId}/images/${imageId}`;
      editor.chain().focus().setImage({ src, alt: file.name }).run();
    } catch {
      // silently fail — user can retry
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [submissionId, editor]);

  if (!editor) return null;

  return (
    <>
      {/* placeholder pseudo-element needs a real stylesheet rule */}
      <style>{`
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #475569;
          pointer-events: none;
          height: 0;
        }
      `}</style>

      <div className="tiptap-editor rounded-xl border border-[#1e293b] overflow-hidden">
        {/* ── Toolbar ───────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-0.5 border-b border-[#1e293b] bg-[#0d1526] px-2 py-1.5">
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()}   active={editor.isActive('bold')}   title="Bold">      <Bold size={13} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">    <Italic size={13} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Strikethrough size={13} /></ToolbarBtn>
          <Sep />
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1"><Heading1 size={13} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2"><Heading2 size={13} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3"><Heading3 size={13} /></ToolbarBtn>
          <Sep />
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()}  active={editor.isActive('bulletList')}  title="Bullet list"> <List size={13} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list"><ListOrdered size={13} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()}  active={editor.isActive('blockquote')}  title="Blockquote">  <Quote size={13} /></ToolbarBtn>
          <Sep />
          <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()}      active={editor.isActive('code')}      title="Inline code"><Code size={13} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block"> <CodeSquare size={13} /></ToolbarBtn>
          <Sep />
          <ToolbarBtn onClick={() => fileInputRef.current?.click()} disabled={uploading || !submissionId} title="Insert image">
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
          </ToolbarBtn>
        </div>

        {/* ── Editor area ───────────────────────────────────────── */}
        <EditorContent
          editor={editor}
          className="
            min-h-[380px] bg-[#111827] px-6 py-4 text-sm
            [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[340px] [&_.ProseMirror]:leading-relaxed
            [&_.ProseMirror_h1]:mt-6 [&_.ProseMirror_h1]:mb-2 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:text-slate-100
            [&_.ProseMirror_h2]:mt-5 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:text-xl  [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:text-slate-100
            [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_h3]:mb-1 [&_.ProseMirror_h3]:text-lg  [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:text-slate-200
            [&_.ProseMirror_p]:my-2 [&_.ProseMirror_p]:text-slate-300
            [&_.ProseMirror_strong]:font-semibold [&_.ProseMirror_strong]:text-slate-100
            [&_.ProseMirror_ul]:my-2 [&_.ProseMirror_ul]:list-disc   [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:text-slate-300
            [&_.ProseMirror_ol]:my-2 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ol]:text-slate-300
            [&_.ProseMirror_li]:my-1
            [&_.ProseMirror_blockquote]:my-3 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-indigo-500 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-slate-400
            [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:bg-[#0d1526] [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:font-mono [&_.ProseMirror_code]:text-xs [&_.ProseMirror_code]:text-indigo-300
            [&_.ProseMirror_pre]:my-3 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:border [&_.ProseMirror_pre]:border-[#1e293b] [&_.ProseMirror_pre]:bg-[#0d1526] [&_.ProseMirror_pre]:p-4
            [&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:p-0 [&_.ProseMirror_pre_code]:text-slate-300
            [&_.ProseMirror_img]:my-3 [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:border [&_.ProseMirror_img]:border-[#1e293b]
            [&_.ProseMirror_hr]:my-4 [&_.ProseMirror_hr]:border-[#1e293b]
          "
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.gif"
        className="hidden"
        onChange={handleImageFile}
      />
    </>
  );
}
