/**
 * Main Application Logic (Backend Integrated - DEBUGGED)
 * File: assets/js/app.js
 * Phase 2 Fix: Ensuring credentials and correct channel rendering
 */
document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM CACHE ---
    const UI = {
        views: {
            login: document.getElementById('login-view'),
            dashboard: document.getElementById('dashboard-view')
        },
        forms: {
            login: document.getElementById('login-form'),
            createChannel: document.getElementById('create-channel-form')
        },
        inputs: {
            username: document.getElementById('username'),
            password: document.getElementById('password'),
            channelId: document.getElementById('new-channel-id'),
            channelSecret: document.getElementById('new-channel-secret'),
            plainMsg: document.getElementById('plain-input'),
            encryptedOutput: document.getElementById('encrypted-output')
        },
        btns: {
            loginSubmit: document.querySelector('#login-form button[type="submit"]'),
            logout: document.getElementById('logout-btn'),
            createChannelTrigger: document.getElementById('create-channel-btn'),
            modalClose: document.querySelector('.close-modal'),
            modalSubmit: document.querySelector('#create-channel-form button[type="submit"]'),
            leaveChannel: document.getElementById('leave-channel-btn'),
            encrypt: document.getElementById('encrypt-btn'),
            send: document.getElementById('send-btn'),
            copy: document.getElementById('copy-btn')
        },
        containers: {
            channelList: document.getElementById('channel-list'),
            activeChannelArea: document.getElementById('active-channel-area'),
            messageLog: document.getElementById('message-log'),
            modalOverlay: document.getElementById('modal-overlay'),
            encryptProcessing: document.getElementById('encrypt-processing')
        },
        display: {
            username: document.getElementById('display-username'),
            loginStatus: document.getElementById('login-status'),
            channelTitle: document.getElementById('current-channel-name')
        }
    };

    // --- VIEW MANAGEMENT ---
    function switchView(viewName) {
        Object.keys(UI.views).forEach(v => {
            UI.views[v].classList.add('hidden');
            UI.views[v].classList.remove('active');
        });
        if (UI.views[viewName]) {
            UI.views[viewName].classList.remove('hidden');
            UI.views[viewName].classList.add('active');
        }
    }

    // --- INITIALIZATION ---
    async function init() {
        console.log("Initializing QEKMS Session...");
        const user = await AuthService.getProfile();
        if (user) {
            console.log("Session verified for:", user.username);
            UI.display.username.textContent = user.username.split('@')[0].toUpperCase();
            switchView('dashboard');
            await renderChannelList();
        } else {
            console.log("No active session found.");
            switchView('login');
        }
    }

    // --- AUTHENTICATION ---
    UI.forms.login.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = UI.inputs.username.value.trim();
        const pass = UI.inputs.password.value;
        const btn = UI.btns.loginSubmit;

        if (!email || !pass) return;

        try {
            btn.disabled = true;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> AUTHENTICATING...';

            await AuthService.login(email, pass);
            
            UI.display.loginStatus.textContent = '';
            UI.display.loginStatus.className = 'terminal-status';
            
            // Re-init to load dashboard and channels
            await init();
        } catch (error) {
            UI.display.loginStatus.textContent = `ACCESS DENIED: ${error.message}`;
            UI.display.loginStatus.style.color = '#ff6b6b';

            UI.views.login.animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-8px)' },
                { transform: 'translateX(8px)' },
                { transform: 'translateX(0)' }
            ], { duration: 250, easing: 'ease-in-out' });
            
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });

    UI.btns.logout.addEventListener('click', () => {
        AuthService.logout();
    });

    // --- CHANNEL MANAGEMENT ---
    UI.btns.createChannelTrigger.addEventListener('click', () => {
        UI.containers.modalOverlay.classList.remove('hidden');
        UI.inputs.channelId.focus();
    });

    UI.btns.modalClose.addEventListener('click', () => {
        UI.containers.modalOverlay.classList.add('hidden');
    });

    UI.forms.createChannel.addEventListener('submit', async (e) => {
        e.preventDefault();
        const receiverEmail = UI.inputs.channelId.value.trim();
        const btn = UI.btns.modalSubmit;

        if (!receiverEmail) return;

        try {
            btn.disabled = true;
            btn.textContent = 'ESTABLISHING SECURE LINK...';

            const response = await fetch('/channels/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiver_email: receiverEmail }),
                credentials: 'include' // Fix: Include session cookies
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to create channel');
            }

            const data = await response.json();
            
            // Clean up
            UI.inputs.channelId.value = '';
            UI.inputs.channelSecret.value = '';
            UI.containers.modalOverlay.classList.add('hidden');

            await renderChannelList();
            await joinChannel(data.channel.id);
        } catch (err) {
            console.error("Channel Error:", err);
            alert(`Link Error: ${err.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = 'START SECURE HANDSHAKE';
        }
    });

    async function renderChannelList() {
        console.log("Fetching channels...");
        try {
            const response = await fetch('/channels/', {
                credentials: 'include' // Fix: Include session cookies
            });
            
            if (!response.ok) {
                console.error("Failed to fetch channels, Status:", response.status);
                return;
            }
            
            const channels = await response.json();
            console.log("Channels received:", channels);
            
            UI.containers.channelList.innerHTML = '';
            
            if (!Array.isArray(channels) || channels.length === 0) {
                UI.containers.channelList.innerHTML = '<div class="empty-state">No active secure links detected.</div>';
                return;
            }

            channels.forEach(ch => {
                const item = document.createElement('div');
                // Use Store metadata if available
                const currentChannelId = Store.state.currentChannelId;
                item.className = `channel-item ${currentChannelId === ch.id ? 'active' : ''}`;
                item.dataset.id = ch.id;
                
                // Determine display name
                const currentUserEmail = Store.state.currentUser?.username;
                const otherUser = ch.sender === currentUserEmail ? ch.receiver : ch.sender;
                
                item.innerHTML = `
                    <i class="fa-solid fa-satellite-dish"></i>
                    <span>${(otherUser || 'UNKNOWN').split('@')[0].toUpperCase()}</span>
                `;
                
                item.onclick = () => joinChannel(ch.id);
                UI.containers.channelList.appendChild(item);
            });
        } catch (err) {
            console.error("Failed to load channels:", err);
        }
    }

    async function joinChannel(channelId) {
        console.log("Joining channel:", channelId);
        Store.setCurrentChannel(channelId);
        UI.containers.activeChannelArea.classList.remove('hidden');
        
        // Update Sidebar highlighting
        document.querySelectorAll('.channel-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === channelId);
        });

        UI.display.channelTitle.textContent = "CHANNEL::" + channelId.substring(0, 8);
        
        await renderMessages(channelId);

        // Reset inputs
        UI.inputs.plainMsg.value = '';
        UI.inputs.encryptedOutput.textContent = '';
        UI.btns.send.disabled = true;
    }

    UI.btns.leaveChannel.addEventListener('click', () => {
        UI.containers.activeChannelArea.classList.add('hidden');
        Store.setCurrentChannel(null);
        renderChannelList();
    });

    // --- MESSAGING & ENCRYPTION ---
    let currentEncryptedPayload = null;

    UI.btns.encrypt.addEventListener('click', async () => {
        const text = UI.inputs.plainMsg.value.trim();
        if (!text) return;

        try {
            UI.btns.encrypt.disabled = true;
            UI.containers.encryptProcessing.classList.remove('hidden');

            const dummyKey = await CryptoUtils.deriveKey("PHASE_2_DUMMY", "CHANNEL");
            const cipherJson = await CryptoUtils.encrypt(text, dummyKey);
            currentEncryptedPayload = cipherJson;

            UI.inputs.encryptedOutput.textContent = cipherJson;
            UI.btns.send.disabled = false;
        } catch (e) {
            console.error("Encryption local error:", e);
        } finally {
            UI.btns.encrypt.disabled = false;
            UI.containers.encryptProcessing.classList.add('hidden');
        }
    });

    UI.btns.send.addEventListener('click', async () => {
        if (!currentEncryptedPayload) return;
        
        const channelId = Store.state.currentChannelId;
        const msg = {
            id: Date.now(),
            sender: Store.state.currentUser.username,
            encryptedData: currentEncryptedPayload,
            decryptedContent: UI.inputs.plainMsg.value.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        Store.addMessage(channelId, msg);
        await renderMessages(channelId);

        // Reset
        UI.inputs.plainMsg.value = '';
        UI.inputs.encryptedOutput.textContent = '';
        currentEncryptedPayload = null;
        UI.btns.send.disabled = true;
    });

    async function renderMessages(channelId) {
        UI.containers.messageLog.innerHTML = '';
        
        const banner = document.createElement('div');
        banner.className = 'system-message';
        banner.textContent = 'SECURE LINK ACTIVE :: AES-GCM-256';
        UI.containers.messageLog.appendChild(banner);

        // Fetch real history
        try {
            const response = await fetch(`/channels/${channelId}/messages`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                console.log("Messages received:", data.messages);
                data.messages.forEach(m => {
                    appendMessageToLog(m);
                });
            }
        } catch (err) {
            console.warn("Could not fetch remote history.");
        }

        const localMsgs = Store.state.messages[channelId] || [];
        localMsgs.forEach(m => appendMessageToLog(m));

        UI.containers.messageLog.scrollTop = UI.containers.messageLog.scrollHeight;
    }

    function appendMessageToLog(m) {
        const currentUserEmail = Store.state.currentUser?.username;
        const isMine = m.sender === currentUserEmail;
        const row = document.createElement('div');
        row.className = `msg-row ${isMine ? 'mine' : 'theirs'}`;

        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        bubble.textContent = m.decryptedContent || "[ENCRYPTED CONTENT]";

        const meta = document.createElement('div');
        meta.className = 'msg-meta';
        const senderLabel = m.sender ? m.sender.split('@')[0].toUpperCase() : 'UNKNOWN';
        meta.textContent = `${senderLabel} • ${m.timestamp || 'RECENT'}`;

        row.appendChild(bubble);
        row.appendChild(meta);
        UI.containers.messageLog.appendChild(row);
    }

    UI.btns.copy.addEventListener('click', () => {
        const text = UI.inputs.encryptedOutput.textContent;
        if (!text) return;
        navigator.clipboard.writeText(text);
    });

    // Run Initializer
    await init();
});
