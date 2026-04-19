/**
 * QEKMS — Production Authentication Service
 * File: assets/js/auth.js
 * Integration: FastAPI /auth endpoints
 */
const AuthService = {
    /**
     * Authenticate via backend API
     * Sets HTTP-only cookie automatically on success
     */
    async login(email, password) {
        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    role: 'account' // Defaulting to account for landing page access
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Authentication Failed');
            }

            const data = await response.json();
            
            // Fetch user profile to populate Store
            await this.getProfile();
            
            return data;
        } catch (error) {
            console.error("Login Error:", error);
            throw error;
        }
    },

    /**
     * Terminate session on backend
     */
    async logout() {
        try {
            await fetch('/auth/logout', { method: 'POST' });
            Store.setUser(null);
            window.location.reload(); // Hard reset state
        } catch (error) {
            console.error("Logout Error:", error);
            Store.setUser(null);
        }
    },

    /**
     * Verify current session and retrieve user data
     */
    async getProfile() {
        try {
            const response = await fetch('/auth/me');
            if (response.ok) {
                const data = await response.json();
                // backend returns { "user": { "sub": "email", "role": "...", "id": "..." } }
                const user = {
                    username: data.user.sub,
                    role: data.user.role,
                    id: data.user.id
                };
                Store.setUser(user);
                return user;
            } else {
                Store.setUser(null);
                return null;
            }
        } catch (error) {
            Store.setUser(null);
            return null;
        }
    }
};

window.AuthService = AuthService;
