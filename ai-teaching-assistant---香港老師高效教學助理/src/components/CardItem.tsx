import React, { useState, useRef } from 'react';
import { Card } from '../types';
import { cn } from '../lib/utils';
import { 
  GripVertical, 
  Trash2, 
  Check, 
  Edit3, 
  ChevronDown, 
  ChevronUp,
  Scissors,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface CardItemProps {
  card: Card;
  index: number;
  isDragging: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onUpdate: (updates: Partial<Card>) => void;
  onDelete: () => void;
  lang: string;
  t: any;
}

export default function CardItem({ card, index, isDragging, onDragStart, onDragOver, onDrop, onDragEnd, onUpdate, onDelete, lang, t }: CardItemProps) {
  const [isEditing, setIsEditing] = useState(card.status === 'active');
  const [isExpanded, setIsExpanded] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = () => {
    onUpdate({ status: 'saved' });
    setIsEditing(false);
  };

  const handleEdit = () => {
    onUpdate({ status: 'active' });
    setIsEditing(true);
  };

  const handleBlanking = () => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    
    if (start === end) return;
    
    const text = card.content;
    const selectedText = text.substring(start, end);
    const newContent = text.substring(0, start) + '(______) ' + text.substring(end);
    
    const newTeacherNotes = [...(card.teacherNotes || []), selectedText];
    onUpdate({ 
      content: newContent,
      teacherNotes: newTeacherNotes
    });
    
    // Set focus back after update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + 8, start + 8);
      }
    }, 0);
  };

  return (
    <div
      draggable={true}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative bg-[var(--bg-card)] rounded-xl border transition-all duration-200",
        isDragging ? "shadow-2xl opacity-50" : "shadow-sm hover:shadow-md",
        card.status === 'draft' ? "border-primary/50 ring-2 ring-primary/10" : "border-[var(--border-main)]",
        card.status === 'active' ? "border-primary ring-2 ring-primary/5" : "",
        card.status === 'saved' ? "border-[var(--border-main)]" : ""
      )}
    >
      {/* Header */}
      <div className="flex items-center p-3 border-b border-[var(--border-main)] bg-[var(--bg-sidebar)] rounded-t-xl">
        <div 
          className="p-2 cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors hover:bg-[var(--bg-main)] rounded"
          title={lang === 'zh' ? "拖動卡片" : "Drag card"}
        >
          <GripVertical className="w-4 h-4" />
        </div>
        
        <div className="ml-2 flex items-center gap-2 flex-1">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--bg-main)] text-[10px] font-bold text-[var(--text-muted)] border border-[var(--border-main)]">
            {index + 1}
          </span>
          {isEditing ? (
            <input 
              value={card.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="bg-transparent border-none focus:ring-0 font-medium text-[var(--text-main)] w-full p-0"
              placeholder={lang === 'zh' ? "卡片標題" : "Card Title"}
            />
          ) : (
            <h3 className="font-medium text-[var(--text-main)] truncate">{card.title}</h3>
          )}
        </div>

        <div className="flex items-center gap-1">
          {card.status === 'draft' && (
            <button 
              onClick={() => onUpdate({ status: 'saved' })}
              className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
              title={lang === 'zh' ? "確認生成" : "Confirm Generation"}
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          
          {isEditing ? (
            <>
              <button 
                onClick={handleBlanking}
                className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors flex items-center gap-1"
                title={lang === 'zh' ? "智能挖空 (選取文字後點擊)" : "Smart Blanking (Select text then click)"}
              >
                <Scissors className="w-4 h-4" />
                <span className="text-[10px] font-bold">{lang === 'zh' ? '挖空' : 'Blank'}</span>
              </button>
              <button 
                onClick={handleSave}
                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                title={lang === 'zh' ? "儲存" : "Save"}
              >
                <Save className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button 
              onClick={handleEdit}
              className="p-1.5 text-[var(--text-muted)] hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
              title={lang === 'zh' ? "編輯" : "Edit"}
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] rounded-lg transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          <button 
            onClick={onDelete}
            className="p-1.5 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title={lang === 'zh' ? "刪除" : "Delete"}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4">
              {isEditing ? (
                <textarea
                  ref={textareaRef}
                  value={card.content}
                  onChange={(e) => onUpdate({ content: e.target.value })}
                  className="w-full min-h-[150px] p-3 text-sm text-[var(--text-main)] bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-y font-mono"
                  placeholder={lang === 'zh' ? "輸入教學內容..." : "Enter teaching content..."}
                />
              ) : (
                <div className="prose prose-sm max-w-none text-[var(--text-main)] dark:prose-invert">
                  <ReactMarkdown>{card.content}</ReactMarkdown>
                </div>
              )}

              {card.teacherNotes && card.teacherNotes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-dashed border-[var(--border-main)] bg-[var(--bg-sidebar)] p-3 rounded-lg">
                  <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-2">{t.teacherKey}</p>
                  <ol className="list-decimal list-inside text-xs text-[var(--text-main)] space-y-1">
                    {card.teacherNotes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ol>
                  <button 
                    onClick={() => onUpdate({ teacherNotes: [] })}
                    className="mt-2 text-[10px] text-[var(--text-muted)] hover:text-red-500 transition-colors"
                  >
                    {lang === 'zh' ? '清除答案' : 'Clear Answers'}
                  </button>
                </div>
              )}

              {card.suggestions && card.suggestions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--border-main)]">
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">{lang === 'zh' ? 'AI 建議' : 'AI Suggestions'}</p>
                  <div className="flex flex-wrap gap-2">
                    {card.suggestions.map((s, i) => (
                      <span 
                        key={i} 
                        className="px-2 py-1 bg-primary/10 text-primary text-[10px] rounded-md border border-primary/20"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
