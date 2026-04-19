/**
 * Centralized State Management (Hardened)
 * File: assets/js/store.js
 */
const Store = {
    state: {
        currentUser: null,
        isAuthenticated: false,
        channels: [],
        currentChannelId: null,
        messages: {} // Map channelId -> array of messages
    },

    // Session persistence keys
    SESSION_KEY: 'qekms_session',

    init() {
        console.log("QEKMS Security Core Initialized");
        this.restoreSession();
    },

    // --- AUTHENTICATION ---
    setUser(user) {
        this.state.currentUser = user;
        this.state.isAuthenticated = !!user;
        
        if (user) {
            localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(this.SESSION_KEY);
            this.state.channels = [];
            this.state.currentChannelId = null;
        }
        
        this.emit('authChange', this.state.isAuthenticated);
    },

    restoreSession() {
        try {
            const saved = localStorage.getItem(this.SESSION_KEY);
            if (saved) {
                const user = JSON.parse(saved);
                // In prod, verify token validity here
                this.state.currentUser = user;
                this.state.isAuthenticated = true;
                this.emit('authChange', true);
            }
        } catch (e) {
            console.warn("Session restoration failed", e);
            localStorage.removeItem(this.SESSION_KEY);
        }
    },

    // --- CHANNELS ---
    addChannel(channel) {
        // Prevent duplicate IDs
        if (this.state.channels.find(c => c.id === channel.id)) return;
        
        this.state.channels.push(channel);
        this.state.messages[channel.id] = [];
        this.emit('channelsChange', this.state.channels);
    },

    setCurrentChannel(channelId) {
        this.state.currentChannelId = channelId;
        this.emit('activeChannelChange', channelId);
    },

    // --- MESSAGING ---
    addMessage(channelId, message) {
        if (!this.state.messages[channelId]) {
            this.state.messages[channelId] = [];
        }
        this.state.messages[channelId].push(message);
        this.emit('message', { channelId, message });
    },

    // --- EVENT SYSTEM ---
    listeners: {},
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    },
    emit(event, payload) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => {
                try {
                    cb(payload);
                } catch (err) {
                    console.error(`Error in ${event} listener:`, err);
                }
            });
        }
    }
};

// Initialize once
Store.init();

// Export to window
window.Store = Store;
