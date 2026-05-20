(function () {
    const STAGES_PER_CHAPTER = 8;
    const API_BASE_URL = 'https://aicourse.eti.com.hk';

    // AI Backend URLs
    const AI_BASE_URL = 'https://gacha-girls.co:8080';
    const AI_LOGIN_URL = `${AI_BASE_URL}/api/program/login`;
    const AI_CHAT_URL = `${AI_BASE_URL}/api/program/chat`;
    let aiToken = null;

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

    const courseList = {
        ai_basics: {
            title: 'AI Essentials',
            tag: 'Learn to prompt well',
            icon: 'fa-solid fa-brain',
            description: 'A beginner-friendly path for learning how to use AI tools effectively for study, work, and daily tasks.',
            highlights: ['Prompt writing', 'Checking answers', 'Safer AI use', 'Real-world examples'],
            entryPath: 'map'
        }
    };

    const stages = [
        {
            stageId: 'stage-1',
            title: 'What AI Can Do',
            readingMaterial: [
                { type: 'heading', text: 'Welcome to AI Essentials' },
                { type: 'text', text: 'AI can help you brainstorm, summarize, explain, translate, and draft ideas faster.' },
                { type: 'text', text: 'The best results come from giving AI clear context, a goal, and the format you want.' },
                {
                    type: 'list',
                    items: [
                        'Brainstorm ideas',
                        'Rewrite text',
                        'Summarize long notes',
                        'Explain difficult concepts'
                    ]
                }
            ],
            mcq: {
                question: 'What helps AI give better answers?',
                options: ['A clear goal and context', 'Random keywords only', 'No instructions at all'],
                correct: 0,
                explanation: 'AI responds better when you describe what you need and why.'
            }
        },
        {
            stageId: 'stage-2',
            title: 'Writing Prompts',
            readingMaterial: [
                { type: 'heading', text: 'Prompt Structure' },
                { type: 'text', text: 'A strong prompt usually includes role, task, context, and output style.' },
                { type: 'text', html: 'Example: <span class="inline-code">Act as a tutor. Explain photosynthesis to a 12-year-old in 3 bullet points.</span>' },
                {
                    type: 'list',
                    items: [
                        'Be specific',
                        'Say who the audience is',
                        'Ask for the output format',
                        'Use examples when needed'
                    ]
                }
            ],
            mcq: {
                question: 'Which prompt is strongest?',
                options: [
                    'Explain it clearly',
                    'Explain gravity to a 10-year-old using 3 simple bullets',
                    'Talk about science'
                ],
                correct: 1,
                explanation: 'Specific audience and format produce better results.'
            }
        },
        {
            stageId: 'stage-3',
            title: 'Checking AI Output',
            readingMaterial: [
                { type: 'heading', text: 'Always Verify' },
                { type: 'text', text: 'AI can sound confident even when it is wrong, outdated, or incomplete.' },
                { type: 'text', text: 'Use trusted sources to double-check important facts, numbers, and recommendations.' },
                {
                    type: 'list',
                    items: [
                        'Look for missing details',
                        'Compare with a trusted source',
                        'Ask AI to explain its reasoning',
                        'Treat AI as a helper, not the final authority'
                    ]
                }
            ],
            mcq: {
                question: 'Why should we verify AI answers?',
                options: ['AI is always perfect', 'AI can sometimes be wrong', 'Verification makes prompts shorter'],
                correct: 1,
                explanation: 'Human checking is important, especially for important decisions.'
            }
        },
        {
            stageId: 'stage-4',
            title: 'Safe AI Use',
            readingMaterial: [
                { type: 'heading', text: 'Use AI Responsibly' },
                { type: 'text', text: 'Do not share private, sensitive, or confidential information unless you are sure the platform is approved.' },
                { type: 'text', text: 'Be careful with schoolwork, workplace data, and personal details.' },
                {
                    type: 'list',
                    items: [
                        'Avoid secrets and passwords',
                        'Check privacy settings',
                        'Respect copyright',
                        'Be honest about AI assistance'
                    ]
                }
            ],
            mcq: {
                question: 'Which is the safest habit?',
                options: ['Share passwords for faster help', 'Use approved tools and protect private data', 'Copy everything without checking'],
                correct: 1,
                explanation: 'Protecting private data is part of responsible AI use.'
            }
        }
    ];

    const jsonStages = {};

    // API functions
    async function loadStagesFromAPI() {
        console.log('🔄 Loading stages from API:', API_BASE_URL);
        try {
            const token = localStorage.getItem('eti_jwt_token');
            console.log('🔄 Token exists:', !!token);
            const response = await fetch(`${API_BASE_URL}/api/stage-content`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('🔄 API response status:', response.status);
            if (response.ok) {
                const data = await response.json();
                const stages = data.stages || [];
                console.log('🔄 Stages received from API:', stages.length);
                
                // Convert API stage data to jsonStages format
                stages.forEach(stage => {
                    jsonStages[stage.id] = {
                        stageId: stage.id,
                        title: stage.title,
                        description: stage.description || stage.title,
                        difficulty: stage.difficulty || 1,
                        readingMaterial: stage.readingMaterial || [],
                        mcq: stage.questions || [],
                        locked: true,
                        completed: false,
                        paid: true
                    };
                });

                console.log('🔄 jsonStages after loading:', Object.keys(jsonStages));

                // Normalize stage state (set last stage as unpaid)
                normalizeStageState();

                // Load progress from API
                await loadProgressFromAPI();
                
                console.log('🟢 Stages loaded from API successfully');
            } else {
                console.error('🔴 Failed to load stages from API:', response.status);
                // Fallback to hardcoded stages
                loadHardcodedStages();
            }
        } catch (error) {
            console.error('🔴 Error loading stages from API:', error);
            // Fallback to hardcoded stages
            loadHardcodedStages();
        }
    }

    async function loadProgressFromAPI() {
        try {
            const token = localStorage.getItem('eti_jwt_token');
            const response = await fetch(`${API_BASE_URL}/api/progress`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const progress = data.progress;
                
                if (progress && progress.stages) {
                    // Update stages with progress data
                    Object.keys(progress.stages).forEach(stageId => {
                        if (jsonStages[stageId]) {
                            jsonStages[stageId].completed = progress.stages[stageId].completed || false;
                            jsonStages[stageId].locked = progress.stages[stageId].locked !== undefined ? progress.stages[stageId].locked : false;
                            if (progress.stages[stageId].paid !== undefined) {
                                jsonStages[stageId].paid = progress.stages[stageId].paid;
                            }
                            if (progress.stages[stageId].selectedAnswers !== undefined) {
                                jsonStages[stageId].selectedAnswers = progress.stages[stageId].selectedAnswers;
                            }
                        }
                    });
                }
                
                console.log('🟢 Progress loaded from API successfully');
            }
        } catch (error) {
            console.error('🔴 Error loading progress from API:', error);
        }
    }

    async function saveProgressToAPI() {
        try {
            const token = localStorage.getItem('eti_jwt_token');
            const stagesProgress = {};
            
            Object.keys(jsonStages).forEach(stageId => {
                stagesProgress[stageId] = {
                    completed: jsonStages[stageId].completed,
                    locked: jsonStages[stageId].locked,
                    paid: jsonStages[stageId].paid,
                    selectedAnswers: jsonStages[stageId].selectedAnswers
                };
            });

            const progress = {
                stages: stagesProgress
            };

            const response = await fetch(`${API_BASE_URL}/api/progress`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ progress })
            });

            if (response.ok) {
                console.log('🟢 Progress saved to API successfully');
            } else {
                console.error('🔴 Failed to save progress to API:', response.status);
            }
        } catch (error) {
            console.error('🔴 Error saving progress to API:', error);
        }
    }

    function loadHardcodedStages() {
        stages.forEach((stage, index) => {
            jsonStages[stage.stageId] = {
                stageId: stage.stageId,
                title: stage.title,
                description: stage.title,
                difficulty: 1,
                readingMaterial: stage.readingMaterial,
                mcq: [stage.mcq],
                locked: index !== 0,
                completed: false,
                paid: true
            };
        });
        console.log('🟡 Using hardcoded stages as fallback');
    }

    function normalizeStageState() {
        const stageKeys = getOrderedStageIds();
        if (stageKeys.length === 0) return;

        // Ensure first stage is unlocked
        const hasUnlockedStage = stageKeys.some((stageId) => jsonStages[stageId]?.locked === false);
        if (!hasUnlockedStage) {
            jsonStages[stageKeys[0]].locked = false;
        }

        // Set paid status: stages 1-1 through 1-7 are free, stage 1-8 and stages 2-1 through 2-8 require payment
        stageKeys.forEach((stageId, idx) => {
            if (jsonStages[stageId].completed) {
                jsonStages[stageId].paid = true;
            } else if (stageId === 'stage-1-8' || stageId.startsWith('stage-2-')) {
                // Stage 1-8 and Module 2 stages require payment (paid = false means not paid for)
                jsonStages[stageId].paid = false;
            } else {
                // Stages 1-1 through 1-7 are free (paid = true means unlocked/paid for)
                jsonStages[stageId].paid = true;
            }
        });
    }

    function showPaymentOverlay(stageTitle) {
        const overlay = document.getElementById('payment-overlay');
        const titleEl = document.getElementById('payment-stage-title');
        if (overlay && titleEl) {
            titleEl.textContent = stageTitle;
            overlay.style.display = 'flex';
        }
    }

    function hidePaymentOverlay() {
        const overlay = document.getElementById('payment-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    const viewCourseSelection = document.getElementById('view-course-selection');
    const viewMap = document.getElementById('view-map');
    const viewStage = document.getElementById('view-stage');
    const gameContainer = document.getElementById('game-container');
    const courseItemsEl = document.getElementById('course-items');
    const courseIntroContentEl = document.getElementById('course-intro-content');
    const introActionsEl = document.querySelector('.intro-actions');
    const btnEnterCourse = document.getElementById('btn-enter-course');
    const btnBackCourses = document.getElementById('btn-back-courses');
    const stageNodesWrapper = document.getElementById('stage-nodes-wrapper');
    const btnPrevChapter = document.getElementById('btn-prev-chapter');
    const btnNextChapter = document.getElementById('btn-next-chapter');
    const currentChapterNameEl = document.getElementById('current-chapter-name');
    const chapterRangeEl = document.getElementById('chapter-range');
    const inputJumpStage = document.getElementById('input-jump-stage');
    const btnJumpStage = document.getElementById('btn-jump-stage');
    const stageTitleEl = document.getElementById('stage-title');
    const learningContentEl = document.getElementById('learning-content');
    const mcqContainer = document.getElementById('mcq-container');
    const mcqQuestionEl = document.getElementById('mcq-question');
    const mcqOptionsEl = document.getElementById('mcq-options');
    const mcqFeedbackEl = document.getElementById('mcq-feedback');
    const mcqNavigationEl = document.getElementById('mcq-navigation');
    const btnPrevQuestion = document.getElementById('btn-prev-question');
    const btnNextQuestion = document.getElementById('btn-next-question');
    const headerXpInfo = document.getElementById('header-xp-info');

    // AI Chat Elements
    const aiChatbox = document.getElementById('ai-chatbox');
    const aiChatBubble = document.getElementById('ai-chat-bubble');
    const btnCloseChat = document.getElementById('btn-close-chat');
    const btnSendChat = document.getElementById('btn-send-chat');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    let currentStageId = null;
    let currentChapter = 1;
    let currentQuestionIndex = 0;
    let selectedCourseId = null;
    let currentViewId = null;

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function renderStyle(style) {
        if (!style) return '';
        return Object.entries(style).map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`).join('; ');
    }

    function renderReadingMaterial(readingMaterial) {
        if (!Array.isArray(readingMaterial) || readingMaterial.length === 0) {
            return '<p>No reading material available.</p>';
        }

        return readingMaterial.map((item) => {
            switch (item.type) {
                case 'text':
                    return item.html
                        ? `<div class="lesson-text" style="${renderStyle(item.style)}">${item.html}</div>`
                        : `<p class="lesson-text" style="${renderStyle(item.style)}">${escapeHtml(item.text || '')}</p>`;
                case 'heading':
                    return `<h3 class="lesson-heading" style="${renderStyle(item.style)}">${escapeHtml(item.text || '')}</h3>`;
                case 'list':
                    return `<ul class="list-block">${(item.items || []).map((value) => `<li>${escapeHtml(String(value))}</li>`).join('')}</ul>`;
                case 'image':
                    return `
                        <figure class="image-block" style="text-align:${item.alignment || 'center'};">
                            <img class="lesson-image" src="${item.src}" alt="${escapeHtml(item.alt || '')}" style="width:${item.width || '100%'};">
                            ${item.caption ? `<figcaption class="lesson-caption">${escapeHtml(item.caption)}</figcaption>` : ''}
                        </figure>
                    `;
                case 'table':
                    return renderTable(item);
                default:
                    return `<p>Unknown content type: ${escapeHtml(String(item.type || 'unknown'))}</p>`;
            }
        }).join('');
    }

    function renderTable(tableData) {
        if (!tableData.headers || !tableData.rows) {
            return '<p>Invalid table data</p>';
        }

        const headers = tableData.headers.map((header) => `<th>${escapeHtml(String(header))}</th>`).join('');
        const rows = tableData.rows.map((row) => {
            const cells = Array.isArray(row) ? row : [row];
            return `<tr>${cells.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join('')}</tr>`;
        }).join('');

        return `
            <div class="table-container">
                <table class="lesson-table">
                    <thead><tr>${headers}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    function renderMCQOptions(mcqData) {
        mcqOptionsEl.innerHTML = '';
        const isCompleted = jsonStages[currentStageId].completed;
        
        mcqData.options.forEach((option, index) => {
            const div = document.createElement('div');
            div.className = 'mcq-option';
            div.innerHTML = escapeHtml(option).replace(/\n/g, '<br>');
            
            // Only add click handler if stage is not completed
            if (!isCompleted) {
                // Handle both old format (correct) and new format (correctAnswer)
                const correctIndex = mcqData.correctAnswer !== undefined ? mcqData.correctAnswer : mcqData.correct;
                div.addEventListener('click', () => handleMCQAnswer(index, correctIndex, div));
            } else {
                // Disable clicking for completed stages
                div.style.pointerEvents = 'none';
                div.style.opacity = '0.8';
            }
            
            mcqOptionsEl.appendChild(div);
        });
    }

    function showFeedback(el, text, type) {
        el.textContent = text;
        el.className = `feedback-msg show ${type}`;
    }

    function hideFeedback(el) {
        el.className = 'feedback-msg';
        el.textContent = '';
    }

    function getOrderedStageIds() {
        return Object.keys(jsonStages).sort((a, b) => {
            const aNum = parseInt(a.replace(/\D/g, ''), 10) || 0;
            const bNum = parseInt(b.replace(/\D/g, ''), 10) || 0;
            return aNum - bNum;
        });
    }

    function renderCourseSelection() {
        courseItemsEl.innerHTML = '';
        Object.keys(courseList).forEach((id) => {
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
            div.addEventListener('click', () => selectCourse(id));
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
        courseIntroContentEl.innerHTML = `
            <div class="course-intro-header">
                <span class="course-tag">${course.tag}</span>
                <h2>${course.title}</h2>
            </div>
            <p class="intro-text">${course.description}</p>
            <div class="course-highlights">
                ${course.highlights.map((item) => `
                    <div class="highlight-item">
                        <i class="fa-solid fa-check"></i>
                        <span>${item}</span>
                    </div>
                `).join('')}
            </div>
        `;
        introActionsEl.style.display = 'flex';
    }

    function enterCourse() {
        if (!selectedCourseId) return;
        const firstIncomplete = getOrderedStageIds().findIndex((id) => !jsonStages[id].completed);
        currentChapter = Math.floor((firstIncomplete < 0 ? 0 : firstIncomplete) / STAGES_PER_CHAPTER) + 1;
        renderMap();
        switchView(viewMap);
    }

    function renderMap() {
        stageNodesWrapper.innerHTML = '';
        const fragment = document.createDocumentFragment();
        const allStages = getOrderedStageIds().map((id) => jsonStages[id]);
        const startIndex = (currentChapter - 1) * STAGES_PER_CHAPTER;
        const endIndex = Math.min(startIndex + STAGES_PER_CHAPTER, allStages.length);
        const activeStages = allStages.slice(startIndex, endIndex);

        currentChapterNameEl.textContent = `Module ${currentChapter}`;
        chapterRangeEl.textContent = `Lessons ${startIndex + 1} - ${endIndex}`;
        btnPrevChapter.disabled = currentChapter === 1;
        btnNextChapter.disabled = endIndex >= allStages.length;

        activeStages.forEach((stage, index) => {
            const node = document.createElement('div');
            const isUnpaid = !stage.locked && !stage.paid;
            node.className = `stage-node ${stage.locked ? 'locked' : ''} ${stage.completed ? 'completed' : ''} ${isUnpaid ? 'unpaid' : ''}`;
            node.setAttribute('data-title', stage.title);
            node.setAttribute('id', `node-${stage.stageId}`);
            node.textContent = String(index + 1); // Show chapter-relative number (1-8 for each chapter)
            node.addEventListener('click', () => {
                console.log('🔍 Stage node clicked:', {
                    stageId: stage.stageId,
                    title: stage.title,
                    locked: stage.locked,
                    paid: stage.paid,
                    completed: stage.completed,
                    stageDataExists: !!jsonStages[stage.stageId]
                });

                // Check if this is a Module 2 placeholder stage - do nothing
                if (stage.stageId && stage.stageId.startsWith('stage-2-')) {
                    console.log('🚫 Module 2 placeholder stage - no action');
                    return;
                }

                if (!stage.locked) {
                    if (!stage.paid) {
                        console.log('� Stage is unpaid, showing payment overlay');
                        showPaymentOverlay(stage.title);
                    } else {
                        console.log('�� Stage is unlocked and paid, attempting to open...');
                        openStage(stage.stageId);
                    }
                } else {
                    console.log('🔒 Stage is locked, cannot open');
                }
            });
            fragment.appendChild(node);
        });

        stageNodesWrapper.appendChild(fragment);
    }

    function changeChapter(delta) {
        const totalStages = getOrderedStageIds().length;
        const totalChapters = Math.ceil(totalStages / STAGES_PER_CHAPTER);
        const nextChapter = currentChapter + delta;
        if (nextChapter >= 1 && nextChapter <= totalChapters) {
            currentChapter = nextChapter;
            renderMap();
        }
    }

    function jumpToStage() {
        const stageNum = parseInt(inputJumpStage.value, 10);
        const stageKeys = getOrderedStageIds();
        const totalStages = stageKeys.length;
        if (Number.isNaN(stageNum) || stageNum < 1 || stageNum > totalStages) {
            showFeedback(mcqFeedbackEl, 'Invalid lesson number', 'error');
            return;
        }
        const stageId = stageKeys[stageNum - 1];
        currentChapter = Math.ceil(stageNum / STAGES_PER_CHAPTER);
        renderMap();
        setTimeout(() => {
            const node = document.getElementById(`node-${stageId}`);
            if (node) {
                node.style.borderColor = 'var(--primary)';
                node.style.boxShadow = '0 0 30px rgba(20, 184, 166, 0.5)';
            }
        }, 100);
    }

    function openStage(stageId) {
        console.log('📖 openStage called with stageId:', stageId);
        currentStageId = stageId;
        currentQuestionIndex = 0;
        const stageData = jsonStages[stageId];
        console.log('📖 Stage data found:', !!stageData);
        if (!stageData) {
            console.error('❌ Stage data not found for stageId:', stageId);
            console.log('📖 Available stage IDs:', Object.keys(jsonStages));
            return;
        }

        // Check if this is a Module 2 placeholder stage
        if (stageId.startsWith('stage-2-')) {
            console.log('🚫 Module 2 placeholder stage - not opening');
            showFeedback(mcqFeedbackEl, 'This lesson is not yet available.', 'error');
            return;
        }

        console.log('📖 Stage data:', {
            id: stageData.stageId,
            title: stageData.title,
            hasReadingMaterial: !!stageData.readingMaterial,
            readingMaterialLength: stageData.readingMaterial?.length,
            hasMcq: !!stageData.mcq,
            mcqLength: stageData.mcq?.length
        });

        stageTitleEl.textContent = stageData.title;
        learningContentEl.innerHTML = renderReadingMaterial(stageData.readingMaterial);

        if (stageData.mcq && stageData.mcq.length > 0) {
            showQuestion(stageData.mcq, 0);
        } else {
            mcqQuestionEl.textContent = 'No quiz available';
            mcqOptionsEl.innerHTML = '';
        }

        hideFeedback(mcqFeedbackEl);
        switchView(viewStage);
        setMode('learn');
    }

    function showQuestion(mcqArray, index) {
        const mcq = mcqArray[index];
        const total = mcqArray.length;
        mcqQuestionEl.textContent = `Question ${index + 1} of ${total}: ${mcq.question}`;
        renderMCQOptions(mcq);
        
        // Show navigation buttons only if stage is completed and has multiple questions
        if (jsonStages[currentStageId].completed && total > 1) {
            mcqNavigationEl.style.display = 'flex';
            // Update button states
            btnPrevQuestion.disabled = index === 0;
            btnNextQuestion.disabled = index === total - 1;
        } else {
            mcqNavigationEl.style.display = 'none';
        }
        
        // Restore selected answer if stage is completed
        if (jsonStages[currentStageId].completed && jsonStages[currentStageId].selectedAnswers && jsonStages[currentStageId].selectedAnswers[index] !== undefined) {
            const optionElements = mcqOptionsEl.querySelectorAll('.mcq-option');
            const selectedIndex = jsonStages[currentStageId].selectedAnswers[index];
            if (optionElements[selectedIndex]) {
                optionElements[selectedIndex].classList.add('correct');
            }
        }
    }

    async function handleMCQAnswer(selectedIndex, correctIndex, optionElement) {
        const stageData = jsonStages[currentStageId];
        const totalQuestions = stageData.mcq?.length || 0;

        if (selectedIndex === correctIndex) {
            optionElement.classList.add('correct');
            
            // Save the selected answer
            if (!jsonStages[currentStageId].selectedAnswers) {
                jsonStages[currentStageId].selectedAnswers = [];
            }
            jsonStages[currentStageId].selectedAnswers[currentQuestionIndex] = selectedIndex;

            if (currentQuestionIndex < totalQuestions - 1) {
                // Show next question
                showFeedback(mcqFeedbackEl, 'Correct! Moving to next question...', 'success');
                setTimeout(() => {
                    currentQuestionIndex++;
                    hideFeedback(mcqFeedbackEl);
                    showQuestion(stageData.mcq, currentQuestionIndex);
                    // Save progress after each correct answer
                    saveProgressToAPI();
                }, 1200);
            } else {
                // All questions answered - mark stage as complete
                showFeedback(mcqFeedbackEl, 'Correct! Lesson complete.', 'success');
                markStageCompleted(currentStageId);
                updateProgress();
                setTimeout(() => {
                    renderMap();
                    switchView(viewMap);
                }, 1200);
            }
        } else {
            optionElement.classList.add('incorrect');
            showFeedback(mcqFeedbackEl, 'Not quite. Review the reading and try again.', 'error');
        }
    }

    function markStageCompleted(stageId) {
        jsonStages[stageId].completed = true;
        const stageKeys = getOrderedStageIds();
        const currentIndex = stageKeys.indexOf(stageId);
        if (currentIndex > -1 && currentIndex + 1 < stageKeys.length) {
            jsonStages[stageKeys[currentIndex + 1]].locked = false;
        }
        // Save progress to API
        saveProgressToAPI();
    }

    function updateProgress() {
        const completed = getOrderedStageIds().filter((id) => jsonStages[id].completed).length;
        const total = getOrderedStageIds().length;
        const progress = Math.round((completed / total) * 100);
        document.getElementById('header-xp').textContent = `Progress: ${progress}/100`;
        document.querySelector('.level-badge').textContent = `Lvl ${Math.max(1, Math.ceil((completed + 1) / 2))}`;
    }

    function switchView(target, isBack = false) {
        document.querySelectorAll('.view').forEach((view) => {
            view.classList.remove('active-view');
            view.style.display = 'none';
        });

        target.classList.add('active-view');
        target.style.display = 'flex';
        currentViewId = target.id;

        if (target.id === 'view-stage') {
            headerXpInfo.style.display = 'flex';
            if (aiChatBubble) aiChatBubble.style.display = 'flex';
        } else {
            if (aiChatBubble) aiChatBubble.style.display = 'none';
            if (aiChatbox) aiChatbox.style.display = 'none';
        }
    }

    function setMode(mode) {
        if (mode === 'learn') {
            learningContentEl.classList.add('active-mode');
            mcqContainer.classList.add('active-mode');
        }
    }

    function goBack() {
        if (currentViewId === 'view-stage') {
            renderMap();
            switchView(viewMap, true);
            return;
        }

        if (currentViewId === 'view-map') {
            renderCourseSelection();
            switchView(viewCourseSelection, true);
            return;
        }

        // At course selection view, redirect to ETI portal
        if (currentViewId === 'view-course-selection') {
            window.location.href = 'https://portal.eti.com.hk/landing/';
            return;
        }
    }

    function initEventListeners() {
        btnEnterCourse.addEventListener('click', enterCourse);
        btnBackCourses.addEventListener('click', goBack);
        btnPrevChapter.addEventListener('click', () => changeChapter(-1));
        btnNextChapter.addEventListener('click', () => changeChapter(1));
        btnJumpStage.addEventListener('click', jumpToStage);
        inputJumpStage.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') jumpToStage();
        });

        // MCQ navigation buttons
        btnPrevQuestion.addEventListener('click', () => {
            const stageData = jsonStages[currentStageId];
            if (currentQuestionIndex > 0 && stageData.mcq) {
                currentQuestionIndex--;
                showQuestion(stageData.mcq, currentQuestionIndex);
            }
        });

        btnNextQuestion.addEventListener('click', () => {
            const stageData = jsonStages[currentStageId];
            const totalQuestions = stageData.mcq?.length || 0;
            if (currentQuestionIndex < totalQuestions - 1 && stageData.mcq) {
                currentQuestionIndex++;
                showQuestion(stageData.mcq, currentQuestionIndex);
            }
        });

        // Payment overlay buttons
        const btnCancelPayment = document.getElementById('btn-cancel-payment');
        const btnPayNow = document.getElementById('btn-pay-now');
        if (btnCancelPayment) {
            btnCancelPayment.addEventListener('click', hidePaymentOverlay);
        }
        if (btnPayNow) {
            btnPayNow.addEventListener('click', () => {
                // TODO: Implement payment logic
                console.log('💳 Payment clicked - implement payment integration');
                // For now, just mark as paid and unlock
                const stageKeys = getOrderedStageIds();
                const lastStageId = stageKeys[stageKeys.length - 1];
                if (jsonStages[lastStageId]) {
                    jsonStages[lastStageId].paid = true;
                    saveProgressToAPI();
                    hidePaymentOverlay();
                    renderMap();
                }
            });
        }
    }

    function createStars() {
        const canvas = document.getElementById('star-canvas');
        const ctx = canvas.getContext('2d');
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resize();
        window.addEventListener('resize', resize);

        const stars = Array.from({ length: 90 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.3 + 0.3,
            speed: Math.random() * 0.25 + 0.05
        }));

        function tick() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            stars.forEach((star) => {
                star.y += star.speed;
                if (star.y > canvas.height + 2) {
                    star.y = -2;
                    star.x = Math.random() * canvas.width;
                }
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
                ctx.fill();
            });
            requestAnimationFrame(tick);
        }

        tick();
    }

    async function checkAuth() {
        // First check for token in URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        
        if (urlToken) {
            // Validate URL token with ETI auth API
            try {
                const res = await fetch('https://auth.eti.com.hk/api/profile', {
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

        try {
            const res = await fetch('https://auth.eti.com.hk/api/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                console.log('🟢 checkAuth: Authentication successful');
                return true;
            } else {
                console.log('🔴 checkAuth: Token validation failed.');
                localStorage.removeItem('eti_jwt_token');
                window.location.href = 'https://portal.eti.com.hk/landing/';
                return false;
            }
        } catch (e) {
            console.error('Auth verification failed:', e);
            return false;
        }
    }

    async function testAIBackend() {
        console.log("--- AI Multi-Step Test Start ---");

        try {
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

        const course = courseList[selectedCourseId];
        const stageData = jsonStages[currentStageId];

        let systemPrompt = `You are an expert AI tutor for the "${course ? course.title : 'AI Essentials'}" course. `;
        systemPrompt += `The user is currently on Stage: ${stageData ? stageData.title : 'General'}. `;
        if (stageData && stageData.readingMaterial) {
            systemPrompt += `The current learning material is: "${Array.isArray(stageData.readingMaterial) ? stageData.readingMaterial.map(item => item.text || '').join(' ') : stageData.readingMaterial}". `;
        }

        systemPrompt += "\n\nCRITICAL INSTRUCTIONS:\n";
        systemPrompt += "1. ONLY answer questions related to this AI course, AI tools, prompt writing, or the current stage.\n";
        systemPrompt += "2. If the user asks anything UNRELATED to AI or this course (e.g., general knowledge, personal questions, other topics), you MUST politely refuse and tell them you can only assist with the course content.\n";
        systemPrompt += "3. Keep your answers concise and helpful for a student. Limit your response strictly to 10-20 words.\n";
        systemPrompt += "4. Focus on helping them understand AI concepts, prompt writing, and safe AI use.\n";

        const fullMessage = `${systemPrompt}\n\nUser Question: ${message}`;

        addChatMessage(message, 'user');
        chatInput.value = '';

        const typingId = 'typing-' + Date.now();
        const typingEl = document.createElement('div');
        typingEl.className = 'message ai typing';
        typingEl.id = typingId;
        typingEl.textContent = 'Thinking...';
        chatMessages.appendChild(typingEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            if (!aiToken) {
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

        // Initialize AI Chat
        initAIChat();

        // Load stages from API
        await loadStagesFromAPI();
        
        // Unlock first stage
        const stageKeys = getOrderedStageIds();
        if (stageKeys.length > 0) {
            jsonStages[stageKeys[0]].locked = false;
        }
        
        initEventListeners();
        createStars();
        renderCourseSelection();
        updateProgress();
        switchView(viewCourseSelection);
    }

    init();
})();
