let userData = {};
let chatHistory = [];
let isTyping = false;


function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const toggleBtn = document.querySelector('.theme-toggle');
    toggleBtn.textContent = newTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
}

//Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const toggleBtn = document.querySelector('.theme-toggle');
    toggleBtn.textContent = savedTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    loadUserData();
    loadChatHistory();
}

//Load user data and chat history
function loadUserData() {
    const saved = localStorage.getItem('user');
    fetch('https://bee-well-backend.onrender.com/').then(response=>response.json()).then(data=>console.log(data)).catch(e=>console.log(e))
    if (saved) {
        userData = JSON.parse(saved);
        chatHistory = JSON.parse(localStorage.getItem('beewell_chat_history')) || [];
        
        if (userData.userName) {
            showChatInterface();
            loadChatHistory();
        } else {
            //Hide new session button on welcome screen
            document.querySelector('.new-session-btn').classList.remove('show');
            document.querySelector('.btn1-secondary').classList.remove('show');
            showWelcomeScreen();
        }
    } else {
        //Hide new session button on welcome screen
        document.querySelector('.new-session-btn').classList.remove('show');
        document.querySelector('.btn1-secondary').classList.remove('show');
    }
}

//Save user data
function saveUserData() {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('beewell_chat_history', JSON.stringify(chatHistory));
}

//form submission
async function handleFormSubmission(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    userData = {
        userName: formData.get('userName'),
        userAge: formData.get('userAge'),
        userCountry: formData.get('userCountry'),
        financialStatus: formData.get('financialStatus'), //Fixed: matches backend
        hasDiagnosis: formData.has('hasDiagnosis'),
        timestamp: new Date().toISOString()
    };

    console.log('Sending user data:', userData); //Debug log

    try {
        //Send user data to backend
        const response = await fetch('https://bee-well-backend.onrender.com/api/userdata', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('User data response:', result); //Debug log

        saveUserData();
        showChatInterface();
        sendWelcomeMessage();
    } catch (error) {
        console.error('Error sending user data:', error);
        alert('There was an error setting up your profile. Please try again.');
    }
}

//chat screen
function showChatInterface() {
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('chatInterface').style.display = 'flex';
    
    //new session button
    document.querySelector('.new-session-btn').classList.add('show');
    document.querySelector('.btn1-secondary').classList.add('show');
    
    //user info display
    const userInfo = document.getElementById('userInfo');
    userInfo.textContent = `${userData.userName} • ${userData.userAge} • ${userData.userCountry}`;
    
    //Focus on chat input
    setTimeout(() => {
        document.getElementById('chatInput').focus();
    }, 100);
}

//welcome screen
function showWelcomeScreen() {
    if (chatHistory.length > 0) {
        if (!confirm('Are you sure you want to create new user profile? This will clear your current user profile and chat history and you will not be able to access it again.')) {
            return;
        }
    }
    
    //Clear data
    localStorage.removeItem('user');
    localStorage.removeItem('beewell_chat_history');
    userData = {};
    chatHistory = [];
    
    //Reset form
    document.getElementById('userForm').reset();
    
    //Show welcome screen and hide new session button
    document.getElementById('welcomeScreen').style.display = 'block';
    document.getElementById('chatInterface').style.display = 'none';
    document.querySelector('.new-session-btn').classList.remove('show');
    document.querySelector('.btn1-secondary').classList.remove('show');
    
    //Clear chat messages
    document.getElementById('chatMessages').innerHTML = '';
}


function newChat() {
    if (chatHistory.length > 0) {
        if (!confirm('Are you sure you want to start a new chat? This will clear your current chat history. And you will not be able to access this chat again.')) {
            return;
        }
    }
    
    //Clear data
    localStorage.removeItem('beewell_chat_history');
    chatHistory = [];
    loadUserData();
    //Clear chat messages
    document.getElementById('chatMessages').innerHTML = '';
}

//Send welcome message
function sendWelcomeMessage() {
    const welcomeMsg = `Hello ${userData.userName}! 🐝 I'm Bee, your mental health companion. I'm here to provide emotional support, information related to mental health or disorders and help you find resources when you need them.

I can help you with:
<ul>
<li> Emotional support and active listening</li>
<li> Coping strategies and mindfulness techniques</li>
<li> Mental health resources and helplines</li>
<li> Information on various disorders based on symptoms</li>
<li> General guidance on wellness</li>
</ul>
Feel free to share what's on your mind. Everything we discuss is private and I'm here to support you without judgment. How are you feeling today?`;

    addMessage('bot', welcomeMsg, 'Therapist');
}



//Add message to chat
function addMessage(sender, content, agentType = '') {
    const messagesContainer = document.getElementById('chatMessages');
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

    //Save to chat history
    chatHistory.push({
        sender,
        content,
        agentType,
        timestamp: new Date().toISOString()
    });
    saveUserData();

    //Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

//Load chat history
function loadChatHistory() {
    const messagesContainer = document.getElementById('chatMessages');
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

    //Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

//Send message
function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message || isTyping) return;

    //Add user message
    addMessage('user', message);
    input.value = '';

    //Show typing indicator and handle bot response
    showTypingIndicator();
    handleBotResponse(message);
}

//Handle enter key in chat input
function handleEnterKey(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

//Show typing indicator
function showTypingIndicator() {
    isTyping = true;
    const indicator = document.getElementById('typingIndicator');
    indicator.style.display = 'flex';
    
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

//Hide typing indicator
function hideTypingIndicator() {
    isTyping = false;
    const indicator = document.getElementById('typingIndicator');
    indicator.style.display = 'none';
}

function renderMarkdown(content) {
    const html = marked.parse(content); 
    return html;
  }

//Handle bot response 
async function handleBotResponse(userMessage) {
    console.log('Handling bot response for:', userMessage);
    
    try {
        //Call backend API (typing indicator is already showing)
        const result = await callBackendAPI(userMessage);
        console.log('Adding bot message:', result);
        
        const mdmessage=renderMarkdown(result.response);

        //Add the bot message to the chat
        addMessage('bot', mdmessage, result.agent);
        
        //Hide typing indicator ONLY after the message is displayed
        hideTypingIndicator();
    } catch (error) {
        console.error('Error in handleBotResponse:', error);
        addMessage('bot', 'I\'m experiencing some technical difficulties. Please try again in a moment.', 'System');
        
        //Hide typing indicator even on error
        hideTypingIndicator();
    }
}

//Backend API call
async function callBackendAPI(userMessage) {
    console.log('Sending message to backend:', userMessage);
    
    try {
        const response = await fetch("https://bee-well-backend.onrender.com/api/chat", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                message: userMessage,
                user_data: userData
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Backend response:', data); //Debug log
        
        return {
            agent: data.agent || 'Therapist',
            response: data.response || 'I\'m having trouble processing that right now. Could you try rephrasing?'
        };
    } catch (error) {
        console.error('Error calling backend API:', error);
        return {
            agent: 'System',
            response: 'I\'m having connection issues right now. Please check your internet connection and try again.'
        };
    }
}

//Auto-resize textarea
function autoResize() {
    const textarea = document.getElementById('chatInput');
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

//Enhanced message handling with better animations
function animateNewMessage(messageElement) {
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateY(20px)';
    
    requestAnimationFrame(() => {
        messageElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        messageElement.style.opacity = '1';
        messageElement.style.transform = 'translateY(0)';
    });
}

//Enhanced user experience features
function showConnectionStatus(status) {
    //Could show connection status to backend
    const statusElement = document.createElement('div');
    statusElement.className = 'connection-status';
    statusElement.textContent = status;
    document.body.appendChild(statusElement);
    
    setTimeout(() => {
        statusElement.remove();
    }, 3000);
}

//Accessibility improvements
function initAccessibility() {
    //Add ARIA labels and keyboard navigation
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.setAttribute('aria-label', 'Type your message to Bee');
    }
    
    const sendBtn = document.querySelector('.send-btn');
    if (sendBtn) {
        sendBtn.setAttribute('aria-label', 'Send message');
    }
    
    //Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            sendMessage();
        }
    });
}

//Initialize the app
function initializeApp() {
    initTheme();
    loadUserData();
    initAccessibility();
    
    //Add form submission event listener
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', handleFormSubmission);
        console.log('Form event listener added'); //Debug log
    }

    //Add event listener for textarea auto-resize
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('input', autoResize);
        
        //Add helpful UI feedback
        chatInput.addEventListener('focus', function() {
            this.setAttribute('placeholder', 'I\'m here to listen...');
        });

        chatInput.addEventListener('blur', function() {
            this.setAttribute('placeholder', 'Share what\'s on your mind...');
        });

        //Add pulse animation to send button when input has text
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
}

//Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);