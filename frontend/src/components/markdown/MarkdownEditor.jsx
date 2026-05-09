import { useEffect, useRef } from 'react';
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
    const current = editor.storage.markdown.getMarkdown();
    if (initialMarkdown && initialMarkdown !== current) {
      editor.commands.setContent(initialMarkdown, { emitUpdate: false });
    }
  }, [editor, initialMarkdown]);

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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-[#1f1f23] bg-[#0f0f12] p-1.5">
        <ToolbarButton
          title="Heading 1"
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 size={14} />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={14} />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 size={14} />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[#26262b]" />
        <ToolbarButton
          title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton
          title="Code block"
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code size={14} />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[#26262b]" />
        <ToolbarButton
          title="Insert image (embedded as data URI)"
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
      </div>
      <div className="rounded-md border border-[#1f1f23] bg-[#0f0f12] px-4 py-3">
        <EditorContent
          editor={editor}
          className="prose prose-invert max-w-none min-h-[320px] text-[14px] focus:outline-none"
        />
      </div>
    </div>
  );
}

MarkdownEditor.propTypes = {
  initialMarkdown: PropTypes.string,
  onChange: PropTypes.func,
  onEditorReady: PropTypes.func,
};

export default MarkdownEditor;
