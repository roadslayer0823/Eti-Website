import React, { useState, useEffect } from 'react';
import { Project, ProjectType } from '../types';
import { Plus, FolderOpen, BookOpen, FileText, UserCircle, ArrowRight, Trash2, Languages, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { Language } from '../translations';
import SessionTimer from './SessionTimer';

interface ProjectSetupProps {
  onProjectSelect: (project: Project, existingCards?: any[], existingMessages?: any[]) => void;
  onDeleteProject: (id: string) => void;
  lang: Language;
  onLangChange: (lang: Language) => void;
  t: any;
}

export default function ProjectSetup({ onProjectSelect, onDeleteProject, lang, onLangChange, t }: ProjectSetupProps) {
  const [view, setView] = useState<'selection' | 'create'>('selection');
  const [projectName, setProjectName] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState(lang === 'zh' ? '中一' : 'Grade 7');
  const [type, setType] = useState<ProjectType>('lesson_plan');
  const [savedProjects, setSavedProjects] = useState<{project: Project, cards: any[], messages: any[]}[]>([]);
  const [token, setToken] = useState<string | null>(localStorage.getItem('eti_jwt_token'));

  const GRADES = lang === 'zh' ? [
    '小一', '小二', '小三', '小四', '小五', '小六',
    '中一', '中二', '中三', '中四', '中五', '中六'
  ] : [
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
    'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
  ];

  useEffect(() => {
    const projects = JSON.parse(localStorage.getItem('ai_teaching_projects') || '[]');
    setSavedProjects(projects);
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !subject || !grade) return;

    const newProject: Project = {
      id: uuidv4(),
      name: projectName,
      subject,
      grade,
      type,
      createdAt: Date.now()
    };

    onProjectSelect(newProject);
  };

  const handleLoad = (item: {project: Project, cards: any[], messages: any[]}) => {
    onProjectSelect(item.project, item.cards, item.messages);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedProjects.filter(p => p.project.id !== id);
    setSavedProjects(updated);
    onDeleteProject(id);
  };

  return (
    <div className="fixed inset-0 bg-[var(--bg-main)] z-50 overflow-y-auto flex flex-col items-center justify-start md:justify-center p-4 sm:p-6 transition-colors duration-200 custom-scrollbar">
      <button 
        onClick={() => window.location.href = 'https://portal.eti.com.hk/landing/'}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 p-2 sm:p-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl text-[var(--text-muted)] hover:text-primary hover:border-primary/50 transition-all shadow-sm z-10"
        title="Back to ETI Portal"
      >
        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
      <SessionTimer token={token} className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 sm:p-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-sm z-10" />

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center my-4 md:my-0">
        {/* Left Side: Branding */}
        <div className="space-y-4 sm:space-y-6 text-left mt-12 md:mt-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
              <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-main)] leading-tight">
              {t.appName}<br />
              <span className="text-primary">{t.appSubName}</span>
            </h1>
          </div>
          <p className="text-[var(--text-muted)] text-base sm:text-lg">
            {t.tagline}
          </p>
          
          <div className="flex flex-col gap-3 pt-2 sm:pt-4">
            <div className="flex gap-2">
              <button 
                onClick={() => setView('create')}
                className={cn(
                  "flex-1 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base",
                  view === 'create' ? "bg-primary text-white shadow-primary/20" : "bg-[var(--bg-card)] text-[var(--text-main)] border-2 border-[var(--border-main)] hover:border-primary/50"
                )}
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                {t.createProject}
              </button>
              <button 
                onClick={() => onLangChange(lang === 'zh' ? 'en' : 'zh')}
                className="px-4 sm:px-6 py-3 sm:py-4 rounded-2xl bg-[var(--bg-card)] text-[var(--text-main)] border-2 border-[var(--border-main)] hover:border-primary/50 transition-all flex items-center justify-center gap-2"
                title="切換語言 / Switch Language"
              >
                <Languages className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-[10px] sm:text-xs font-bold uppercase">{lang === 'zh' ? 'EN' : '繁'}</span>
              </button>
            </div>
            <button 
              onClick={() => setView('selection')}
              className={cn(
                "w-full px-4 sm:px-6 py-3 sm:py-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 text-sm sm:text-base",
                view === 'selection' ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-[var(--bg-card)] text-[var(--text-main)] border-2 border-[var(--border-main)] hover:border-primary/50"
              )}
            >
              <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5" />
              {t.loadProject}
            </button>
          </div>
        </div>

        {/* Right Side: Content Area */}
        <div className="bg-[var(--bg-sidebar)] rounded-3xl p-6 sm:p-8 border border-[var(--border-main)] min-h-[400px] sm:min-h-[480px] flex flex-col mb-4 md:mb-0">
          {view === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-5">
              <h2 className="text-2xl font-bold text-[var(--text-main)]">{t.createProject}</h2>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{t.projectName}</label>
                <input 
                  type="text" 
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder={lang === 'zh' ? "例如：中一中文《背影》單元" : "e.g. Form 1 Chinese Unit"}
                  className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm text-[var(--text-main)]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{t.subject}</label>
                <input 
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={lang === 'zh' ? "例如：中文科、數學科..." : "e.g. Chinese, Math..."}
                  className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm text-[var(--text-main)]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{t.grade}</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g)}
                      className={cn(
                        "py-1.5 rounded-lg border text-[10px] font-bold transition-all",
                        grade === g 
                          ? "border-primary bg-primary text-white" 
                          : "border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-primary/50"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{t.type}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'lesson_plan', label: t.lessonPlan, icon: FileText },
                    { id: 'handout', label: t.handout, icon: BookOpen },
                    { id: 'student_notes', label: t.studentNotes, icon: UserCircle },
                  ].map((t_item) => (
                    <button
                      key={t_item.id}
                      type="button"
                      onClick={() => setType(t_item.id as ProjectType)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all",
                        type === t_item.id 
                          ? "border-primary bg-primary/5 text-primary" 
                          : "border-transparent bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-[var(--border-main)]"
                      )}
                    >
                      <t_item.icon className="w-5 h-5" />
                      <span className="text-[10px] font-bold">{t_item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-primary/20"
              >
                {t.startDesign}
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          ) : (
            <div className="space-y-4 flex-1 flex flex-col">
              <h2 className="text-2xl font-bold text-[var(--text-main)]">{t.loadProject}</h2>
              {savedProjects.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] space-y-2">
                  <FolderOpen className="w-12 h-12 opacity-20" />
                  <p className="text-sm">{t.noProjects}</p>
                  <button 
                    onClick={() => setView('create')}
                    className="text-primary text-sm font-bold hover:underline"
                  >
                    {t.createFirst}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[380px] pr-2 custom-scrollbar">
                  {[...savedProjects].sort((a, b) => (b.project.createdAt || 0) - (a.project.createdAt || 0)).map((item) => (
                    <div 
                      key={item.project.id}
                      onClick={() => handleLoad(item)}
                      className="group bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-main)] hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--bg-sidebar)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[var(--text-main)] text-sm">{item.project.name}</h3>
                          <p className="text-[10px] text-[var(--text-muted)]">{item.project.subject} • {item.project.grade} • {item.project.type === 'lesson_plan' ? t.lessonPlan : item.project.type === 'handout' ? t.handout : t.studentNotes}</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.project.id, e);
                        }}
                        className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        title={t.deleteProject || "Delete"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
