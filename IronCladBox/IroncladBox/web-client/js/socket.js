const SocketManager = {
    socket: null,
    listeners: {},

    connect() {
        const token = SecureStorage.getToken();
        if (!token) { console.warn('Socket: No hay token'); return; }
        if (this.socket?.connected) { console.log('Socket: Ya conectado'); return; }

        this.socket = io(API_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000
        });

        this.socket.on('connect', () => { console.log('Socket conectado:', this.socket.id); this._updateIndicator(true); });
        this.socket.on('disconnect', (r) => { console.log('Socket desconectado:', r); this._updateIndicator(false); });
        this.socket.on('connect_error', (e) => { console.error('Socket error:', e.message); this._updateIndicator(false); });
        this._bindEvents();
    },

    disconnect() {
        if (this.socket) { this.socket.disconnect(); this.socket = null; this.listeners = {}; this._updateIndicator(false); }
    },

    on(event, callback) {
        if (!this.listeners[event]) { this.listeners[event] = []; if (this.socket) this.socket.on(event, (...a) => (this.listeners[event] || []).forEach(cb => cb(...a))); }
        this.listeners[event].push(callback);
        return () => this.off(event, callback);
    },

    off(event, callback) {
        if (this.listeners[event]) this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    },

    _bindEvents() {
        if (!this.socket) return;
        Object.keys(this.listeners).forEach(event => {
            this.socket.off(event);
            this.socket.on(event, (...args) => (this.listeners[event] || []).forEach(cb => cb(...args)));
        });
    },

    _updateIndicator(connected) {
        let indicator = document.getElementById('socketIndicator');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.id = 'socketIndicator';
            indicator.style.cssText = 'display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:middle';
            const userInfo = document.querySelector('.user-info');
            if (userInfo) userInfo.prepend(indicator);
        }
        indicator.style.backgroundColor = connected ? '#4ade80' : '#f87171';
        indicator.title = connected ? 'Conectado en tiempo real' : 'Desconectado';
    }
};

window.SocketManager = SocketManager;
