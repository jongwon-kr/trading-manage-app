// src/components/editor/TradingJournalEditor.tsx
import React, { useRef, useCallback } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'

// [수정] StarterKit에 없는 'Underline'과
// 수동 설정이 필요한 'CodeBlock', 'Link'만 임포트합니다.
import Underline from '@tiptap/extension-underline'
import CodeBlock from '@tiptap/extension-code-block'
import Link from '@tiptap/extension-link'
// [제거] Strike, Blockquote, HorizontalRule (StarterKit에 이미 포함됨)

import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon,
  Strikethrough,
  List, 
  ListOrdered, 
  Heading2, 
  Image as ImageIcon,
  Link as LinkIcon,
  Quote,
  Code,
  Minus,
  Undo,
  Redo
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface TradingJournalEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
}

// [수정] ToolbarButton 컴포넌트 로직 전면 수정
interface ToolbarButtonProps {
  editor: Editor;
  command: string;      // 실행할 명령어 (e.g., "toggleBold")
  activeName: string;   // isActive 체크용 이름 (e.g., "bold")
  icon: React.ElementType;
  args?: any;           // 명령어에 전달할 인자 (e.g., { level: 2 })
  activeArgs?: any;     // isActive 체크용 인자
}

const ToolbarButton = ({
  editor,
  command,
  activeName,
  icon: Icon,
  args,
  activeArgs,
}: ToolbarButtonProps) => {
  
  // 'activeArgs'가 없으면 'args'를 사용
  const checkArgs = activeArgs ?? args;

  const canExecute = () => {
    const canChain = editor.can();
    // command(e.g., "toggleBold")가 editor.can()에 함수로 존재하는지 확인
    const canCmd = (canChain as any)[command]; 
    if (typeof canCmd !== 'function') {
      return false;
    }
    // editor.can().toggleBold(args) 실행
    return canCmd(args); 
  };

  const handleClick = () => {
    const chain = editor.chain().focus();
    // command(e.g., "toggleBold")가 editor.chain().focus()에 함수로 존재하는지 확인
    const cmd = (chain as any)[command];
    if (typeof cmd === 'function') {
      // editor.chain().focus().toggleBold(args).run() 실행
      cmd(args).run(); 
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      // editor.isActive("bold", args) 실행
      className={editor.isActive(activeName, checkArgs) ? 'bg-accent text-accent-foreground' : ''}
      // canExecute() 함수를 호출하여 disabled 여부 결정
      disabled={!canExecute()}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
};


export function TradingJournalEditor({ 
  content = '', 
  onChange,
  placeholder = '매매 근거를 상세히 작성해주세요...'
}: TradingJournalEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // [수정] StarterKit의 기본 CodeBlock 비활성화
        link: false,      // [수정] StarterKit의 기본 Link 비활성화 (수동 설정을 위해)
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-2',
        },
        inline: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      
      // [수정] 중복 경고 제거 및 수동 설정
      Underline,   // StarterKit에 없으므로 추가
      CodeBlock,   // 수동으로 추가 (위에서 비활성화함)
      Link.configure({ // 수동으로 추가 (위에서 비활성화함)
        openOnClick: true,
        autolink: true,
      }),
      // [제거] Strike, Blockquote, HorizontalRule (StarterKit이 처리)
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange?.(html)
    },
  })

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !editor) {
      return;
    }
    const file = event.target.files[0];
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (src) {
        editor.chain().focus().setImage({ src }).run();
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL을 입력하세요', previousUrl)

    if (url === null) {
      return
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* [수정] 툴바 버튼 props (command, activeName) 수정 */}
      <div className="bg-muted p-2 flex items-center gap-0.5 flex-wrap border-b">
        <ToolbarButton editor={editor} command="toggleBold" activeName="bold" icon={Bold} />
        <ToolbarButton editor={editor} command="toggleItalic" activeName="italic" icon={Italic} />
        <ToolbarButton editor={editor} command="toggleUnderline" activeName="underline" icon={UnderlineIcon} />
        <ToolbarButton editor={editor} command="toggleStrike" activeName="strike" icon={Strikethrough} />
        
        <Separator orientation="vertical" className="h-6 mx-1.5" />

        <ToolbarButton editor={editor} command="toggleHeading" activeName="heading" args={{ level: 2 }} icon={Heading2} />
        <ToolbarButton editor={editor} command="toggleBlockquote" activeName="blockquote" icon={Quote} />
        <ToolbarButton editor={editor} command="toggleCodeBlock" activeName="codeBlock" icon={Code} />

        <Separator orientation="vertical" className="h-6 mx-1.5" />

        <ToolbarButton editor={editor} command="toggleBulletList" activeName="bulletList" icon={List} />
        <ToolbarButton editor={editor} command="toggleOrderedList" activeName="orderedList" icon={ListOrdered} />
        
        <Separator orientation="vertical" className="h-6 mx-1.5" />
        
        {/* 이미지 버튼 */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleImageClick}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        {/* 링크 버튼 */}
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={setLink}
            className={editor.isActive('link') ? 'bg-accent text-accent-foreground' : ''}
        >
            <LinkIcon className="h-4 w-4" />
        </Button>
        {/* 구분선 버튼 */}
        <ToolbarButton editor={editor} command="setHorizontalRule" activeName="horizontalRule" icon={Minus} />

        <Separator orientation="vertical" className="h-6 mx-1.5" />
        
        <ToolbarButton editor={editor} command="undo" activeName="undo" icon={Undo} />
        <ToolbarButton editor={editor} command="redo" activeName="redo" icon={Redo} />
      </div>

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      <EditorContent editor={editor} />
    </div>
  )
}