/**
 * Modern DoorKing Interface - Frontend Application
 */

class DoorKingApp {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.authenticated = false;
        this.baseUrl = window.location.origin;
        this.init();
    }

    init() {
        this.setupWebSocket();
        this.setupEventListeners();
        this.updateStatus(false, false);
        this.log('Application started', 'info');
    }

    /**
     * Setup WebSocket connection
     */
    setupWebSocket() {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            this.log('WebSocket connected', 'success');
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
        };

        this.ws.onerror = (error) => {
            this.log('WebSocket error: ' + error.message, 'error');
        };

        this.ws.onclose = () => {
            this.log('WebSocket disconnected, reconnecting...', 'info');
            setTimeout(() => this.setupWebSocket(), 3000);
        };
    }

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'status':
                this.updateStatus(message.data.connected, message.data.authenticated);
                break;
            case 'response':
                this.log(`Response: ${JSON.stringify(message.data)}`, 'info');
                break;
            case 'error':
                this.log(`Error: ${message.data.message}`, 'error');
                break;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Connection
        document.getElementById('btn-connect').addEventListener('click', () => this.connect());
        document.getElementById('btn-disconnect').addEventListener('click', () => this.disconnect());

        // Door controls
        document.getElementById('btn-open-door').addEventListener('click', () => this.openDoor());
        document.getElementById('btn-lock-door').addEventListener('click', () => this.lockDoor());
        document.getElementById('btn-unlock-door').addEventListener('click', () => this.unlockDoor());

        // Access codes
        document.getElementById('btn-add-code').addEventListener('click', () => this.addAccessCode());
        document.getElementById('btn-list-codes').addEventListener('click', () => this.listAccessCodes());

        // Logs
        document.getElementById('btn-refresh-logs').addEventListener('click', () => this.refreshLogs());

        // System info
        document.getElementById('btn-system-info').addEventListener('click', () => this.getSystemInfo());
    }

    /**
     * Update connection status
     */
    updateStatus(connected, authenticated) {
        this.connected = connected;
        this.authenticated = authenticated;

        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        const btnConnect = document.getElementById('btn-connect');
        const btnDisconnect = document.getElementById('btn-disconnect');

        if (connected && authenticated) {
            statusIndicator.className = 'status-dot connected';
            statusText.textContent = 'Connected & Authenticated';
            btnConnect.disabled = true;
            btnDisconnect.disabled = false;
            this.enableControls(true);
        } else if (connected) {
            statusIndicator.className = 'status-dot connected';
            statusText.textContent = 'Connected (Not Authenticated)';
            btnConnect.disabled = true;
            btnDisconnect.disabled = false;
            this.enableControls(false);
        } else {
            statusIndicator.className = 'status-dot disconnected';
            statusText.textContent = 'Disconnected';
            btnConnect.disabled = false;
            btnDisconnect.disabled = true;
            this.enableControls(false);
        }
    }

    /**
     * Enable/disable controls
     */
    enableControls(enable) {
        const controlButtons = [
            'btn-open-door', 'btn-lock-door', 'btn-unlock-door',
            'btn-add-code', 'btn-list-codes',
            'btn-refresh-logs', 'btn-system-info'
        ];

        controlButtons.forEach(id => {
            document.getElementById(id).disabled = !enable;
        });
    }

    /**
     * Log activity
     */
    log(message, type = 'info') {
        const logContainer = document.getElementById('activity-log');
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
        logContainer.insertBefore(logEntry, logContainer.firstChild);

        // Keep only last 50 entries
        while (logContainer.children.length > 50) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }

    /**
     * API request helper
     */
    async apiRequest(endpoint, method = 'GET', body = null) {
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(`${this.baseUrl}${endpoint}`, options);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            this.log(`API Error: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Connect to DoorKing device
     */
    async connect() {
        this.log('Connecting to DoorKing device...', 'info');
        try {
            const result = await this.apiRequest('/api/connect', 'POST');
            if (result.success) {
                this.log('Successfully connected to DoorKing device', 'success');
                this.updateStatus(true, result.authenticated);

                // Show connection info
                const connInfo = document.getElementById('connection-info');
                document.getElementById('conn-status').textContent =
                    result.authenticated ? 'Authenticated' : 'Not Authenticated';
                document.getElementById('conn-time').textContent =
                    new Date(result.status.connectedAt).toLocaleString();
                connInfo.style.display = 'block';
            }
        } catch (error) {
            this.log(`Connection failed: ${error.message}`, 'error');
        }
    }

    /**
     * Disconnect from DoorKing device
     */
    async disconnect() {
        this.log('Disconnecting from DoorKing device...', 'info');
        try {
            await this.apiRequest('/api/disconnect', 'POST');
            this.log('Disconnected from DoorKing device', 'info');
            this.updateStatus(false, false);
            document.getElementById('connection-info').style.display = 'none';
        } catch (error) {
            this.log(`Disconnect failed: ${error.message}`, 'error');
        }
    }

    /**
     * Open door
     */
    async openDoor() {
        this.log('Sending open door command...', 'info');
        try {
            const result = await this.apiRequest('/api/door/open', 'POST', { doorId: 1 });
            if (result.success) {
                this.log('Door opened successfully', 'success');
            }
        } catch (error) {
            this.log(`Failed to open door: ${error.message}`, 'error');
        }
    }

    /**
     * Lock door
     */
    async lockDoor() {
        this.log('Sending lock door command...', 'info');
        try {
            const result = await this.apiRequest('/api/door/lock', 'POST', { doorId: 1 });
            if (result.success) {
                this.log('Door locked successfully', 'success');
            }
        } catch (error) {
            this.log(`Failed to lock door: ${error.message}`, 'error');
        }
    }

    /**
     * Unlock door
     */
    async unlockDoor() {
        this.log('Sending unlock door command...', 'info');
        try {
            const result = await this.apiRequest('/api/door/unlock', 'POST', { doorId: 1 });
            if (result.success) {
                this.log('Door unlocked successfully', 'success');
            }
        } catch (error) {
            this.log(`Failed to unlock door: ${error.message}`, 'error');
        }
    }

    /**
     * Add access code
     */
    async addAccessCode() {
        const code = document.getElementById('code-input').value;
        const name = document.getElementById('name-input').value;
        const unit = document.getElementById('unit-input').value;

        if (!code) {
            this.log('Please enter an access code', 'error');
            return;
        }

        this.log(`Adding access code: ${code}`, 'info');
        try {
            const accessCode = {
                code,
                name: name || undefined,
                unit: unit || undefined,
                enabled: true
            };

            const result = await this.apiRequest('/api/codes/add', 'POST', accessCode);
            if (result.success) {
                this.log(`Access code ${code} added successfully`, 'success');
                // Clear inputs
                document.getElementById('code-input').value = '';
                document.getElementById('name-input').value = '';
                document.getElementById('unit-input').value = '';
                // Refresh list
                this.listAccessCodes();
            }
        } catch (error) {
            this.log(`Failed to add access code: ${error.message}`, 'error');
        }
    }

    /**
     * List access codes
     */
    async listAccessCodes() {
        this.log('Fetching access codes...', 'info');
        try {
            const result = await this.apiRequest('/api/codes');
            if (result.success) {
                this.displayAccessCodes(result.data || []);
            }
        } catch (error) {
            this.log(`Failed to fetch access codes: ${error.message}`, 'error');
        }
    }

    /**
     * Display access codes
     */
    displayAccessCodes(codes) {
        const container = document.getElementById('codes-list');
        container.innerHTML = '';

        if (!Array.isArray(codes) || codes.length === 0) {
            container.innerHTML = '<p style="padding: 10px; color: #7f8c8d;">No access codes available</p>';
            return;
        }

        codes.forEach(codeItem => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-content">
                    <strong>${codeItem.code}</strong>
                    ${codeItem.name ? ` - ${codeItem.name}` : ''}
                    ${codeItem.unit ? ` (Unit: ${codeItem.unit})` : ''}
                </div>
                <div class="list-item-actions">
                    <button class="btn btn-danger btn-small" onclick="app.deleteAccessCode('${codeItem.code}')">
                        Delete
                    </button>
                </div>
            `;
            container.appendChild(item);
        });

        this.log(`Loaded ${codes.length} access codes`, 'success');
    }

    /**
     * Delete access code
     */
    async deleteAccessCode(code) {
        if (!confirm(`Are you sure you want to delete access code ${code}?`)) {
            return;
        }

        this.log(`Deleting access code: ${code}`, 'info');
        try {
            const result = await this.apiRequest(`/api/codes/${code}`, 'DELETE');
            if (result.success) {
                this.log(`Access code ${code} deleted successfully`, 'success');
                this.listAccessCodes();
            }
        } catch (error) {
            this.log(`Failed to delete access code: ${error.message}`, 'error');
        }
    }

    /**
     * Refresh access logs
     */
    async refreshLogs() {
        const count = document.getElementById('log-count').value;
        this.log(`Fetching last ${count} access logs...`, 'info');

        try {
            const result = await this.apiRequest(`/api/logs?count=${count}`);
            if (result.success) {
                this.displayLogs(result.data || []);
            }
        } catch (error) {
            this.log(`Failed to fetch logs: ${error.message}`, 'error');
        }
    }

    /**
     * Display access logs
     */
    displayLogs(logs) {
        const container = document.getElementById('logs-list');
        container.innerHTML = '';

        if (!Array.isArray(logs) || logs.length === 0) {
            container.innerHTML = '<p style="padding: 10px; color: #7f8c8d;">No logs available</p>';
            return;
        }

        logs.forEach(log => {
            const item = document.createElement('div');
            item.className = 'list-item';

            const timestamp = new Date(log.timestamp).toLocaleString();
            const actionClass = log.action === 'denied' ? 'log-error' : 'log-success';

            item.innerHTML = `
                <div class="list-item-content">
                    <span class="${actionClass}">${log.action.toUpperCase()}</span>
                    ${log.code ? `<strong>Code: ${log.code}</strong>` : ''}
                    ${log.name ? `- ${log.name}` : ''}
                    ${log.location ? `at ${log.location}` : ''}
                    <br>
                    <small style="color: #7f8c8d;">${timestamp}</small>
                </div>
            `;
            container.appendChild(item);
        });

        this.log(`Loaded ${logs.length} log entries`, 'success');
    }

    /**
     * Get system information
     */
    async getSystemInfo() {
        this.log('Fetching system information...', 'info');
        try {
            const result = await this.apiRequest('/api/system/info');
            if (result.success) {
                this.displaySystemInfo(result.data || {});
            }
        } catch (error) {
            this.log(`Failed to fetch system info: ${error.message}`, 'error');
        }
    }

    /**
     * Display system information
     */
    displaySystemInfo(info) {
        const container = document.getElementById('system-info');

        document.getElementById('sys-model').textContent = info.model || 'N/A';
        document.getElementById('sys-version').textContent = info.version || 'N/A';
        document.getElementById('sys-serial').textContent = info.serialNumber || 'N/A';
        document.getElementById('sys-uptime').textContent = info.uptime
            ? this.formatUptime(info.uptime)
            : 'N/A';

        container.style.display = 'block';
        this.log('System information loaded', 'success');
    }

    /**
     * Format uptime
     */
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    }
}

// Initialize application
const app = new DoorKingApp();
