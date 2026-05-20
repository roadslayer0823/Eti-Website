import React, { useState, useRef, useEffect } from 'react';
import { FileText, ListChecks, HelpCircle, MessageSquare, Send, ClipboardList, X, Bot, User, Loader2 } from 'lucide-react';
import SessionTimer from './SessionTimer';
import { Message } from '../types';
import { cn } from '../lib/utils';
import mammoth from 'mammoth';
import { parsePDF } from '../services/gemini';

// Function to read file content based on file type
async function readFileContent(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();

  // TXT files - use FileReader
  if (fileName.endsWith('.txt') || file.type === 'text/plain') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = () => reject(new Error('Failed to read TXT file'));
      reader.readAsText(file);
    });
  }

  // DOCX files - use mammoth
  if (fileName.endsWith('.docx')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (err) {
      console.error('Error parsing DOCX:', err);
      return '[DOCX file could not be parsed]';
    }
  }

  // PDF files - use backend
  if (fileName.endsWith('.pdf')) {
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return await parsePDF(base64);
    } catch (err) {
      console.error('Error parsing PDF:', err);
      return `[PDF parsing error: ${err instanceof Error ? err.message : 'Unknown error'}]`;
    }
  }

  // Unknown file type
  return `[Unsupported file type: ${file.name}]`;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string, displayContent?: string) => void;
  isLoading: boolean;
  files: (File | null)[];
  pastedText: string;
  onResetReferences: () => void;
  lang: string;
  t: any;
  token: string | null;
}

const HELPER_TAGS = [
  { id: 'notes', label: '重點筆記', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'exercise', label: '填充練習', icon: ListChecks, color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'mc', label: '選擇題', icon: HelpCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'long', label: '長問答', icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50' },
];

interface TextPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
  initialText: string;
}

function TextPasteModal({ isOpen, onClose, onSave, initialText }: TextPasteModalProps) {
  const [text, setText] = useState(initialText);

  // Update internal state when initialText changes (e.g. when modal is opened)
  useEffect(() => {
    setText(initialText);
  }, [initialText, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900">貼上參考資料</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-4 flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="在此貼上課文內容、參考資料或任何你想讓 AI 參考的文字..."
            className="w-full h-full min-h-[300px] p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-sans text-sm leading-relaxed"
          />
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => {
              onSave(text);
              onClose();
            }}
            className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
          >
            儲存內容
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatInterface({ 
  messages, 
  onSendMessage, 
  isLoading,
  files,
  pastedText,
  onResetReferences,
  lang,
  t,
  token
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const HELPER_TAGS = [
    { id: 'notes', label: t.helperNotes, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'exercise', label: t.helperExercise, icon: ListChecks, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'mc', label: t.helperMC, icon: HelpCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'long', label: t.helperLong, icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleTag = (tagLabel: string) => {
    setSelectedTags(prev => 
      prev.includes(tagLabel) 
        ? prev.filter(t => t !== tagLabel) 
        : [...prev, tagLabel]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      const validFiles = files.filter(f => f !== null) as File[];
      const fileNames = validFiles.map(f => f.name);
      const hasPasted = pastedText.trim().length > 0;

      let referenceInfo = '';
      if (fileNames.length > 0 || hasPasted) {
        const refs = [...fileNames];
        if (hasPasted) refs.push('手動貼上內容');
        referenceInfo = ` (參考來源: ${refs.join(', ')})`;
      }

      // Include pasted reference text content in the message
      let referenceContent = '';
      if (hasPasted) {
        referenceContent = `\n\n【參考資料內容】\n${pastedText}\n【參考資料結束】\n`;
      }

      // Include uploaded file contents in the message
      let fileContents = '';
      if (validFiles.length > 0) {
        try {
          for (const file of validFiles) {
            const content = await readFileContent(file);
            if (content && content.trim().length > 0) {
              fileContents += `\n\n【檔案: ${file.name} 內容】\n${content}\n【檔案結束】\n`;
            }
          }
        } catch (err) {
          console.error('Error reading file content:', err);
        }
      }

      const finalContent = selectedTags.length > 0
        ? `[輔助標籤: ${selectedTags.join(', ')}] ${input}${referenceInfo}${referenceContent}${fileContents}`
        : `${input}${referenceInfo}${referenceContent}${fileContents}`;

      const displayContent = input;

      onSendMessage(finalContent, displayContent);
      setInput('');
      setSelectedTags([]);
      // Reset references after sending (Removed per user request)
      // onResetReferences();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      <div className="p-3 sm:p-4 border-b border-[var(--border-main)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-[var(--text-main)] text-sm sm:text-base truncate">{t.aiAssistant}</h2>
            <p className="text-[10px] text-[var(--text-muted)] truncate">{t.hkTeachersOnly}</p>
          </div>
        </div>
        <SessionTimer token={token} className="flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-2 py-1 shadow-sm" />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-10 space-y-4">
            <p className="text-[var(--text-muted)] text-sm px-6">{t.tagline}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3 max-w-[90%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              msg.role === 'user' ? "bg-[var(--bg-sidebar)]" : "bg-primary/10"
            )}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-[var(--text-muted)]" /> : <Bot className="w-4 h-4 text-primary" />}
            </div>
            <div className={cn(
              "p-3 rounded-2xl text-sm leading-relaxed",
              msg.role === 'user' 
                ? "bg-primary text-white rounded-tr-none" 
                : "bg-[var(--bg-sidebar)] text-[var(--text-main)] rounded-tl-none border border-[var(--border-main)]"
            )}>
              {msg.displayContent 
                ? msg.displayContent 
                : (msg.content.replace(/:::CARD_START:::[\s\S]*?:::CARD_END:::/g, '').trim() || (msg.role === 'assistant' ? (lang === 'zh' ? "已生成教學卡片，請查看右側編輯器。" : "Teaching cards generated, please check the editor on the right.") : ""))}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 mr-auto">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="p-3 rounded-2xl bg-[var(--bg-sidebar)] text-[var(--text-main)] rounded-tl-none border border-[var(--border-main)] flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">{t.thinking}</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 border-t border-[var(--border-main)] bg-[var(--bg-sidebar)] space-y-3">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {HELPER_TAGS.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.label)}
              className={cn(
                "flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-bold transition-all border",
                selectedTags.includes(tag.label)
                  ? cn("border-transparent shadow-sm scale-105", tag.bg, tag.color)
                  : "bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-muted)] hover:border-primary/50"
              )}
            >
              <tag.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              {tag.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selectedTags.length > 0 ? t.inputPlaceholderWithTag.replace('{tag}', selectedTags.join('/')) : t.inputPlaceholder}
            className="w-full pl-3 sm:pl-4 pr-10 sm:pr-12 py-2 sm:py-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm text-[var(--text-main)]"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
