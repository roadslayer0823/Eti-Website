// Category Data
const CATEGORY_DETAILS = {
    coding: {
        title: "Master the Future",
        description: `
            <p>Dive into the world of logic and creation. Our Coding path covers everything from basic algorithms to advanced web development.</p>
            <p><strong>What you'll learn:</strong><br>• Problem-solving mindsets<br>• Syntax & Logic<br>• Real-world applications</p>
        `
    },
    chinese: {
        title: "Chinese Teaching Assistant",
        description: `
            <p>AI-powered tool for creating lesson plans, handouts, and teaching materials for Chinese language education. Perfect for educators to streamline their teaching workflow.</p>
            <p><strong>Features:</strong><br>• AI Lesson Planning<br>• Handout Generation<br>• Teaching Materials<br>• HK Curriculum Aligned</p>
        `
    },
    english: {
        title: "English of Might and Magic",
        description: `
            <p>Enter an RPG story world where every choice teaches English vocabulary, grammar, and reading comprehension.</p>
            <p><strong>What you'll learn:</strong><br>• Immersive narrative English<br>• Context-based vocabulary<br>• Adventure-driven listening and reading</p>
        `
    },
    math: {
        title: "AI Essentials",
        description: `
            <p>Learn to use AI tools effectively for study, work, and daily tasks. Master prompt writing and safe AI practices.</p>
            <p><strong>What you'll learn:</strong><br>• Prompt writing<br>• Checking answers<br>• Safer AI use<br>• Real-world examples</p>
        `
    }
};

function composeUserKey(email, category) {
    const safeEmail = email.trim().toLowerCase();
    const safeCategory = (category || 'all').trim().toLowerCase();
    return `${safeEmail}::${safeCategory}`;
}

function normalizeEmail(email) {
    return email.trim().toLowerCase();
}

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

function updateTimerUI(exp, remainingTokens, isUnlimited) {
    const timerUI = document.getElementById('session-timer-display');
    const tokenUI = document.getElementById('token-display-box');
    const timeSpan = document.getElementById('time-remaining');
    const tokenSpan = document.getElementById('token-remaining');
    
    if (!currentToken) {
        if (timerUI) timerUI.style.display = 'none';
        if (tokenUI) tokenUI.style.display = 'none';
        if (sessionCountdownInterval) clearInterval(sessionCountdownInterval);
        return;
    }

    if (timerUI) timerUI.style.display = 'block';
    if (tokenUI) tokenUI.style.display = 'block';
    if (tokenSpan && remainingTokens !== undefined) {
        tokenSpan.textContent = remainingTokens;
    }
    
    if (sessionCountdownInterval) clearInterval(sessionCountdownInterval);

    if (isUnlimited || !exp) {
        if (timeSpan) timeSpan.textContent = 'Unlimited';
        return;
    }
    
    sessionCountdownInterval = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
        const diff = exp - now;
        
        if (diff <= 0) {
            if (timeSpan) timeSpan.textContent = '00:00';
            clearInterval(sessionCountdownInterval);
            handleLogout();
            showAuthMessage('Session expired. Auto logging out.', 'error');
            return;
        }

        const mins = Math.floor(diff / 60).toString().padStart(2, '0');
        const secs = (diff % 60).toString().padStart(2, '0');
        if (timeSpan) timeSpan.textContent = `${mins}:${secs}`;
    }, 1000);
}

// State Management
let selectedCategory = '';
const API_BASE = 'https://auth.eti.com.hk/api';
let currentToken = localStorage.getItem('eti_jwt_token');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('EtiEdu Initialized');
    if (currentToken) {
        console.log('Session found, checking profile...');
        fetchProfile();
    } else {
        showSection('auth-section');
    }
});

// Navigation Functions
function showSection(id) {
    const currentSection = document.querySelector('section.active');
    const targetSection = document.getElementById(id);

    if (currentSection) {
        currentSection.classList.remove('active');
        // Wait for the fade-out animation to finish before hiding
        setTimeout(() => {
            currentSection.style.display = 'none';
            prepareAndShowTarget(targetSection);
        }, 500); // Matches the 0.5s CSS transition
    } else {
        prepareAndShowTarget(targetSection);
    }
}

function prepareAndShowTarget(targetSection) {
    targetSection.style.display = 'block';
    // Small delay to ensure the browser registers the display change for animation
    setTimeout(() => {
        targetSection.classList.add('active');
    }, 20);
}

function selectCategory(category) {
    selectedCategory = category;

    // If already logged in, redirect to the app
    if (currentToken) {
        if (category === 'coding') {
            window.location.href = 'https://portal.eti.com.hk/landing/coding/';
            return;
        }
        if (category === 'english') {
            window.location.href = 'https://portal.eti.com.hk/landing/txtadv/';
            return;
        }
        if (category === 'chinese') {
            // Redirect to AI Teaching Assistant with authentication token
            const urlWithAuth = `https://portal.eti.com.hk/landing/teaching-assistant/`;
            window.location.href = urlWithAuth;
            return;
        }
        if (category === 'math') {
            // Redirect to Educational AI with authentication token
            const urlWithAuth = `https://portal.eti.com.hk/landing/ai-course/`;
            window.location.href = urlWithAuth;
            return;
        }
        // Success - show dashboard for any other categories
        document.getElementById('category-name').textContent = category.toUpperCase();
        document.getElementById('target-page-message').textContent = `Ready to learn?`;
        showSection('dashboard-section');
        return;
    }

    // Otherwise, show auth with details (optional, but since we now login first, 
    // we might not even hit this if we set auth as default)
    const detail = CATEGORY_DETAILS[category];
    if (detail) {
        document.getElementById('intro-title').textContent = detail.title;
        document.getElementById('intro-content').innerHTML = detail.description;
    }

    showSection('auth-section');
}

function toggleAuth(showRegister) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (showRegister) {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    } else {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    }
}

// Auth Logic
async function handleRegister() {
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const school = document.getElementById('reg-school').value;
    const teacher = document.getElementById('reg-teacher').value;
    const subject = document.getElementById('reg-subject').value;
    const interestedField = document.getElementById('reg-interest').value;

    if (!email || !phone || !school || !teacher) {
        showAuthMessage('Please fill in all required fields', 'error');
        return;
    }

    const effectiveSubject = selectedCategory || 'all';
    const userKey = composeUserKey(email, effectiveSubject);

    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: userKey,
                phone,
                subject: effectiveSubject, // The path selected or 'all'
                interestedField,
                metadata: { school, teacher, handled_subject: subject, originalEmail: normalizeEmail(email) }
            })
        });

        const data = await response.json();

        if (response.ok) {
            showAuthMessage('Registration successful! You can now login.', 'success');
            setTimeout(() => toggleAuth(false), 1500);
        } else {
            // Show the actual error message from the backend
            showAuthMessage(data.error || 'Registration failed', 'error');
            console.error('Registration Error:', data);
        }
    } catch (error) {
        showAuthMessage('API Error: ' + error.message, 'error');
    }
}

let isProcessingLogin = false;
async function handleLogin() {
    if (isProcessingLogin) return;
    const email = document.getElementById('login-email').value;

    if (!email) {
        showAuthMessage('Please enter your email', 'error');
        return;
    }

    isProcessingLogin = true;
    const effectiveSubject = selectedCategory || 'all';
    const userKey = composeUserKey(email, effectiveSubject);

    try {
        let response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: userKey,
                subject: effectiveSubject // Must match the registered subject or 'all'
            })
        });

        let data = await response.json();

        if (!response.ok || !data.token) {
            // Fallback for existing email-only accounts (backward compatibility)
            const fallback = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: normalizeEmail(email),
                    subject: effectiveSubject
                })
            });
            data = await fallback.json();

            if (fallback.ok && data.token) {
                response = fallback; // use fallback path for success
            }
        }

        if (response.ok && data.token) {
            currentToken = data.token;
            localStorage.setItem('eti_jwt_token', currentToken);
            showAuthMessage('Login successful!', 'success');

            const decoded = decodeJWT(currentToken);
            if (decoded) {
                updateTimerUI(decoded.exp, decoded.remainingTokens, decoded.isUnlimited);
            }

            // Optionally fetch profile to ensure token is valid and get user data
            // This will also trigger showSection('landing-section') on success
            await fetchProfile();
        } else {
            showAuthMessage(data.error || 'Invalid credentials', 'error');
        }
    } catch (error) {
        showAuthMessage('API Error: ' + error.message, 'error');
    } finally {
        isProcessingLogin = false;
    }
}

async function fetchProfile() {
    try {
        const response = await fetch(`${API_BASE}/profile`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            const decoded = decodeJWT(currentToken);
            if (decoded) {
                updateTimerUI(decoded.exp, decoded.remainingTokens, decoded.isUnlimited);
            }
            // Success - show landing section (Course Selection)
            showSection('landing-section');
        } else {
            // Token likely expired
            handleLogout();
        }
    } catch (error) {
        console.error('Profile fetch error:', error);
    }
}

async function handleLogout() {
    try {
        await fetch(`${API_BASE}/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) { }

    currentToken = null;
    localStorage.removeItem('eti_jwt_token');
    updateTimerUI(null, null);
    showSection('auth-section');
}

function showAuthMessage(msg, type) {
    // Create or update a status message element
    let msgEl = document.getElementById('auth-message');
    if (!msgEl) {
        msgEl = document.createElement('div');
        msgEl.id = 'auth-message';
        msgEl.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            padding: 1rem 2rem;
            border-radius: 12px;
            background: rgba(0,0,0,0.8);
            backdrop-filter: blur(10px);
            color: white;
            z-index: 1000;
            font-size: 0.9rem;
            border-left: 4px solid var(--primary);
            box-shadow: var(--shadow);
            animation: fadeIn 0.3s ease-out;
        `;
        document.body.appendChild(msgEl);
    }
    msgEl.textContent = msg;
    msgEl.style.borderColor = type === 'error' ? 'var(--accent)' : 'var(--primary)';
    msgEl.style.display = 'block';

    setTimeout(() => {
        msgEl.style.display = 'none';
    }, 3000);
}
