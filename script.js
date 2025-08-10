let userData = {};
let chatHistory = [];
let sessionId = null;
let isTyping = false;

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const toggleBtn = document.querySelector('.theme-toggle');
    toggleBtn.textContent = newTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
}

// Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const toggleBtn = document.querySelector('.theme-toggle');
    if (toggleBtn) {
        toggleBtn.textContent = savedTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    }
}

// Show loading screen
function showLoadingScreen() {
    let formScreen = document.getElementById('userForm');
    if (formScreen) {
        formScreen.style.opacity = '0';
        setTimeout(() => {
            formScreen.style.display = 'none';
        }, 500);
    }
    let loadingScreen = document.getElementById('loadingScreen');
    if (!loadingScreen) {
        loadingScreen = document.createElement('div');
        loadingScreen.id = 'loadingScreen';
        loadingScreen.innerHTML = `
            <div class="loading-content">
                <div class="loading-bee">🐝</div>
                <div class="loading-text">Checking for previous conversations...</div>
                <div class="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        loadingScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--bg-color);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            transition: opacity 0.5s ease;
        `;
        document.body.appendChild(loadingScreen);
        
        // Add CSS for loading animations
        const style = document.createElement('style');
        style.textContent = `
            .loading-content {
                text-align: center;
                color: var(--text-color);
            }
            
            .loading-bee {
                font-size: 3rem;
                margin-bottom: 1rem;
                animation: bounce 2s infinite;
            }
            
            .loading-text {
                font-size: 1.1rem;
                margin-bottom: 1rem;
                color: var(--text-secondary);
            }
            
            .loading-dots {
                display: flex;
                justify-content: center;
                gap: 0.5rem;
            }
            
            .loading-dots span {
                width: 8px;
                height: 8px;
                background: var(--accent-color);
                border-radius: 50%;
                animation: pulse 1.5s infinite;
            }
            
            .loading-dots span:nth-child(2) {
                animation-delay: 0.3s;
            }
            
            .loading-dots span:nth-child(3) {
                animation-delay: 0.6s;
            }
            
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 0.3; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.2); }
            }
        `;
        document.head.appendChild(style);
    }
    
    loadingScreen.style.display = 'flex';
    loadingScreen.style.opacity = '1';
}

// Hide loading screen
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}

// Update loading text
function updateLoadingText(text) {
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) {
        loadingText.textContent = text;
    }
}

// Generate unique user identifier for session validation
function generateUserKey(userData) {
    return `${userData.userName}_${userData.timestamp}`;
}

// Generate a simple session ID without complex hashing
function generateSessionId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `session_${timestamp}_${random}`;
}

// Quick synchronous check for user data
function hasStoredUserData() {
    try {
        const saved = localStorage.getItem('user');
        if (!saved) return false;
        
        const userData = JSON.parse(saved);
        return userData && userData.userName && userData.timestamp;
    } catch (error) {
        console.error('[ERROR] Failed to check stored user data:', error);
        return false;
    }
}

// Fast session restoration
async function restoreUserSession() {
    updateLoadingText('Loading your profile...');
    
    const saved = localStorage.getItem('user');
    if (!saved) return false;

    try {
        userData = JSON.parse(saved);
        const userKey = generateUserKey(userData);
        
        updateLoadingText('Restoring chat history...');
        
        // Load session data synchronously (faster)
        sessionId = localStorage.getItem(`beewell_session_id_${userKey}`);
        const storedChatHistory = localStorage.getItem(`beewell_chat_history_${userKey}`);
        chatHistory = storedChatHistory ? JSON.parse(storedChatHistory) : [];

        // Validate session data
        if (!sessionId) {
            console.log('[DEBUG] No session ID found, generating new one');
            sessionId = generateSessionId();
            localStorage.setItem(`beewell_session_id_${userKey}`, sessionId);
        }

        updateLoadingText('Connecting to server...');

        // Test backend connection in background (don't block UI)
        if (chatHistory.length > 0) {
            console.log(`[DEBUG] Attempting to restore session with ${chatHistory.length} messages`);
            
            // Don't await this - let it run in background
            testSessionRestore().catch(error => {
                console.warn('[WARN] Backend session restore failed, but continuing with local history:', error);
            });
        }

        return true;
    } catch (error) {
        console.error('[ERROR] Failed to restore user session:', error);
        return false;
    }
}

// Test if backend can restore the session properly (non-blocking)
async function testSessionRestore() {
    if (!userData.userName || chatHistory.length === 0) return;

    const testMessage = "continue";
    
    const requestBody = {
        message: testMessage,
        user_data: userData,
        chat_history: chatHistory,
        session_id: sessionId
    };

    const response = await fetch("https://bee-well-backend.onrender.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        throw new Error(`Session restore test failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('[DEBUG] Session restore test successful');
}

// Quick backend health check (with timeout)
async function quickBackendCheck() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        const response = await fetch('https://bee-well-backend.onrender.com/', {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            console.log('[DEBUG] Backend status:', data);
            return true;
        }
        return false;
    } catch (error) {
        console.log('[WARN] Backend connection issue (non-blocking):', error.message);
        return false;
    }
}

// Enhanced loadUserData function with loading screen
async function loadUserData() {
    // Check if we have user data immediately
    const hasUserData = hasStoredUserData();
    
    if (hasUserData) {
        showLoadingScreen();
        
        try {
            // Start backend check in background (don't block)
            quickBackendCheck();
            
            // Restore user session (fast)
            const restored = await restoreUserSession();
            
            if (restored && userData.userName) {
                console.log(`[DEBUG] Successfully restored session for ${userData.userName}`);
                console.log(`[DEBUG] Session ID: ${sessionId}`);
                console.log(`[DEBUG] Chat history: ${chatHistory.length} messages`);
                
                updateLoadingText('Almost ready...');
                
                // Small delay to show completion
                await new Promise(resolve => setTimeout(resolve, 500));
                
                hideLoadingScreen();
                showChatInterface();
                loadChatHistory();
                
                // Show welcome back message if returning user
                if (chatHistory.length > 0) {
                    showWelcomeBackMessage();
                }
                return;
            }
        } catch (error) {
            console.error('[ERROR] Failed to load user data:', error);
            hideLoadingScreen();
        }
    }
    
    // No user data or failed to restore - show welcome screen
    console.log('[DEBUG] No valid session to restore');
    hideLoadingScreen();
    document.querySelector('.new-session-btn')?.classList.remove('show');
    document.querySelector('.btn1-secondary')?.classList.remove('show');
    showWelcomeScreen();
}

// Show a subtle welcome back message
function showWelcomeBackMessage() {
    const lastMessageTime = chatHistory.length > 0 ? 
        new Date(chatHistory[chatHistory.length - 1].timestamp) : null;
    
    if (lastMessageTime) {
        const daysSince = Math.floor((new Date() - lastMessageTime) / (1000 * 60 * 60 * 24));
        
        if (daysSince > 0) {
            const welcomeBackDiv = document.createElement('div');
            welcomeBackDiv.className = 'welcome-back-message';
            welcomeBackDiv.style.cssText = `
                background: var(--accent-color);
                color: white;
                padding: 10px 15px;
                margin: 10px;
                border-radius: 8px;
                text-align: center;
                font-size: 14px;
                opacity: 0.9;
                animation: slideIn 0.5s ease;
            `;
            
            let message = `Welcome back, ${userData.userName}! `;
            if (daysSince === 1) {
                message += "Continuing from yesterday's conversation.";
            } else {
                message += `Continuing from ${daysSince} days ago.`;
            }
            
            welcomeBackDiv.textContent = message;
            
            const messagesContainer = document.getElementById('chatMessages');
            messagesContainer.insertBefore(welcomeBackDiv, messagesContainer.firstChild);
            
            // Remove welcome back message after 5 seconds
            setTimeout(() => {
                if (welcomeBackDiv.parentNode) {
                    welcomeBackDiv.style.opacity = '0';
                    welcomeBackDiv.style.transform = 'translateY(-20px)';
                    setTimeout(() => welcomeBackDiv.remove(), 300);
                }
            }, 5000);
        }
    }
}

// Enhanced error handling for API calls
async function callBackendAPI(userMessage) {
    console.log(`[DEBUG] Sending message to backend for ${userData.userName}:`, userMessage);
    console.log('[DEBUG] Current session ID:', sessionId);
    console.log('[DEBUG] Chat history length:', chatHistory.length);
    
    if (!userData.userName || !userData.timestamp) {
        throw new Error('User data is incomplete');
    }
    
    // Ensure we have a session ID
    if (!sessionId) {
        sessionId = generateSessionId();
        const userKey = generateUserKey(userData);
        localStorage.setItem(`beewell_session_id_${userKey}`, sessionId);
        console.log('[DEBUG] Generated new session ID:', sessionId);
    }
    
    try {
        const requestBody = {
            message: userMessage,
            user_data: userData,
            chat_history: chatHistory,
            session_id: sessionId
        };
        
        console.log('[DEBUG] Request body:', {
            ...requestBody,
            chat_history: `Array of ${requestBody.chat_history.length} messages`
        });
        
        const response = await fetch("https://bee-well-backend.onrender.com/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('[DEBUG] Backend response:', data);
        
        return {
            agent: data.agent || 'Therapist',
            response: data.response || 'I\'m having trouble processing that right now. Could you try rephrasing?'
        };
    } catch (error) {
        console.error('[ERROR] Backend API call failed:', error);
        throw error;
    }
}

// Save user data with user-specific keys
function saveUserData() {
    if (!userData.userName || !userData.timestamp) {
        console.error('[ERROR] Cannot save data without user name and timestamp');
        return;
    }
    
    const userKey = generateUserKey(userData);
    
    // Save user profile
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Save chat history with user-specific key
    localStorage.setItem(`beewell_chat_history_${userKey}`, JSON.stringify(chatHistory));
    
    // Save session ID with user-specific key
    if (sessionId) {
        localStorage.setItem(`beewell_session_id_${userKey}`, sessionId);
        console.log(`[DEBUG] Saved session ID for ${userData.userName}: ${sessionId}`);
    }
}

// Form submission with enhanced user identification
async function handleFormSubmission(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    userData = {
        userName: formData.get('userName'),
        userAge: formData.get('userAge'),
        userCountry: formData.get('userCountry'),
        financialStatus: formData.get('financialStatus'),
        hasDiagnosis: formData.has('hasDiagnosis'),
        timestamp: new Date().toISOString(),
    };
    
    // Generate new session for new user
    sessionId = generateSessionId();
    chatHistory = [];
    
    saveUserData();
    sendWelcomeMessage();
    showChatInterface();
    console.log('Saved user data:', userData);
}

// Chat screen
function showChatInterface() {
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('chatInterface').style.display = 'flex';
    
    // Show new session button
    document.querySelector('.new-session-btn')?.classList.add('show');
    document.querySelector('.btn1-secondary')?.classList.add('show');
    
    // User info display
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.textContent = `${userData.userName} • ${userData.userAge} • ${userData.userCountry}`;
    }
    
    // Focus on chat input
    setTimeout(() => {
        document.getElementById('chatInput')?.focus();
    }, 100);
}

// Welcome screen with proper cleanup
function showWelcomeScreen() {
    if (chatHistory.length > 0) {
        if (!confirm('Are you sure you want to create new user profile? This will clear your current user profile and chat history and you will not be able to access it again.')) {
            return;
        }
    }
    
    // Clear current user's data
    if (userData.userName && userData.timestamp) {
        const userKey = generateUserKey(userData);
        localStorage.removeItem(`beewell_chat_history_${userKey}`);
        localStorage.removeItem(`beewell_session_id_${userKey}`);
    }
    
    // Clear general data
    localStorage.removeItem('user');
    userData = {};
    chatHistory = [];
    sessionId = null;
    
    // Reset form
    document.getElementById('userForm')?.reset();
    
    // Show welcome screen and hide new session button
    document.getElementById('welcomeScreen').style.display = 'block';
    document.getElementById('chatInterface').style.display = 'none';
    document.querySelector('.new-session-btn')?.classList.remove('show');
    document.querySelector('.btn1-secondary')?.classList.remove('show');
    
    // Clear chat messages
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
}

function newChat() {
    if (chatHistory.length > 0) {
        if (!confirm('Are you sure you want to start a new chat? This will clear your current chat history. And you will not be able to access this chat again.')) {
            return;
        }
    }
    
    // Clear current user's chat data but keep user profile
    if (userData.userName && userData.timestamp) {
        const userKey = generateUserKey(userData);
        localStorage.removeItem(`beewell_chat_history_${userKey}`);
        // Generate new session ID for new chat
        sessionId = generateSessionId();
        localStorage.setItem(`beewell_session_id_${userKey}`, sessionId);
    }
    
    // Reset chat data
    chatHistory = [];
    
    // Clear chat messages
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
    
    // Send new welcome message
    sendWelcomeMessage();
}

// Send welcome message
function sendWelcomeMessage() {
    const welcomeMsg = `Hello ${userData.userName}! 🐝 I'm Bee, your mental health companion. I'm here to provide emotional support, information related to mental health or disorders and help you find resources when you need them.

I can help you with:
<ul style='padding-left:47px;'>
<li> Emotional support and active listening</li>
<li> Coping strategies and mindfulness techniques</li>
<li> Mental health resources and helplines</li>
<li> Information on various disorders based on symptoms</li>
<li> General guidance on wellness</li>
</ul>
Feel free to share what's on your mind. Everything we discuss is private and I'm here to support you without judgment. How are you feeling today?`;

    addMessage('bot', welcomeMsg, 'Therapist');
}

// Add message to chat
function addMessage(sender, content, agentType = '') {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? userData.userName.charAt(0).toUpperCase() : '🐝';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    if (sender === 'bot' && agentType) {
        const agentLabel = document.createElement('div');
        agentLabel.className = 'agent-label';
        agentLabel.textContent = `Bee • ${agentType}`;
        messageContent.appendChild(agentLabel);
    }

    const messageText = document.createElement('div');
    messageText.innerHTML = content;

    messageContent.appendChild(messageText);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    messagesContainer.appendChild(messageDiv);

    // Save to chat history
    const messageObj = {
        sender,
        content,
        agentType,
        timestamp: new Date().toISOString()
    };
    
    chatHistory.push(messageObj);
    saveUserData();

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    console.log(`[DEBUG] Added message for ${userData.userName}: ${sender === 'user' ? 'User' : 'Bot'}`);
}

// Load chat history
function loadChatHistory() {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '';

    chatHistory.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.sender}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = msg.sender === 'user' ? userData.userName.charAt(0).toUpperCase() : '🐝';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        if (msg.sender === 'bot' && msg.agentType) {
            const agentLabel = document.createElement('div');
            agentLabel.className = 'agent-label';
            agentLabel.textContent = `Bee • ${msg.agentType}`;
            messageContent.appendChild(agentLabel);
        }

        const messageText = document.createElement('div');
        messageText.innerHTML = msg.content;
        messageContent.appendChild(messageText);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        messagesContainer.appendChild(messageDiv);
    });

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send message
function sendMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    
    const message = input.value.trim();

    if (!message || isTyping) return;

    // Add user message
    addMessage('user', message);
    input.value = '';

    // Show typing indicator and handle bot response
    showTypingIndicator();
    handleBotResponse(message);
}

// Handle enter key in chat input
function handleEnterKey(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Show typing indicator
function showTypingIndicator() {
    isTyping = true;
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = 'flex';
    }
    
    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Hide typing indicator
function hideTypingIndicator() {
    isTyping = false;
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

function renderMarkdown(content) {
    if (typeof marked !== 'undefined') {
        return marked.parse(content);
    }
    return content; // Fallback if marked is not available
}

// Handle bot response with improved error handling
async function handleBotResponse(userMessage) {
    console.log(`[DEBUG] Handling bot response for ${userData.userName}:`, userMessage);
    
    try {
        // Call backend API (typing indicator is already showing)
        const result = await callBackendAPI(userMessage);
        console.log('Backend response:', result);
        
        const mdmessage = renderMarkdown(result.response);

        // Add the bot message to the chat
        addMessage('bot', mdmessage, result.agent);
        
        // Hide typing indicator ONLY after the message is displayed
        hideTypingIndicator();
    } catch (error) {
        console.error('Error in handleBotResponse:', error);
        addMessage('bot', 'I\'m experiencing some technical difficulties. Please try again in a moment.', 'System');
        
        // Hide typing indicator even on error
        hideTypingIndicator();
    }
}

// Auto-resize textarea
function autoResize() {
    const textarea = document.getElementById('chatInput');
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
}

// Enhanced message handling with better animations
function animateNewMessage(messageElement) {
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateY(20px)';
    
    requestAnimationFrame(() => {
        messageElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        messageElement.style.opacity = '1';
        messageElement.style.transform = 'translateY(0)';
    });
}

// Accessibility improvements
function initAccessibility() {
    // Add ARIA labels and keyboard navigation
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.setAttribute('aria-label', 'Type your message to Bee');
    }
    
    const sendBtn = document.querySelector('.send-btn');
    if (sendBtn) {
        sendBtn.setAttribute('aria-label', 'Send message');
    }
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            sendMessage();
        }
    });
}

// Debug function to check session state
function debugSessionState() {
    console.log('[DEBUG] Current session state:');
    console.log('- User:', userData.userName);
    console.log('- Session ID:', sessionId);
    console.log('- Chat history length:', chatHistory.length);
    
    if (userData.userName && userData.timestamp) {
        const userKey = generateUserKey(userData);
        console.log('- User key:', userKey);
        console.log('- Stored session ID:', localStorage.getItem(`beewell_session_id_${userKey}`));
        console.log('- Stored chat history length:', 
            JSON.parse(localStorage.getItem(`beewell_chat_history_${userKey}`) || '[]').length);
    }
}

// Initialize the app
async function initializeApp() {
    console.log('[DEBUG] Initializing BeeWell app...');
    
    // Initialize theme first (synchronous)
    initTheme();
    
    // Start loading user data immediately
    await loadUserData();
    
    // Initialize accessibility
    initAccessibility();
    
    // Add form submission event listener
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', handleFormSubmission);
        console.log('[DEBUG] Form event listener added');
    }

    // Add event listener for textarea auto-resize
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('input', autoResize);
        
        // Add helpful UI feedback
        chatInput.addEventListener('focus', function() {
            this.setAttribute('placeholder', 'I\'m here to listen...');
        });

        chatInput.addEventListener('blur', function() {
            this.setAttribute('placeholder', 'Share what\'s on your mind...');
        });

        // Add pulse animation to send button when input has text
        chatInput.addEventListener('input', function() {
            const sendBtn = document.querySelector('.send-btn');
            if (sendBtn) {
                if (this.value.trim()) {
                    sendBtn.style.animation = 'pulse 2s infinite';
                } else {
                    sendBtn.style.animation = 'none';
                }
            }
        });
    }
    
    // Add debug console command
    window.debugSession = debugSessionState;
    
    console.log('[DEBUG] App initialization complete');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);