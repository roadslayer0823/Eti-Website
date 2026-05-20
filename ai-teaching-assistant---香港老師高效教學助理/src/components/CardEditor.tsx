import React, { useState, useRef, useEffect } from 'react';
import { Card, Project } from '../types';
import CardItem from './CardItem';
import { Plus, Download, Trash2, Upload, X, ClipboardList, Ban, Info } from 'lucide-react';
import { FileText } from 'lucide-react';
import { saveAs } from 'file-saver';
import { useEffect as useEffectHook, useRef as useRefHook } from 'react';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { parsePDF } from '../services/gemini';

interface TextPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
  initialText: string;
  title: string;
  placeholder: string;
  icon: React.ElementType;
  example?: string;
  t: any;
}

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  fileContent: string;
  t: any;
}

function FileViewerModal({ isOpen, onClose, file, fileContent, t }: FileViewerModalProps) {
  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[var(--bg-card)] rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[80vh] border border-[var(--border-main)]">
        <div className="p-4 border-b border-[var(--border-main)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-[var(--text-main)]">{file.name}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-sidebar)] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          <pre className="w-full min-h-[300px] p-4 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-xl text-sm text-[var(--text-main)] whitespace-pre-wrap font-mono">
            {fileContent || t.loadingFileContent || 'Loading...'}
          </pre>
        </div>
        <div className="p-4 border-t border-[var(--border-main)] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm"
          >
            {t.close || '關閉'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TextPasteModal({ isOpen, onClose, onSave, initialText, title, placeholder, icon: Icon, example, t }: TextPasteModalProps) {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    setText(initialText);
  }, [initialText, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[var(--bg-card)] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh] border border-[var(--border-main)]">
        <div className="p-4 border-b border-[var(--border-main)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-[var(--text-main)]">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-sidebar)] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          {example && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-black">
                <p className="font-bold mb-1">範例 / Example:</p>
                <p className="whitespace-pre-line">{example}</p>
              </div>
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            className="w-full min-h-[300px] p-4 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-sans text-sm leading-relaxed text-[var(--text-main)]"
          />
        </div>
        <div className="p-4 border-t border-[var(--border-main)] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)] rounded-lg transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={() => {
              onSave(text);
              onClose();
            }}
            className="px-6 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CardEditorProps {
  cards: Card[];
  project: Project | null;
  onUpdateCard: (id: string, updates: Partial<Card>) => void;
  onDeleteCard: (id: string) => void;
  onReorderCards: (newCards: Card[]) => void;
  files: (File | null)[];
  setFiles: React.Dispatch<React.SetStateAction<(File | null)[]>>;
  pastedText: string;
  setPastedText: React.Dispatch<React.SetStateAction<string>>;
  onUpdateProject: (updates: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  onClearCards: () => void;
  lang: string;
  t: any;
}

export default function CardEditor({
  cards,
  project,
  onUpdateCard,
  onDeleteCard,
  onReorderCards,
  files,
  setFiles,
  pastedText,
  setPastedText,
  onUpdateProject,
  onDeleteProject,
  onClearCards,
  lang,
  t
}: CardEditorProps) {
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isNegativePromptModalOpen, setIsNegativePromptModalOpen] = useState(false);
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string>('');
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('eti_jwt_token'));

  // Function to read file content (TXT or DOCX)
  const readFileContent = async (file: File): Promise<string> => {
    const fileName = file.name.toLowerCase();

    // DOCX files - use mammoth
    if (fileName.endsWith('.docx')) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value || '[DOCX file is empty or could not extract text]';
      } catch (err) {
        console.error('Error parsing DOCX:', err);
        return `[DOCX parsing error: ${err instanceof Error ? err.message : 'Unknown error'}]`;
      }
    }

    // PDF files - call backend
    if (fileName.endsWith('.pdf')) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Only send the base64 part
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

    // TXT files - use FileReader
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Handle file click to view content
  const handleFileClick = async (file: File) => {
    setSelectedFile(file);
    setSelectedFileContent('');
    setIsFileViewerOpen(true);

    try {
      const content = await readFileContent(file);
      setSelectedFileContent(content);
    } catch (err) {
      setSelectedFileContent(`[Error reading file: ${err instanceof Error ? err.message : 'Unknown error'}]`);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedCardIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedCardIndex === null || draggedCardIndex === dropIndex) {
      setDraggedCardIndex(null);
      return;
    }

    const newCards = [...cards];
    const movedCard = newCards[draggedCardIndex];
    newCards.splice(draggedCardIndex, 1);
    newCards.splice(dropIndex, 0, movedCard);

    onReorderCards(newCards);
    setDraggedCardIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedCardIndex(null);
  };

  // Reset file input value when file is removed (to allow re-uploading the same file)
  useEffect(() => {
    files.forEach((file, index) => {
      if (!file && fileInputRefs[index].current) {
        fileInputRefs[index].current!.value = '';
      }
    });
  }, [files]);

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert('檔案太大！每個檔案限制為 20MB。');
        return;
      }
      const newFiles = [...files];
      newFiles[index] = file;
      setFiles(newFiles);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles[index] = null;
    setFiles(newFiles);
    if (fileInputRefs[index].current) {
      fileInputRefs[index].current!.value = '';
    }
  };

  const exportToDocx = async () => {
    if (!project) return;

    const cleanText = (text: string) => {
      return text
        .replace(/\$>\$/g, '>')
        .replace(/\$<\$/g, '<')
        .replace(/\$\\ge\$/g, '≥')
        .replace(/\$\\le\$/g, '≤')
        .replace(/\$\\times\$/g, '×')
        .replace(/\$\\div\$/g, '÷')
        .replace(/\$/g, ''); // Remove remaining $ signs
    };

    const sections = cards.map((card, index) => {
      const children: any[] = [
        new Paragraph({
          text: `${index + 1}. ${card.title}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        }),
        // Basic markdown to docx conversion (simple line breaks)
        ...card.content.split('\n').map(line => new Paragraph({
          children: [new TextRun(cleanText(line))],
          spacing: { after: 120 },
        }))
      ];

      if (card.teacherNotes && card.teacherNotes.length > 0) {
        children.push(
          new Paragraph({
            text: "教師版答案 (Teacher's Key):",
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          })
        );
        card.teacherNotes.forEach((note, i) => {
          children.push(new Paragraph({
            text: `${i + 1}. ${cleanText(note)}`,
            spacing: { after: 80 },
          }));
        });
      }

      return children;
    }).flat();

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: project.name,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `科目：${project.subject}`, bold: true }),
              new TextRun({ text: `  |  年級：${project.grade}`, bold: true }),
              new TextRun({ text: `  |  類型：${project.type === 'lesson_plan' ? '教案' : project.type === 'handout' ? '講義' : '學生筆記'}`, bold: true }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),
          ...sections
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${project.name}.docx`);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] overflow-hidden">
      <TextPasteModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onSave={setPastedText}
        initialText={pastedText}
        title={t.pasteModalTitle}
        placeholder={t.pastePlaceholder}
        icon={ClipboardList}
        t={t}
      />
      <TextPasteModal
        isOpen={isNegativePromptModalOpen}
        onClose={() => setIsNegativePromptModalOpen(false)}
        onSave={(text) => onUpdateProject({ negativePrompt: text })}
        initialText={project?.negativePrompt || ''}
        title={t.negPromptTitle}
        placeholder={t.negPromptPlaceholder}
        icon={Ban}
        example={t.negPromptExample}
        t={t}
      />
      <FileViewerModal
        isOpen={isFileViewerOpen}
        onClose={() => setIsFileViewerOpen(false)}
        file={selectedFile}
        fileContent={selectedFileContent}
        t={t}
      />
      <div className="p-3 sm:p-4 bg-[var(--bg-card)] border-b border-[var(--border-main)] flex flex-row flex-wrap items-center justify-between gap-y-3 gap-x-4 lg:gap-x-6">
        {/* Title Section */}
        <div className="shrink-0 order-1">
          <h2 className="font-semibold text-[var(--text-main)] text-sm sm:text-base text-left">
            {t.editorTitle}
          </h2>
          <p className="text-[10px] sm:text-xs text-[var(--text-muted)] text-left">
            {cards.length} {t.cardsCount}
          </p>
        </div>

        {/* Action Buttons - Order 3 */}
        <div className="flex gap-2 shrink-0 order-3 ml-auto justify-end items-center">
          {project && (
            <button
              onClick={() => onDeleteProject(project.id)}
              className="p-1.5 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title={t.deleteProject}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {cards.length > 0 && (
            <button
              onClick={onClearCards}
              className="p-1.5 text-[var(--text-muted)] hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              title={t.clearCards}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={exportToDocx}
            disabled={cards.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:bg-gray-200 disabled:shadow-none"
          >
            <Download className="w-4 h-4" />
            <span className="hidden xs:inline">{t.exportDocx}</span>
            <span className="inline xs:hidden">.docx</span>
          </button>
        </div>

        {/* Reference Slots - Order 2 */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto flex-1 min-w-0 order-2">
          {files.map((file, index) => (
            <div key={index} className="relative">
              <input
                type="file"
                ref={fileInputRefs[index]}
                onChange={(e) => handleFileChange(index, e)}
                className="hidden"
                accept=".txt,.docx,.pdf"
              />
              {file ? (
                <div
                  onClick={() => handleFileClick(file)}
                  className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 border border-primary/30 rounded-lg h-8 sm:h-9 max-w-[100px] sm:max-w-[120px] cursor-pointer hover:bg-primary/20 transition-colors"
                  title={t.viewFile || '查看檔案'}
                >
                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-[9px] sm:text-[10px] text-primary font-bold truncate">
                    {file.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="text-[var(--text-muted)] hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRefs[index].current?.click()}
                  className="flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-primary/5 border border-dashed border-primary/30 rounded-lg h-8 sm:h-9 hover:bg-primary/10 hover:border-primary transition-all group"
                  title={t.fileLimit}
                >
                  <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/60 group-hover:text-primary" />
                  <span className="text-[9px] sm:text-[10px] text-primary/70 group-hover:text-primary font-bold">{t.uploadRef}</span>
                </button>
              )}
            </div>
          ))}

          <div className="relative">
            {pastedText ? (
              <div
                onClick={() => setIsPasteModalOpen(true)}
                className="flex items-center gap-1.5 px-2 py-1 bg-secondary/10 border border-secondary/30 rounded-lg h-8 sm:h-9 max-w-[100px] sm:max-w-[120px] cursor-pointer"
              >
                <ClipboardList className="w-3.5 h-3.5 text-secondary shrink-0" />
                <span className="text-[9px] sm:text-[10px] text-secondary font-bold truncate">
                  {t.pastedText}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPastedText('');
                  }}
                  className="text-[var(--text-muted)] hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsPasteModalOpen(true)}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-secondary/5 border border-dashed border-secondary/30 rounded-lg h-8 sm:h-9 hover:bg-secondary/10 hover:border-secondary transition-all group"
                title={t.pasteModalTitle}
              >
                <ClipboardList className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-secondary/60 group-hover:text-secondary" />
                <span className="text-[9px] sm:text-[10px] text-secondary/70 group-hover:text-secondary font-bold">{t.pasteRef}</span>
              </button>
            )}
          </div>

          {/* Negative Prompt Slot */}
          <div className="relative">
            {project?.negativePrompt ? (
              <div
                onClick={() => setIsNegativePromptModalOpen(true)}
                className="flex items-center gap-1.5 px-2 py-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg h-8 sm:h-9 max-w-[100px] sm:max-w-[120px] cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span className="text-[9px] sm:text-[10px] text-red-700 dark:text-red-400 font-bold truncate">
                  {t.negPromptActive}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateProject({ negativePrompt: '' });
                  }}
                  className="text-[var(--text-muted)] hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsNegativePromptModalOpen(true)}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-red-50 dark:bg-red-900/10 border border-dashed border-red-200 dark:border-red-900/20 rounded-lg h-8 sm:h-9 hover:bg-red-100 dark:hover:bg-red-900/20 hover:border-red-400 transition-all group"
                title={t.negPromptTitle}
              >
                <Ban className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400 group-hover:text-red-600" />
                <span className="text-[9px] sm:text-[10px] text-red-500 group-hover:text-red-700 font-bold">{t.negativePrompt}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-6">
          {cards.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-[var(--border-main)] rounded-2xl">
              <p className="text-[var(--text-muted)]">{t.noCards}</p>
            </div>
          ) : (
            cards.map((card, index) => (
              <CardItem
                key={card.id}
                card={card}
                index={index}
                isDragging={draggedCardIndex === index}
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                onUpdate={(updates) => onUpdateCard(card.id, updates)}
                onDelete={() => onDeleteCard(card.id)}
                lang={lang}
                t={t}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
