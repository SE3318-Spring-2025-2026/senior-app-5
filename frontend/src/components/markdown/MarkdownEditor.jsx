import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import toast from 'react-hot-toast';
import {
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  List,
  Code,
  Image as ImageIcon,
  Eye,
  FileCode2,
} from 'lucide-react';

const MAX_IMAGE_BYTES = 512 * 1024; // 512 KB before base64 inflation

function ToolbarButton({ active, onClick, title, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={
        'inline-flex h-8 w-8 items-center justify-center rounded-md border text-zinc-300 transition-colors ' +
        (active
          ? 'border-[#3a3a40] bg-[#1f1f23] text-zinc-100'
          : 'border-[#26262b] bg-[#18181c] hover:border-[#3a3a40] hover:bg-[#1f1f23] hover:text-zinc-100')
      }
    >
      {children}
    </button>
  );
}

ToolbarButton.propTypes = {
  active: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export function MarkdownEditor({ initialMarkdown = '', onChange, onEditorReady }) {
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState('preview');
  const [sourceValue, setSourceValue] = useState(initialMarkdown);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: 'Start writing your document — use # for headings…' }),
      Markdown.configure({ html: false, transformPastedText: true, breaks: true }),
    ],
    content: initialMarkdown,
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.storage.markdown.getMarkdown());
    },
  });

  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor) return;
    if (mode !== 'preview') return;
    const current = editor.storage.markdown.getMarkdown();
    if (initialMarkdown !== current) {
      editor.commands.setContent(initialMarkdown || '', { emitUpdate: false });
    }
  }, [editor, initialMarkdown, mode]);

  useEffect(() => {
    if (mode === 'source') return;
    setSourceValue(initialMarkdown);
  }, [initialMarkdown, mode]);

  const switchMode = (next) => {
    if (next === mode) return;
    if (next === 'source') {
      const md = editor?.storage.markdown.getMarkdown() ?? initialMarkdown;
      setSourceValue(md);
    } else if (editor) {
      editor.commands.setContent(sourceValue || '', { emitUpdate: false });
      onChange?.(sourceValue);
    }
    setMode(next);
  };

  const handleSourceChange = (event) => {
    const value = event.target.value;
    setSourceValue(value);
    onChange?.(value);
  };

  const handleImageSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image too large (max 512 KB to fit document size limit).');
      return;
    }
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('File read failed.'));
        reader.readAsDataURL(file);
      });
      editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
    } catch (err) {
      toast.error(err?.message || 'Could not insert image.');
    } finally {
      event.target.value = '';
    }
  };

  if (!editor) return null;

  const isSource = mode === 'source';

  return (
    <div>
      <div className="sticky top-2 z-10 mb-4 flex flex-wrap items-center gap-1.5 rounded-lg border border-[#26262b] bg-[#18181c]/95 p-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-[#18181c]/85">
        {!isSource && (
          <>
            <ToolbarButton
              title="Heading 1 (Ctrl+Alt+1)"
              active={editor.isActive('heading', { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              <Heading1 size={14} />
            </ToolbarButton>
            <ToolbarButton
              title="Heading 2 (Ctrl+Alt+2)"
              active={editor.isActive('heading', { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 size={14} />
            </ToolbarButton>
            <ToolbarButton
              title="Heading 3 (Ctrl+Alt+3)"
              active={editor.isActive('heading', { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <Heading3 size={14} />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-[#26262b]" />
            <ToolbarButton
              title="Bold (Ctrl+B)"
              active={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold size={14} />
            </ToolbarButton>
            <ToolbarButton
              title="Italic (Ctrl+I)"
              active={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic size={14} />
            </ToolbarButton>
            <ToolbarButton
              title="Bullet list (Ctrl+Shift+8)"
              active={editor.isActive('bulletList')}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List size={14} />
            </ToolbarButton>
            <ToolbarButton
              title="Code block (Ctrl+Alt+C)"
              active={editor.isActive('codeBlock')}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            >
              <Code size={14} />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-[#26262b]" />
            <ToolbarButton
              title="Insert image (embedded as data URI, max 512 KB)"
              active={false}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon size={14} />
            </ToolbarButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-label="Upload image"
              onChange={handleImageSelect}
            />
          </>
        )}
        {isSource && (
          <span className="px-1.5 text-[12px] font-medium text-zinc-400">
            Markdown source
          </span>
        )}
        <div className="ml-auto inline-flex items-center gap-0.5 rounded-md border border-[#26262b] bg-[#131316] p-0.5">
          <button
            type="button"
            onClick={() => switchMode('preview')}
            title="Rich preview"
            className={
              'inline-flex items-center gap-1 rounded px-2 py-1 text-[12px] font-medium transition-colors ' +
              (!isSource
                ? 'bg-[#1f1f23] text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200')
            }
          >
            <Eye size={12} />
            Preview
          </button>
          <button
            type="button"
            onClick={() => switchMode('source')}
            title="Edit raw markdown"
            className={
              'inline-flex items-center gap-1 rounded px-2 py-1 text-[12px] font-medium transition-colors ' +
              (isSource
                ? 'bg-[#1f1f23] text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200')
            }
          >
            <FileCode2 size={12} />
            Markdown
          </button>
        </div>
      </div>
      {isSource ? (
        <textarea
          value={sourceValue}
          onChange={handleSourceChange}
          spellCheck={false}
          placeholder="# Heading&#10;&#10;Write markdown here…"
          className="block w-full resize-none rounded-md border border-[#1f1f23] bg-[#0f0f12] px-4 py-3 font-mono text-[13px] leading-relaxed text-zinc-200 placeholder-zinc-600 outline-none focus:border-[#3a3a40] min-h-[65vh]"
        />
      ) : (
        <EditorContent
          editor={editor}
          className="prose prose-invert prose-zinc max-w-none min-h-[65vh] text-[15px] leading-relaxed focus:outline-none [&_.ProseMirror]:min-h-[65vh] [&_.ProseMirror]:focus:outline-none"
        />
      )}
    </div>
  );
}

MarkdownEditor.propTypes = {
  initialMarkdown: PropTypes.string,
  onChange: PropTypes.func,
  onEditorReady: PropTypes.func,
};

export default MarkdownEditor;
