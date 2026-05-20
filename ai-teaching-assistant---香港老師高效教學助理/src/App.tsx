import React, { useState, useCallback, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import CardEditor from './components/CardEditor';
import ProjectSetup from './components/ProjectSetup';
import SessionTimer from './components/SessionTimer';
import { Card, Message, Project, ReferenceData, ReferenceFile } from './types';
import { chatWithAI } from './services/gemini';
import { v4 as uuidv4 } from 'uuid';
import { LogOut, Sun, Moon, Languages, ArrowLeft } from 'lucide-react';
import { translations, Language } from './translations';
import { cn } from './lib/utils';

// Helper to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
};

// Helper to convert base64 to File object
const base64ToFile = (base64: string, name: string, type: string): File => {
  const byteString = atob(base64.split(',')[1]);
  const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new File([ab], name, { type: type || mimeString });
};

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  isDestructive?: boolean;
}

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isDestructive = false
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[var(--bg-card)] rounded-2xl w-full max-w-md shadow-2xl border border-[var(--border-main)] overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">{title}</h3>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">{message}</p>
        </div>
        <div className="p-4 bg-[var(--bg-sidebar)] border-t border-[var(--border-main)] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-main)] rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              "px-6 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-sm",
              isDestructive ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : "bg-primary hover:bg-primary/90 shadow-primary/20"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [files, setFiles] = useState<(File | null)[]>([null, null]);
  const [pastedText, setPastedText] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [lang, setLang] = useState<Language>('zh');
  const [token, setToken] = useState<string | null>(localStorage.getItem('eti_jwt_token'));

  // Confirmation state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const t = translations[lang];

  // Check authentication on mount
  useEffect(() => {
    const checkAuthentication = async () => {
      // First check localStorage for token
      let token = localStorage.getItem('eti_jwt_token');

      // If not in localStorage, check URL parameter
      if (!token) {
        const urlParams = new URLSearchParams(window.location.search);
        token = urlParams.get('token');
      }

      if (!token) {
        // No token provided, redirect to ETI portal
        window.location.href = 'https://portal.eti.com.hk/landing/';
        return;
      }

      try {
        // Validate token with ETI auth API
        const response = await fetch('https://auth.eti.com.hk/api/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          setIsAuthenticated(true);
          // Store token for future API calls
          localStorage.setItem('eti_jwt_token', token);
          // Remove token from URL if present
          if (window.location.search.includes('token=')) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else {
          // Invalid token, redirect to ETI portal
          localStorage.removeItem('eti_jwt_token');
          window.location.href = 'https://portal.eti.com.hk/landing/';
        }
      } catch (error) {
        console.error('Authentication failed:', error);
        // On error, redirect to ETI portal
        window.location.href = 'https://portal.eti.com.hk/landing/';
      }
    };

    checkAuthentication();
  }, []);

  // Apply theme to body
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Auto-save project to localStorage (including references)
  useEffect(() => {
    const saveProject = async () => {
      if (project) {
        const savedProjects = JSON.parse(localStorage.getItem('ai_teaching_projects') || '[]');
        const index = savedProjects.findIndex((p: any) => p.project.id === project.id);

        // Convert files to base64 for storage
        const filePromises = files.map(async (file) => {
          if (!file) return null;
          return {
            name: file.name,
            type: file.type,
            content: await fileToBase64(file)
          } as ReferenceFile;
        });

        const referenceFiles = await Promise.all(filePromises);
        const references: ReferenceData = {
          files: referenceFiles,
          pastedText: pastedText
        };

        const projectWithRefs = { ...project, references };
        const projectData = { project: projectWithRefs, cards, messages };

        if (index >= 0) {
          savedProjects[index] = projectData;
        } else {
          savedProjects.push(projectData);
        }

        localStorage.setItem('ai_teaching_projects', JSON.stringify(savedProjects));
      }
    };

    saveProject();
  }, [project, cards, messages, files, pastedText]);

  const handleProjectSelect = (selectedProject: Project, existingCards?: Card[], existingMessages?: Message[]) => {
    setProject(selectedProject);
    setCards(existingCards || []);
    setMessages(existingMessages || []);

    // Restore references if they exist
    if (selectedProject.references) {
      // Restore pasted text
      setPastedText(selectedProject.references.pastedText || '');

      // Restore files from base64
      const restoredFiles = selectedProject.references.files.map((refFile) => {
        if (!refFile) return null;
        return base64ToFile(refFile.content, refFile.name, refFile.type);
      });
      setFiles(restoredFiles);
    } else {
      // Reset if no references
      setFiles([null, null]);
      setPastedText('');
    }
  };

  const handleExitProject = () => {
    setConfirmConfig({
      isOpen: true,
      title: t.exitProject,
      message: t.exitConfirm,
      onConfirm: () => {
        setProject(null);
        setCards([]);
        setMessages([]);
      }
    });
  };

  const parseCardsFromContent = (content: string): Card[] => {
    const cardRegex = /:::CARD_START:::([\s\S]*?):::CARD_END:::/g;
    const matches = [...content.matchAll(cardRegex)];
    const newCards: Card[] = [];

    for (const match of matches) {
      try {
        const cardData = JSON.parse(match[1]);
        newCards.push({
          id: uuidv4(),
          title: cardData.title || (lang === 'zh' ? '未命名卡片' : 'Untitled Card'),
          type: cardData.type || 'content_block',
          content: cardData.content || '',
          suggestions: cardData.suggestions || [],
          status: 'draft'
        });
      } catch (e) {
        console.error('Failed to parse card JSON:', e);
      }
    }

    return newCards;
  };

  const handleSendMessage = async (content: string, displayContent?: string) => {
    const newUserMessage: Message = { role: 'user', content, displayContent };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const aiResponse = await chatWithAI(updatedMessages, lang, project || undefined);
      if (aiResponse) {
        const newAssistantMessage: Message = { role: 'assistant', content: aiResponse };
        setMessages(prev => [...prev, newAssistantMessage]);

        const extractedCards = parseCardsFromContent(aiResponse);
        if (extractedCards.length > 0) {
          setCards(prev => [...prev, ...extractedCards]);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: t.error }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCard = (id: string, updates: Partial<Card>) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleDeleteCard = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const handleReorderCards = (newCards: Card[]) => {
    setCards(newCards);
  };

  const handleUpdateProject = (updates: Partial<Project>) => {
    setProject(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleResetReferences = () => {
    setFiles([null, null]);
    setPastedText('');
  };

  const handleClearCards = () => {
    setConfirmConfig({
      isOpen: true,
      title: t.clearCards,
      message: t.deleteConfirm, // Or a specific message for clearing cards
      isDestructive: true,
      onConfirm: () => {
        setCards([]);
      }
    });
  };

  const handleDeleteProject = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: t.deleteProject,
      message: t.deleteConfirm,
      isDestructive: true,
      onConfirm: () => {
        const savedProjects = JSON.parse(localStorage.getItem('ai_teaching_projects') || '[]');
        const updated = savedProjects.filter((p: any) => p.project.id !== id);
        localStorage.setItem('ai_teaching_projects', JSON.stringify(updated));

        // If we are currently in the deleted project, exit it
        if (project && project.id === id) {
          setProject(null);
          setCards([]);
          setMessages([]);
        }
      }
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center font-sans text-[var(--text-main)] bg-[var(--bg-main)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)]">驗證身份中... / Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse lg:flex-row h-screen lg:overflow-hidden font-sans text-[var(--text-main)] bg-[var(--bg-main)]">
      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.isDestructive ? t.confirmDelete : t.confirm}
        cancelText={t.cancel}
        isDestructive={confirmConfig.isDestructive}
      />
      {!project && (
          <ProjectSetup
            onProjectSelect={handleProjectSelect}
            onDeleteProject={handleDeleteProject}
            lang={lang}
            onLangChange={setLang}
            t={t}
          />
      )}

      {/* Sidebar: Chat (Left on Desktop, Bottom on Mobile) */}
      <div className="w-full lg:w-[400px] h-[350px] sm:h-[400px] lg:h-full flex-shrink-0 flex flex-col bg-[var(--bg-sidebar)] lg:border-r border-[var(--border-main)] overflow-hidden">
        {project && (
          <div className="p-4 bg-[var(--bg-sidebar)] border-b border-[var(--border-main)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-sm font-bold text-[var(--text-main)] truncate max-w-[150px] sm:max-w-xs text-left">
                  {project.name}
                </h1>
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">
                  {project.subject} • {project.grade} •{" "}
                  {project.type === "lesson_plan"
                    ? t.lessonPlan
                    : project.type === "handout"
                      ? t.handout
                      : t.studentNotes}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLang(lang === "zh" ? "en" : "zh")}
                className="p-1 sm:p-2 text-[var(--text-muted)] hover:text-primary hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all"
                title="切換語言 / Switch Language"
              >
                <Languages className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="p-1 sm:p-2 text-[var(--text-muted)] hover:text-primary hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all"
                title={theme === "light" ? "Dark Mode" : "Light Mode"}
              >
                {theme === "light" ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={handleExitProject}
                className="p-1 sm:p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title={t.exitProject}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            files={files}
            pastedText={pastedText}
            onResetReferences={handleResetReferences}
            lang={lang}
            t={t}
            token={token}
          />
        </div>
      </div>

      {/* Main Content: Card Editor (Right on Desktop, Top on Mobile) */}
      <div className="flex-1 min-w-0 border-b lg:border-b-0 border-[var(--border-main)] overflow-hidden">
        <CardEditor
          cards={cards}
          project={project}
          onUpdateCard={handleUpdateCard}
          onDeleteCard={handleDeleteCard}
          onReorderCards={handleReorderCards}
          files={files}
          setFiles={setFiles}
          pastedText={pastedText}
          setPastedText={setPastedText}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProject}
          onClearCards={handleClearCards}
          lang={lang}
          t={t}
        />
      </div>
    </div>
  );
}
