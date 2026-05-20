(function () {
    // app.js

    // --- Global State ---
    let pyodideInstance = null;
    let currentStageId = null;
    let currentMode = 'learn';
    let currentChapter = 1;
    let selectedCourseId = null;
    let viewHistory = [];
    const STAGES_PER_CHAPTER = 8;

    const DEFAULT_AUTH_API_BASE = localStorage.getItem('eti_auth_api_base_default') || 'https://auth.eti.com.hk';
    const DEFAULT_CODING_API_BASE = localStorage.getItem('eti_lesson_api_base') || localStorage.getItem('eti_coding_api_base_default') || 'https://code.eti.com.hk';
    const AUTH_API_BASE = (localStorage.getItem('eti_auth_api_base') || DEFAULT_AUTH_API_BASE).replace(/\/$/, '');
    const CODING_API_BASE = (localStorage.getItem('eti_coding_api_base') || DEFAULT_CODING_API_BASE).replace(/\/$/, '');
    const PROFILE_API_URL = `${AUTH_API_BASE}/api/profile`;
    const PROGRESS_API_URL = `${CODING_API_BASE}/api/progress`;
    const LOGOUT_API_URL = `${AUTH_API_BASE}/api/logout`;
    const LESSON_CONTENT_API_URL = `${CODING_API_BASE}/api/lesson-content`;

    window.setAuthApiBase = function setAuthApiBase(baseUrl) {
        if (!baseUrl || !baseUrl.trim()) return;
        localStorage.setItem('eti_auth_api_base', baseUrl.trim().replace(/\/$/, ''));
        window.location.reload();
    };
    window.setCodingApiBase = function setCodingApiBase(baseUrl) {
        if (!baseUrl || !baseUrl.trim()) return;
        localStorage.setItem('eti_coding_api_base', baseUrl.trim().replace(/\/$/, ''));
        window.location.reload();
    };
    window.setLessonApiBase = window.setCodingApiBase;
    window.resetApiBases = function resetApiBases() {
        localStorage.removeItem('eti_auth_api_base');
        localStorage.removeItem('eti_coding_api_base');
        localStorage.removeItem('eti_lesson_api_base');
        window.location.reload();
    };

    // --- JSON Content Support ---
    let jsonStages = {};
    let useJsonContent = false;

    // --- Course List Data ---
    const courseList = {
        'python': {
            title: 'Python Quest',
            tag: 'Master the Serpent',
            icon: 'fa-brands fa-python',
            description: 'Embark on an epic journey to master Python. From the basics of printing to advanced AI integration, this course guided by stages will make you a pro.',
            highlights: ['Interactive Stages', 'Python Console', 'AI Code Review', 'Real-time Logic'],
            entryPath: 'map'
        },
        'csharp': {
            title: 'C# Vanguard',
            tag: 'Next Gen Systems',
            icon: 'fa-solid fa-hashtag',
            description: 'Deep dive into the world of .NET and system architecture. Perfect for game development with Unity and robust enterprise applications.',
            highlights: ['OOP mastery', 'Unity Integration', 'Type Safety', 'High Performance'],
            entryPath: 'direct'
        },
        'cpp': {
            title: 'C++ Architect',
            tag: 'Core Power',
            icon: 'fa-solid fa-c',
            description: 'The foundation of modern computing. C++ gives you the power to build operating systems, game engines, and high-performance software.',
            highlights: ['Memory Management', 'Pointers & References', 'Templates', 'Speed Optimization'],
            entryPath: 'direct'
        }
    };

    // AI Backend URLs
    const AI_BASE_URL = 'https://gacha-girls.co:8080';
    const AI_LOGIN_URL = `${AI_BASE_URL}/api/program/login`;
    const AI_CHAT_URL = `${AI_BASE_URL}/api/program/chat`;
    let aiToken = null;

    // --- DOM Elements ---
    const viewLogin = document.getElementById('view-login');
    const gameContainer = document.getElementById('game-container');
    const viewCourseSelection = document.getElementById('view-course-selection');
    const courseItemsEl = document.getElementById('course-items');
    const courseIntroContentEl = document.getElementById('course-intro-content');
    const introActionsEl = document.querySelector('.intro-actions');
    const btnEnterCourse = document.getElementById('btn-enter-course');
    const btnBackCourses = document.getElementById('btn-back-courses');

    const viewMap = document.getElementById('view-map');
    const viewStage = document.getElementById('view-stage');
    const stageNodesWrapper = document.getElementById('stage-nodes-wrapper');
    const btnPrevChapter = document.getElementById('btn-prev-chapter');
    const btnNextChapter = document.getElementById('btn-next-chapter');
    const currentChapterNameEl = document.getElementById('current-chapter-name');
    const chapterRangeEl = document.getElementById('chapter-range');
    const inputJumpStage = document.getElementById('input-jump-stage');
    const btnJumpStage = document.getElementById('btn-jump-stage');

    // Payment Elements
    const paymentOverlay = document.getElementById('payment-overlay');
    const paymentStageTitle = document.getElementById('payment-stage-title');
    const btnPayNow = document.getElementById('btn-pay-now');
    const btnCancelPayment = document.getElementById('btn-cancel-payment');

    // btnBackMap removed — header back button handles all navigation
    const btnSignOut = document.getElementById('btn-signout');
    const stageTitleEl = document.getElementById('stage-title');

    // Left Panel Modes
    const learningContentEl = document.getElementById('learning-content');
    const codingInstructionsEl = document.getElementById('coding-instructions');
    const codingPromptEl = document.getElementById('coding-prompt');
    const expectedOutputTextEl = document.getElementById('expected-output-text');

    // Right Panel Modes
    const mcqContainer = document.getElementById('mcq-container');
    const editorContainer = document.getElementById('editor-container');
    const mcqQuestionEl = document.getElementById('mcq-question');
    const mcqOptionsEl = document.getElementById('mcq-options');
    const mcqFeedbackEl = document.getElementById('mcq-feedback');
    const headerXpInfo = document.getElementById('header-xp-info');

    // Python Editor
    const codeEditor = document.getElementById('code-editor');
    const consoleOutput = document.getElementById('console-output');
    const btnRun = document.getElementById('btn-run');
    const editorFeedbackEl = document.getElementById('editor-feedback');

    // AI Chat Elements
    const aiChatbox = document.getElementById('ai-chatbox');
    const aiChatBubble = document.getElementById('ai-chat-bubble');
    const btnCloseChat = document.getElementById('btn-close-chat');
    const btnSendChat = document.getElementById('btn-send-chat');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    async function checkAuth() {
        // First check for token in URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        
        if (urlToken) {
            // Validate URL token with ETI auth API
            try {
                const res = await fetch(PROFILE_API_URL, {
                    headers: { 'Authorization': `Bearer ${urlToken}` }
                });

                if (res.ok) {
                    // Token is valid, store it in localStorage
                    localStorage.setItem('eti_jwt_token', urlToken);
                    // Remove token from URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                    console.log('🟢 checkAuth: URL token validated successfully');
                    return true;
                } else {
                    console.log('🔴 checkAuth: URL token validation failed.');
                    window.location.href = 'https://portal.eti.com.hk/landing/';
                    return false;
                }
            } catch (e) {
                console.error('URL token validation failed:', e);
                window.location.href = 'https://portal.eti.com.hk/landing/';
                return false;
            }
        }

        // Fall back to localStorage token
        const token = localStorage.getItem('eti_jwt_token');
        if (!token) {
            window.location.href = 'https://portal.eti.com.hk/landing/';
            return false;
        }

        if (btnBackCourses) {
            btnBackCourses.style.display = 'flex';
        }

        try {
            const res = await fetch(PROFILE_API_URL, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            /*if (!res.ok) {
                console.log('🔴 checkAuth: Token validation failed.');
                localStorage.removeItem('eti_jwt_token');
                window.location.href = 'https://portal.eti.com.hk/landing/';
                return false;
            }*/

            const data = await res.json();
            console.log('🟢 checkAuth: Authentication successful');
            return true;
        } catch (e) {
            console.error('Auth verification failed:', e);
            return true; // Continue if there's a temporary network error
        }
    }

    // --- Initialization ---
    
    // JWT Decode and Timer Logic
    function decodeJWT(token) {
        try {
            const payload = token.split('.')[1];
            return JSON.parse(atob(payload));
        } catch (e) {
            return null;
        }
    }

    let sessionCountdownInterval = null;

    function updateTimerUI(exp, isUnlimited) {
        const timerEl = document.getElementById('session-timer');
        const timeSpan = document.getElementById('time-remaining');
        
        if (!timerEl || !timeSpan) return;

        const currentToken = localStorage.getItem('eti_jwt_token');
        if (!currentToken) {
            timerEl.style.display = 'none';
            if (sessionCountdownInterval) clearInterval(sessionCountdownInterval);
            return;
        }

        timerEl.style.display = 'flex';
        
        if (sessionCountdownInterval) clearInterval(sessionCountdownInterval);

        if (isUnlimited || !exp) {
            timeSpan.textContent = 'Unlimited';
            return;
        }
        
        sessionCountdownInterval = setInterval(() => {
            const now = Math.floor(Date.now() / 1000);
            const diff = exp - now;
            
            if (diff <= 0) {
                timeSpan.textContent = '00:00';
                clearInterval(sessionCountdownInterval);
                localStorage.removeItem('eti_jwt_token');
                window.location.href = 'https://portal.eti.com.hk/landing/';
                return;
            }

            const mins = Math.floor(diff / 60).toString().padStart(2, '0');
            const secs = (diff % 60).toString().padStart(2, '0');
            timeSpan.textContent = `${mins}:${secs}`;
        }, 1000);
    }

    async function init() {
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) return;

        // Initialize Session Timer
        const currentToken = localStorage.getItem('eti_jwt_token');
        if (currentToken) {
            const decoded = decodeJWT(currentToken);
            if (decoded) {
                updateTimerUI(decoded.exp, decoded.isUnlimited);
            }
        }

        initEventListeners();
        await initPyodide();
        await loadJsonContent(); // Load JSON content
        await loadUserState(); // Load progress from server
        initAIChat();

        // AI Backend Test (Optional, but keeping for now)
        await testAIBackend();

        // Start App directly
        startApp();
    }

    // --- JSON Content Loading Functions ---
    async function loadJsonContent() {
        try {
            jsonStages = {};
            useJsonContent = false;

            // Check if we're in preview mode
            const urlParams = new URLSearchParams(window.location.search);
            const isPreview = urlParams.get('preview') === 'true';

            if (isPreview) {
                // Load preview lesson from localStorage
                const previewLesson = localStorage.getItem('previewLesson');
                if (previewLesson) {
                    const lessonData = JSON.parse(previewLesson);
                    convertJsonToStages(lessonData);
                    useJsonContent = true;
                    return;
                }
            }

            // Try to load lessons from server first
            const serverLessons = await loadLessonsFromServer();
            if (serverLessons.length > 0) {
                serverLessons.forEach((lessonData) => convertJsonToStages(lessonData));
                normalizeJsonStageState();
                if (Object.keys(jsonStages).length > 0) {
                    useJsonContent = true;
                    console.log('JSON content loaded from server successfully');
                    return;
                }
            }

            console.log('No JSON lessons returned by server. Falling back to CSV data only.');
        } catch (error) {
            console.log('JSON content not available, using CSV data:', error);
            useJsonContent = false;
        }
    }

    async function loadLessonsFromServer() {
        const token = localStorage.getItem('eti_jwt_token');
        if (!token) {
            return [];
        }

        const cachedLessons = localStorage.getItem('cached_lessons');
        const cachedEtag = localStorage.getItem('cached_lessons_etag');

        try {
            const fetchOptions = {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            };

            if (cachedEtag && cachedLessons) {
                fetchOptions.headers['If-None-Match'] = cachedEtag;
            }

            const response = await fetch(LESSON_CONTENT_API_URL, fetchOptions);

            if (response.status === 304 && cachedLessons) {
                console.log('JSON data unchanged. Loading from local cache.');
                return JSON.parse(cachedLessons);
            }

            if (!response.ok) {
                return cachedLessons ? JSON.parse(cachedLessons) : [];
            }

            const newEtag = response.headers.get('ETag');
            if (newEtag) localStorage.setItem('cached_lessons_etag', newEtag);

            const data = await response.json();
            const lessons = Array.isArray(data.lessons) ? data.lessons : [];
            localStorage.setItem('cached_lessons', JSON.stringify(lessons));
            return lessons;
        } catch (error) {
            console.warn('Failed to load lessons from server:', error);
            return cachedLessons ? JSON.parse(cachedLessons) : [];
        }
    }

    function convertJsonToStages(lessonData) {
        // Convert JSON lesson format to the existing stage format
        const stage = {
            stageId: lessonData.id,
            title: lessonData.title,
            description: lessonData.description,
            difficulty: lessonData.difficulty || 1,
            readingMaterial: lessonData.readingMaterial || [],
            questions: lessonData.questions || [],
            mcq: [],
            codingChallenge: null,
            locked: true,
            completed: false,
            paid: false
        };

        // Separate MCQ and coding questions
        if (lessonData.questions) {
            lessonData.questions.forEach((question, index) => {
                if (question.type === 'mcq') {
                    stage.mcq.push({
                        question: question.question,
                        options: question.options,
                        correct: question.correctAnswer,
                        explanation: question.explanation
                    });
                } else if (question.type === 'coding') {
                    stage.codingChallenge = {
                        prompt: question.question,
                        preCode: question.preCode || '',
                        exactInput: question.solution, // Support exact code matching
                        solution: question.solution,
                        explanation: question.explanation
                    };
                }
            });
        }

        jsonStages[lessonData.id] = stage;
    }

    // --- JSON Content Rendering Functions ---
    function renderJsonReadingMaterial(readingMaterial) {
        if (!Array.isArray(readingMaterial) || readingMaterial.length === 0) {
            return '<p>No reading material available.</p>';
        }

        return readingMaterial.map(item => {
            switch (item.type) {
                case 'text':
                    return renderJsonText(item);
                case 'heading':
                    return `<h3 class="lesson-heading" style="${renderStyle(item.style)}">${escapeHtml(item.text || '')}</h3>`;
                case 'image':
                    return renderJsonImage(item);
                case 'table':
                    return renderJsonTable(item);
                case 'list':
                    return renderJsonList(item);
                case 'code':
                    return renderJsonCodeBlock(item);
                default:
                    return `<p>Unknown content type: ${item.type}</p>`;
            }
        }).join('');
    }

    function renderJsonText(item) {
        const inlineStyle = renderStyle(item.style);

        if (item.html && item.html.trim()) {
            return `<div class="lesson-text" style="${inlineStyle}">${item.html}</div>`;
        }

        return `<p class="lesson-text" style="${inlineStyle}">${escapeHtml(item.text || '')}</p>`;
    }

    function renderJsonImage(item) {
        const imageWidth = item.width || '100%';
        return `
            <figure class="image-block" style="text-align: ${item.alignment || 'center'};">
                <img class="lesson-image" src="${item.src}" alt="${escapeHtml(item.alt || '')}" style="width: ${imageWidth};">
                ${item.caption ? `<figcaption class="lesson-caption">${escapeHtml(item.caption)}</figcaption>` : ''}
            </figure>
        `;
    }

    function renderJsonCodeBlock(item) {
        return `
            <pre style="background: #2c3e50; color: #ecf0f1; padding: 1.5rem; border-radius: 8px; overflow-x: auto; margin: 1rem 0;">
                <code>${escapeHtml(item.code || item.text || '')}</code>
            </pre>
        `;
    }

    function renderStyle(style) {
        if (!style) return '';
        return Object.entries(style).map(([key, value]) =>
            `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`
        ).join('; ');
    }

    function renderJsonTable(tableData) {
        if (!tableData.headers || !tableData.rows) {
            return '<p>Invalid table data</p>';
        }

        const style = tableData.style || {};
        const textAlign = style.textAlign || 'left';
        const fontStyle = style.fontStyle || 'normal';
        const fontWeight = style.fontWeight || '400';
        const headerBg = style.headerBg || '#334466';
        const zebra = style.zebra !== false;
        const bordered = style.bordered !== false;
        const borderStyle = bordered ? '1px solid rgba(255, 255, 255, 0.16)' : 'none';

        const headers = tableData.headers.map(header => `
            <th style="padding: 10px 12px; text-align: ${textAlign}; border: ${borderStyle}; color: #ffffff; background: ${headerBg}; font-style: ${fontStyle}; font-weight: ${fontWeight};">
                ${escapeHtml(String(header))}
            </th>
        `).join('');

        const rows = tableData.rows.map((row, rowIndex) => {
            const cells = Array.isArray(row) ? row : [row];
            const rowBg = zebra && rowIndex % 2 === 1 ? 'rgba(255, 255, 255, 0.03)' : 'transparent';
            return `<tr style="background: ${rowBg};">${cells.map(cell => `
                <td style="padding: 10px 12px; text-align: ${textAlign}; border: ${borderStyle}; color: rgba(255, 255, 255, 0.9); font-style: ${fontStyle}; font-weight: ${fontWeight};">
                    ${escapeHtml(String(cell))}
                </td>
            `).join('')}</tr>`;
        }).join('');

        return `
            <div class="table-container" style="overflow-x: auto; margin: 1.5rem 0; border-radius: 8px;">
                <table class="lesson-table" style="width: 100%; border-collapse: collapse; border: ${borderStyle}; background: rgba(255,255,255,0.05);">
                    <thead><tr>${headers}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    function renderJsonList(listData) {
        if (!listData.items) {
            return '<p>Invalid list data</p>';
        }

        const tag = listData.ordered ? 'ol' : 'ul';
        const items = listData.items.map(item => `<li>${escapeHtml(String(item))}</li>`).join('');

        return `<${tag} class="list-block" style="margin: 1rem 0 1rem 2.5rem; padding-left: 0;">${items}</${tag}>`;
    }

    function getOrderedJsonStageIds() {
        return Object.keys(jsonStages).sort((a, b) => compareStageIds(a, b));
    }

    function normalizeJsonStageState() {
        const stageIds = getOrderedJsonStageIds();
        if (stageIds.length === 0) {
            return;
        }

        const hasUnlockedStage = stageIds.some((stageId) => jsonStages[stageId]?.locked === false);
        if (!hasUnlockedStage) {
            const firstIncompleteStageId = stageIds.find((stageId) => !jsonStages[stageId]?.completed) || stageIds[0];
            stageIds.forEach((stageId) => {
                const isCurrent = stageId === firstIncompleteStageId;
                jsonStages[stageId].locked = isCurrent ? false : !jsonStages[stageId].completed;
                jsonStages[stageId].paid = isCurrent || !!jsonStages[stageId].completed;
            });
        }

        // Set paid status: stages 1-8 are free, stages 9-16 require payment
        stageIds.forEach((stageId, idx) => {
            if (jsonStages[stageId].completed) {
                jsonStages[stageId].paid = true;
            } else if (idx >= 8) {
                // Stage 9-16 (index 8+) require payment
                jsonStages[stageId].paid = false;
            } else {
                // Stages 1-8 (index 0-7) are free
                jsonStages[stageId].paid = true;
            }
        });
    }

    function compareStageIds(a, b) {
        const aParts = String(a).match(/\d+/g)?.map(Number) || [];
        const bParts = String(b).match(/\d+/g)?.map(Number) || [];
        const length = Math.max(aParts.length, bParts.length);

        for (let i = 0; i < length; i++) {
            const aValue = aParts[i] ?? -1;
            const bValue = bParts[i] ?? -1;
            if (aValue !== bValue) {
                return aValue - bValue;
            }
        }

        return String(a).localeCompare(String(b));
    }

    function renderJsonMCQOptions(mcqData) {
        mcqOptionsEl.innerHTML = '';
        if (!mcqData.options || !Array.isArray(mcqData.options)) {
            mcqOptionsEl.innerHTML = '<p>No options available</p>';
            return;
        }

        const isCompleted = jsonStages[currentStageId].completed;

        mcqData.options.forEach((option, index) => {
            const div = document.createElement('div');
            div.className = 'mcq-option';
            div.innerHTML = escapeHtml(option).replace(/\n/g, '<br>');
            
            // Only add click handler if stage is not completed
            if (!isCompleted) {
                const correctIndex = mcqData.correct !== undefined ? mcqData.correct : mcqData.correctAnswer;
                div.addEventListener('click', () => handleMCQAnswer(index, correctIndex, div));
            } else {
                // Disable clicking for completed stages
                div.style.pointerEvents = 'none';
                div.style.opacity = '0.8';
            }
            
            mcqOptionsEl.appendChild(div);
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function startApp() {
        // Logic: Show game container (already visible in HTML now, but let's ensure)
        gameContainer.style.display = 'block';

        // Land on Course Selection
        renderCourseSelection();
        switchView(viewCourseSelection);
    }

    function resetApp() {
        // Reset Progress in memory
        resetCourseData();

        // Reset Header UI
        document.querySelector('.level-badge').textContent = 'Lvl 1';
        document.getElementById('header-xp').textContent = 'XP: 0/100';

        // Go back to course selection
        renderCourseSelection();
        switchView(viewCourseSelection);
    }

    async function loadUserState() {
        console.log("🔵 loadUserState: Starting to fetch progress from server...");
        const token = localStorage.getItem('eti_jwt_token');
        if (!token) {
            console.log("🔵 loadUserState: No token found. Aborting.");
            return;
        }

        try {
            const res = await fetch(PROGRESS_API_URL, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log("🔵 loadUserState: Server responded with status:", res.status);

            if (res.ok) {
                const data = await res.json();
                console.log("🔵 loadUserState: Received data from server:", data);
                if (data.progress) {
                    const saved = data.progress;

                    if (saved.xp !== undefined && saved.level !== undefined) {
                        document.getElementById('header-xp').textContent = `XP: ${saved.xp}/100`;
                        document.querySelector('.level-badge').textContent = `Lvl ${saved.level}`;
                        console.log("🔵 loadUserState: Updated XP and Level in UI.");
                    }

                    if (saved.stages && Array.isArray(saved.stages)) {
                        saved.stages.forEach(savedStage => {
                            if (jsonStages[savedStage.id]) {
                                jsonStages[savedStage.id].completed = savedStage.completed;
                                jsonStages[savedStage.id].locked = savedStage.locked;
                                if (savedStage.paid !== undefined) {
                                    jsonStages[savedStage.id].paid = savedStage.paid;
                                }
                                if (savedStage.selectedAnswer !== undefined) {
                                    jsonStages[savedStage.id].selectedAnswer = savedStage.selectedAnswer;
                                }
                                if (savedStage.typedCode !== undefined) {
                                    jsonStages[savedStage.id].typedCode = savedStage.typedCode;
                                }
                                if (savedStage.consoleOutput !== undefined) {
                                    jsonStages[savedStage.id].consoleOutput = savedStage.consoleOutput;
                                }
                            }
                        });
                        console.log("🔵 loadUserState: Updated Stage states.");
                    }
                } else {
                    console.log("🔵 loadUserState: Progress is null or empty on server.");
                }
            } else if (res.status === 401 || res.status === 403) {
                console.log("🔴 loadUserState: Token expired or invalid.");
                localStorage.removeItem('eti_jwt_token');
                window.location.href = 'https://portal.eti.com.hk/landing/';
            }
        } catch (e) {
            console.error('🔴 loadUserState: Failed to load progress from server:', e);
        }
    }

    async function saveUserState() {
        console.log("🟢 saveUserState: Preparing to save progress to server...");
        const token = localStorage.getItem('eti_jwt_token');
        if (!token) {
            console.log("🟢 saveUserState: No token found. Aborting.");
            return;
        }

        let currentXPText = document.getElementById('header-xp').textContent;
        let currentXP = parseInt(currentXPText.split(':')[1].split('/')[0]) || 0;
        let currentLevel = parseInt(document.querySelector('.level-badge').textContent.replace('Lvl ', '')) || 1;

        const progressData = {
            xp: currentXP,
            level: currentLevel,
            stages: Object.keys(jsonStages).map(stageId => ({
                id: stageId,
                completed: jsonStages[stageId].completed,
                locked: jsonStages[stageId].locked,
                paid: jsonStages[stageId].paid,
                selectedAnswer: jsonStages[stageId].selectedAnswer,
                typedCode: jsonStages[stageId].typedCode,
                consoleOutput: jsonStages[stageId].consoleOutput
            }))
        };
        console.log("🟢 saveUserState: Data payload to save:", progressData);

        try {
            const res = await fetch(PROGRESS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ progress: progressData })
            });

            console.log("🟢 saveUserState: Server responded with status:", res.status);
            if (res.ok) {
                const data = await res.json();
                console.log("🟢 saveUserState: Save successful:", data);
            } else {
                const error = await res.text();
                console.error("🟢 saveUserState: Save failed with error:", error);
            }
        } catch (e) {
            console.error('🔴 saveUserState: Failed to fetch/save progress to server:', e);
        }
    }

    function resetCourseData() {
        const stageIds = getOrderedJsonStageIds();
        stageIds.forEach((stageId, idx) => {
            jsonStages[stageId].completed = false;
            jsonStages[stageId].locked = idx === 0 ? false : true;
            jsonStages[stageId].paid = idx === stageIds.length - 1 ? false : true;
        });
        saveUserState();
    }

    function saveProgress(stageId) {
        // Check if stage is already completed - don't award XP again
        if (jsonStages[stageId] && jsonStages[stageId].completed) {
            saveUserState();
            return;
        }

        // Local progress logic
        let currentXPText = document.getElementById('header-xp').textContent;
        let currentXP = parseInt(currentXPText.split(':')[1].split('/')[0]) || 0;
        let currentLevel = parseInt(document.querySelector('.level-badge').textContent.replace('Lvl ', '')) || 1;

        // Add 50 XP per stage
        currentXP += 50;
        if (currentXP >= 100) {
            currentXP -= 100;
            currentLevel += 1;
        }

        // Update UI
        document.querySelector('.level-badge').textContent = `Lvl ${currentLevel}`;
        document.getElementById('header-xp').textContent = `XP: ${currentXP}/100`;

        // Mark stage as completed transition is handled in markStageCompleted
        saveUserState();
    }

    async function initPyodide() {
        if (!btnRun) return;
        btnRun.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading Engine...';
        btnRun.disabled = true;
        try {
            pyodideInstance = await loadPyodide();
            btnRun.innerHTML = '<i class="fa-solid fa-play"></i> Run Code';
            btnRun.disabled = false;
        } catch (err) {
            console.error('Failed to load Pyodide', err);
        }
    }

    // --- Course Selection Logic ---
    function renderCourseSelection() {
        courseItemsEl.innerHTML = '';
        btnBackCourses.style.display = 'flex';

        Object.keys(courseList).forEach(id => {
            const course = courseList[id];
            const div = document.createElement('div');
            div.className = `course-item ${selectedCourseId === id ? 'active' : ''}`;
            div.innerHTML = `
                <div class="course-icon"><i class="${course.icon}"></i></div>
                <div class="course-info">
                    <h3>${course.title}</h3>
                    <p>${course.tag}</p>
                </div>
            `;
            div.onclick = () => selectCourse(id);
            courseItemsEl.appendChild(div);
        });
    }

    function selectCourse(id) {
        selectedCourseId = id;
        renderCourseSelection();
        showCourseIntro(id);
    }

    function showCourseIntro(id) {
        const course = courseList[id];
        
        // Check if course is C# or C++
        if (id === 'csharp' || id === 'cpp') {
            courseIntroContentEl.innerHTML = `
                <div class="course-intro-header">
                    <span class="course-tag">${course.tag}</span>
                    <h2>${course.title}</h2>
                </div>
                <p class="intro-text">Please contact our sales</p>
            `;
            introActionsEl.style.display = 'none';
        } else {
            courseIntroContentEl.innerHTML = `
                <div class="course-intro-header">
                    <span class="course-tag">${course.tag}</span>
                    <h2>${course.title}</h2>
                </div>
                <p class="intro-text">${course.description}</p>
                <div class="course-highlights">
                    ${course.highlights.map(h => `
                        <div class="highlight-item">
                            <i class="fa-solid fa-check"></i>
                            <span>${h}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            introActionsEl.style.display = 'flex';
        }
    }

    function enterCourse() {
        if (!selectedCourseId) return;

        const course = courseList[selectedCourseId];

        if (course.entryPath === 'map') {

            // Python: Go to stage map
            // Find chapter for current progress
            const stageKeys = getOrderedJsonStageIds();
            let firstIncompleteIdx = stageKeys.findIndex(key => !jsonStages[key].completed);
            if (firstIncompleteIdx === -1) firstIncompleteIdx = 0;

            currentChapter = Math.floor(firstIncompleteIdx / STAGES_PER_CHAPTER) + 1;
            renderMap();
            switchView(viewMap);
        } else {
            // Others: Go direct to a placeholder stage or editor
            openDirectCourse(course);
        }
    }

    function openDirectCourse(course) {
        // Simple direct entry simulation
        currentStageId = 'direct-entry';

        stageTitleEl.textContent = course.title;
        learningContentEl.innerHTML = `<h3>Welcome to ${course.title}</h3><p>You have entered the direct access path. No stage levels are required for this course.</p>`;
        mcqQuestionEl.textContent = 'Ready to code?';
        mcqOptionsEl.innerHTML = '<div class="mcq-option">Yes, let\'s go!</div>';
        codingPromptEl.innerHTML = `Start your <strong>${course.title}</strong> journey here.`;
        expectedOutputTextEl.textContent = 'Success';
        codeEditor.value = `// Welcome to ${course.title}`;
        consoleOutput.textContent = '';

        switchView(viewStage);
        setMode('learn');

        // Show success feedback in the stage editor
        setTimeout(() => {
            showFeedback(editorFeedbackEl, `${course.title} mode active.`, 'success');
        }, 500);
    }
    function renderMap() {
        stageNodesWrapper.innerHTML = '';
        const fragment = document.createDocumentFragment();

        // Use JSON stages
        const allStages = getOrderedJsonStageIds().map((stageId, index, array) => {
            const stage = jsonStages[stageId];
            return {
                ...stage,
                id: stage.stageId || stage.id,
                locked: stage.locked ?? index !== 0,
                completed: !!stage.completed,
                paid: stage.paid ?? (index === array.length - 1 ? false : true)
            };
        });

        // Calculate stage range for current chapter
        const startIndex = (currentChapter - 1) * STAGES_PER_CHAPTER;
        const endIndex = Math.min(startIndex + STAGES_PER_CHAPTER, allStages.length);
        const activeStages = allStages.slice(startIndex, endIndex);

        // Update UI Info
        if (currentChapterNameEl) currentChapterNameEl.textContent = `Chapter ${currentChapter}`;
        if (chapterRangeEl) chapterRangeEl.textContent = `Stages ${startIndex + 1} - ${endIndex}`;
        if (btnPrevChapter) btnPrevChapter.disabled = currentChapter === 1;
        if (btnNextChapter) btnNextChapter.disabled = endIndex >= allStages.length;

        activeStages.forEach((stage, index) => {
            const node = document.createElement('div');
            // Show 'unpaid' if it's NOT locked and NOT paid
            const isUnpaid = !stage.locked && !stage.paid;
            node.className = `stage-node ${stage.locked ? 'locked' : ''} ${stage.completed ? 'completed' : ''} ${isUnpaid ? 'unpaid' : ''}`;
            node.setAttribute('data-title', stage.title);
            node.setAttribute('id', `node-${stage.id}`);
            node.textContent = String(index + 1); // Show chapter-relative number (1-8 for each chapter)
            node.addEventListener('click', () => {
                // Check if this is a Module 2 placeholder stage (stage-9 through stage-16)
                if (stage.id && (stage.id.startsWith('stage-9') || (stage.id.startsWith('stage-1') && stage.id !== 'stage-1'))) {
                    console.log('🚫 Module 2 placeholder stage - no action');
                    return;
                }

                if (!stage.locked) {
                    openStage(stage.id);
                }
            });
            fragment.appendChild(node);
        });
        stageNodesWrapper.appendChild(fragment);
    }

    function changeChapter(delta) {
        const newChapter = currentChapter + delta;

        // Calculate total chapters based on JSON content
        const totalStages = Object.keys(jsonStages).length;
        const totalChapters = Math.ceil(totalStages / STAGES_PER_CHAPTER);
        if (newChapter >= 1 && newChapter <= totalChapters) {
            currentChapter = newChapter;
            renderMap();
        }
    }

    function jumpToStage() {
        const stageNum = parseInt(inputJumpStage.value);

        // Calculate total stages based on JSON content
        const totalStages = Object.keys(jsonStages).length;

        if (isNaN(stageNum) || stageNum < 1 || stageNum > totalStages) {
            showFeedback(document.getElementById('editor-feedback'), 'Invalid stage number', 'error');
            return;
        }
        currentChapter = Math.ceil(stageNum / STAGES_PER_CHAPTER);
        renderMap();

        // Highlight the node briefly
        setTimeout(() => {
            const node = document.getElementById(`node-stage-${stageNum}`);
            if (node) {
                node.style.borderColor = 'var(--primary)';
                node.style.boxShadow = '0 0 30px var(--primary)';
            }
        }, 100);
    }

    function openStage(stageId) {
        try {
            console.log("Opening stage:", stageId);
            currentStageId = stageId;

            // Check if this is a Module 2 placeholder stage (stage-9 through stage-16)
            if (stageId && (stageId.startsWith('stage-9') || (stageId.startsWith('stage-1') && stageId !== 'stage-1'))) {
                console.log('🚫 Module 2 placeholder stage - not opening');
                showFeedback(document.getElementById('editor-feedback'), 'This lesson is not yet available.', 'error');
                return;
            }

            // Get stage data from JSON content
            const stageData = jsonStages[stageId];
            if (!stageData) {
                console.error("Stage data not found for id:", stageId);
                return;
            }

            // Defensive: Reset stage view content before switching or returning
            stageTitleEl.textContent = 'Loading...';
            learningContentEl.innerHTML = '';
            mcqOptionsEl.innerHTML = '';
            hideFeedback(mcqFeedbackEl);
            hideFeedback(editorFeedbackEl);
            codeEditor.value = '';
            consoleOutput.textContent = '';

            // Payment Check for both CSV and JSON content
            if (!stageData.paid) {
                console.log("Stage is unpaid, showing overlay:", stageId);
                showPaymentOverlay(stageData);
                return;
            }

            stageTitleEl.textContent = stageData.title;

            // Render learning content (JSON format)
            if (stageData.readingMaterial) {
                learningContentEl.innerHTML = renderJsonReadingMaterial(stageData.readingMaterial);
            } else {
                learningContentEl.innerHTML = '<p>No content available.</p>';
            }

            if (stageData.codingChallenge) {
                codingPromptEl.innerHTML = escapeHtml(stageData.codingChallenge.prompt).replace(/\n/g, '<br>');
                expectedOutputTextEl.textContent = stageData.codingChallenge.expectedOutput;
                codeEditor.value = stageData.codingChallenge.preCode || '';
            }

            // Determine interaction mode
            if (stageData.mcq && stageData.mcq.length > 0) {
                // JSON MCQ exists
                const firstMcq = stageData.mcq[0];
                mcqQuestionEl.innerHTML = escapeHtml(firstMcq.question).replace(/\n/g, '<br>');
                renderJsonMCQOptions(firstMcq);
                
                // Restore selected answer if stage is completed
                if (jsonStages[stageId].completed && jsonStages[stageId].selectedAnswer !== undefined) {
                    const optionElements = mcqOptionsEl.querySelectorAll('.mcq-option');
                    if (optionElements[jsonStages[stageId].selectedAnswer]) {
                        optionElements[jsonStages[stageId].selectedAnswer].classList.add('correct');
                    }
                }
                
                setMode('learn');
            } else if (stageData.codingChallenge) {
                // No MCQ, but coding exists.
                // Restore typed code and console output if stage is completed
                if (jsonStages[stageId].completed && jsonStages[stageId].typedCode) {
                    codeEditor.value = jsonStages[stageId].typedCode;
                }
                if (jsonStages[stageId].completed && jsonStages[stageId].consoleOutput) {
                    consoleOutput.textContent = jsonStages[stageId].consoleOutput;
                }
                
                if (stageData.readingMaterial) {
                    // HYBRID VIEW: Reading Material on Left, Code on Right
                    setMode('code', true);
                } else {
                    // Coding only: go direct to CODE mode
                    setMode('code');
                }
            } else {
                // Reading Only stage
                mcqQuestionEl.textContent = 'Learning Material';
                const btn = document.createElement('button');
                btn.className = 'btn-primary';
                btn.style.width = '100%';
                btn.innerHTML = 'Complete Reading <i class="fa-solid fa-check"></i>';
                btn.onclick = async () => {
                    showFeedback(mcqFeedbackEl, 'Well done! Reading complete.', 'success');
                    markStageCompleted(currentStageId);
                    await saveProgress(currentStageId);
                    setTimeout(() => { switchView(viewMap); renderMap(); }, 1000);
                };
                mcqOptionsEl.appendChild(btn);
                setMode('learn');
            }

            switchView(viewStage);
        } catch (err) {
            console.error("Error opening stage:", err);
            showFeedback(editorFeedbackEl, "Failed to load stage.", "error");
        }
    }

    function showPaymentOverlay(stageData) {
        console.log("Showing payment overlay for:", stageData.id);
        paymentStageTitle.textContent = stageData.title;
        paymentOverlay.style.display = 'flex';
    }

    function hidePaymentOverlay() {
        console.log("Hiding payment overlay");
        paymentOverlay.style.display = 'none';
    }

    function processPayment() {
        if (!currentStageId) return;

        jsonStages[currentStageId].paid = true;
        jsonStages[currentStageId].locked = false;

        saveUserState();

        hidePaymentOverlay();
        renderMap();
        // Automatically open after "payment"
        openStage(currentStageId);
    }

    function renderMCQOptions(mcqData) {
        mcqOptionsEl.innerHTML = '';
        mcqData.options.forEach((opt, index) => {
            const div = document.createElement('div');
            div.className = 'mcq-option';
            div.textContent = opt;
            div.addEventListener('click', () => handleMCQAnswer(index, mcqData.correctIndex, div));
            mcqOptionsEl.appendChild(div);
        });
    }

    async function handleMCQAnswer(selectedIndex, correctIndex, optionElement) {
        if (selectedIndex === correctIndex) {
            optionElement.classList.add('correct');
            showFeedback(mcqFeedbackEl, 'Correct! Concept verified.', 'success');

            // Save the selected answer
            jsonStages[currentStageId].selectedAnswer = selectedIndex;

            // Get stage data from JSON
            const stageData = jsonStages[currentStageId];

            if (stageData && stageData.codingChallenge) {
                setTimeout(() => setMode('code'), 1000);
            } else {
                markStageCompleted(currentStageId);
                await saveProgress(currentStageId);
                setTimeout(() => { switchView(viewMap); renderMap(); }, 1500);
            }
        } else {
            optionElement.classList.add('incorrect');
            showFeedback(mcqFeedbackEl, 'Incorrect. Review the content.', 'error');
        }
    }

    async function runPythonCode() {
        const code = codeEditor.value;

        // Skip coding challenge validation for direct entry mode
        if (currentStageId === 'direct-entry') {
            consoleOutput.textContent = '';
            consoleOutput.classList.remove('error-text');
            let output = '';
            pyodideInstance.setStdout({ batched: (str) => { output += str + '\n'; consoleOutput.textContent += str + '\n'; } });

            try {
                await pyodideInstance.runPythonAsync(code);
                consoleOutput.textContent += '\n✓ Code executed successfully!';
                showFeedback(editorFeedbackEl, 'Code executed successfully!', 'success');
            } catch (error) {
                consoleOutput.textContent += '\n✗ Error: ' + error.message;
                consoleOutput.classList.add('error-text');
                showFeedback(editorFeedbackEl, 'Error executing code.', 'error');
            }
            return;
        }

        let stageData = null;
        if (jsonStages[currentStageId]) {
            stageData = jsonStages[currentStageId];
        }

        if (!stageData) {
            console.error("Stage data not found for:", currentStageId);
            return;
        }

        // Check if stage has coding challenge
        if (!stageData.codingChallenge) {
            console.error("No coding challenge found for stage:", currentStageId);
            showFeedback(editorFeedbackEl, 'This stage does not have a coding challenge.', 'error');
            return;
        }

        const challenge = stageData.codingChallenge;

        consoleOutput.textContent = '';
        consoleOutput.classList.remove('error-text');
        let output = '';
        pyodideInstance.setStdout({ batched: (str) => { output += str + '\n'; consoleOutput.textContent += str + '\n'; } });

        try {
            await pyodideInstance.runPythonAsync(code);

            const trimmedOutput = output.trim();
            const expected = challenge.expectedOutput ? challenge.expectedOutput.trim() : '';
            const exact = challenge.exactInput ? challenge.exactInput.trim() : '';
            const preCode = challenge.preCode ? challenge.preCode.trim() : '';

            let isCorrect = true;
            let feedback = 'Success! Stage completed.';

            // Check Output (if expected output is defined)
            if (expected && trimmedOutput !== expected) {
                isCorrect = false;
                feedback = 'Output does not match expected result.';
            }

            // Check Exact Input (if exact solution is provided)
            if (exact) {
                // Normalization helper: remove comments and collapse whitespace
                const normalize = (val) => {
                    return val
                        .replace(/#.*$/gm, '') // Remove comments
                        .replace(/\s+/g, ' ')  // Collapse whitespace
                        .trim();
                };

                const normUser = normalize(code);
                const normExact = normalize(exact);

                // Use 'includes' to allow the solution to exist within the student's code 
                // regardless of whether they kept the starter comments or not.
                if (!normUser.includes(normExact)) {
                    isCorrect = false;
                    feedback = 'Code does not match the expected solution.';
                }
            }

            if (isCorrect) {
                showFeedback(editorFeedbackEl, feedback, 'success');
                
                // Save the typed code answer and console output
                jsonStages[currentStageId].typedCode = code;
                jsonStages[currentStageId].consoleOutput = consoleOutput.textContent;
                
                markStageCompleted(currentStageId);
                await saveProgress(currentStageId);
                setTimeout(() => { switchView(viewMap); renderMap(); }, 1500);
            } else {
                showFeedback(editorFeedbackEl, feedback, 'error');
            }
        } catch (err) {
            consoleOutput.textContent = err.message;
            consoleOutput.classList.add('error-text');
            showFeedback(editorFeedbackEl, 'Execution Error', 'error');
        }
    }

    function markStageCompleted(stageId) {
        // For JSON content, we need to update the stage in jsonStages
        jsonStages[stageId].completed = true;

        // Unlock the next stage if it exists
        const stageKeys = getOrderedJsonStageIds();
        const currentIndex = stageKeys.indexOf(stageId);
        if (currentIndex > -1 && currentIndex + 1 < stageKeys.length) {
            const nextStageId = stageKeys[currentIndex + 1];
            jsonStages[nextStageId].locked = false;
        }
    }

    function switchView(target, isBack = false) {
        console.log("Switching view to:", target.id);

        // Track navigation history (only on forward navigation)
        const activeView = document.querySelector('.view.active-view');
        if (activeView && !isBack && activeView !== target) {
            viewHistory.push(activeView.id);
        }

        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active-view');
            v.style.display = 'none';
        });
        target.classList.add('active-view');
        target.style.display = 'flex';

        // Dynamic header back button (Always visible now to allow portal exit)
        if (btnBackCourses) {
            btnBackCourses.style.display = 'flex';
        }

        // AI Chatbox Visibility Logic
        if (target.id === 'view-stage') {
            aiChatBubble.style.display = 'flex';
        } else {
            aiChatBubble.style.display = 'none';
            aiChatbox.style.display = 'none';
        }

        // Always hide payment overlay when switching main views
        hidePaymentOverlay();
    }

    function setMode(mode, isHybrid = false) {
        currentMode = mode;
        if (mode === 'learn') {
            learningContentEl.classList.add('active-mode'); mcqContainer.classList.add('active-mode');
            codingInstructionsEl.classList.remove('active-mode'); editorContainer.classList.remove('active-mode');
        } else if (isHybrid) {
            // SIDE-BY-SIDE: Learning Content on Left, Editor on Right
            learningContentEl.classList.add('active-mode'); mcqContainer.classList.remove('active-mode');
            codingInstructionsEl.classList.remove('active-mode'); editorContainer.classList.add('active-mode');
        } else {
            // STANDARD CODE MODE: Instructions on Left, Editor on Right
            learningContentEl.classList.remove('active-mode'); mcqContainer.classList.remove('active-mode');
            codingInstructionsEl.classList.add('active-mode'); editorContainer.classList.add('active-mode');
        }
    }

    function goBack() {
        // Get current active view
        const activeView = document.querySelector('.view.active-view');
        
        if (!activeView) {
            // Fallback: go to portal if no active view
            window.location.href = 'https://portal.eti.com.hk/landing/';
            return;
        }

        const currentViewId = activeView.id;

        // New navigation flow:
        // view-stage → view-map → view-course-selection → portal
        if (currentViewId === 'view-stage') {
            // Go back to stage selection (map)
            renderMap();
            switchView(viewMap);
        } else if (currentViewId === 'view-map') {
            // Go back to course selection
            renderCourseSelection();
            switchView(viewCourseSelection);
        } else if (currentViewId === 'view-course-selection') {
            // Go back to portal
            window.location.href = 'https://portal.eti.com.hk/landing/';
        } else {
            // Fallback: go to portal for any other view
            window.location.href = 'https://portal.eti.com.hk/landing/';
        }
    }

    function showFeedback(el, text, type) { el.textContent = text; el.className = `feedback-msg show ${type}`; }
    function hideFeedback(el) { el.className = 'feedback-msg'; }

    function initEventListeners() {
        btnRun?.addEventListener('click', runPythonCode);
        btnSignOut?.addEventListener('click', async () => {
            sessionStorage.removeItem('pythonQuestUser');
            // Call ETI logout API
            try {
                await fetch(LOGOUT_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (e) { console.error('Logout API error:', e); }
            // Clear stored token
            localStorage.removeItem('eti_jwt_token');
            // Redirect back to the main ETI portal
            window.location.href = 'https://portal.eti.com.hk/landing/';
        });

        // Chapter Navigation
        btnPrevChapter?.addEventListener('click', () => changeChapter(-1));
        btnNextChapter?.addEventListener('click', () => changeChapter(1));
        btnJumpStage?.addEventListener('click', jumpToStage);
        inputJumpStage?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') jumpToStage();
        });

        // Course Selection
        btnEnterCourse?.addEventListener('click', enterCourse);
        btnBackCourses?.addEventListener('click', goBack);

        // Payment
        btnPayNow?.addEventListener('click', processPayment);
        btnCancelPayment?.addEventListener('click', hidePaymentOverlay);
    }

    async function testAIBackend() {
        console.log("--- AI Multi-Step Test Start (Processing Index Page) ---");

        try {
            // STEP 1: LOGIN (Get Token)
            console.log("Step 1: Logging in to get token...");
            const loginRes = await fetch(AI_LOGIN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin', password: 'hiddenboss123' })
            });

            if (!loginRes.ok) {
                const error = await loginRes.text();
                throw new Error(`Login failed (${loginRes.status}): ${error}`);
            }

            const loginData = await loginRes.json();
            aiToken = loginData.token;
            console.log("Login Success! Token obtained.");
        } catch (err) {
            console.error("AI Login Error:", err);
        }
    }

    // --- AI Chat Logic ---
    function initAIChat() {
        if (!aiChatBubble || !btnCloseChat || !btnSendChat || !chatInput) return;

        aiChatBubble.addEventListener('click', () => {
            aiChatbox.style.display = 'flex';
            aiChatBubble.style.display = 'none';
            chatInput.focus();
        });

        btnCloseChat.addEventListener('click', () => {
            aiChatbox.style.display = 'none';
            aiChatBubble.style.display = 'flex';
        });

        btnSendChat.addEventListener('click', sendChatMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });
    }

    async function sendChatMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // Get Current Context for AI
        const course = courseList[selectedCourseId];
        const stageData = jsonStages[currentStageId];

        // Construct System Prompt
        let systemPrompt = `You are an expert AI coding tutor for the "${course ? course.title : 'Coding'}" course. `;
        systemPrompt += `The user is currently on Stage: ${stageData ? stageData.title : 'General'}. `;
        if (stageData && stageData.readingMaterial) {
            systemPrompt += `The current learning material is: "${Array.isArray(stageData.readingMaterial) ? stageData.readingMaterial.map(item => item.text || '').join(' ') : stageData.readingMaterial}". `;
        }
        if (stageData && stageData.codingChallenge) {
            systemPrompt += `The current coding challenge is: "${stageData.codingChallenge.prompt}". `;
        }

        systemPrompt += "\n\nCRITICAL INSTRUCTIONS:\n";
        systemPrompt += "1. ONLY answer questions related to this coding course, the current programming language, or the current stage.\n";
        systemPrompt += "2. If the user asks anything UNRELATED to coding or this course (e.g., general knowledge, personal questions, other topics), you MUST politely refuse and tell them you can only assist with the course content.\n";
        systemPrompt += "3. Keep your answers concise and helpful for a student. Limit your response strictly to 10-20 words.\n";
        systemPrompt += "4. Do NOT give away the exact full solution to a coding challenge immediately; provide hints first.\n";

        // Combine for the backend (Assuming single message string)
        const fullMessage = `${systemPrompt}\n\nUser Question: ${message}`;

        // Add user message to UI (original message)
        addChatMessage(message, 'user');
        chatInput.value = '';

        // Typing indicator
        const typingId = 'typing-' + Date.now();
        const typingEl = document.createElement('div');
        typingEl.className = 'message ai typing';
        typingEl.id = typingId;
        typingEl.textContent = 'Thinking...';
        chatMessages.appendChild(typingEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            if (!aiToken) {
                // Try logging in again if token is missing
                await testAIBackend();
            }

            if (!aiToken) throw new Error("Could not authenticate with AI.");

            const res = await fetch(AI_CHAT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${aiToken}`
                },
                body: JSON.stringify({ message: fullMessage, provider: 'deepseek' })
            });

            if (!res.ok) throw new Error(`AI Chat error: ${res.status}`);

            const data = await res.json();
            typingEl.remove();

            // Filter AI response if needed (Backend should handle it based on prompt, but we can check for common refusal patterns)
            addChatMessage(data.text || "I'm sorry, I couldn't understand that.", 'ai');

        } catch (err) {
            console.error("Chat API Error:", err);
            typingEl.remove();
            addChatMessage("System error: Could not reach AI assistant.", 'ai');
        }
    }

    function addChatMessage(text, sender) {
        const msgEl = document.createElement('div');
        msgEl.className = `message ${sender}`;
        msgEl.textContent = text;
        chatMessages.appendChild(msgEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    init();
})();

// --- Global Functions for HTML onclick handlers ---
function openEditor() {
    // Open editor in new tab
    window.open('editor.html', '_blank');
}
