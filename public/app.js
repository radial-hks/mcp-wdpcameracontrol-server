document.addEventListener('DOMContentLoaded', () => {
    const wsUrlInput = document.getElementById('wsUrl');
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const statusDisplay = document.getElementById('status');
    const messageToSendInput = document.getElementById('messageToSend');
    const sendBtn = document.getElementById('sendBtn');
    const receivedMessagesTextarea = document.getElementById('receivedMessages');
    const clearLogBtn = document.getElementById('clearLogBtn');

    let websocket = null;

    function updateStatus(message, isError = false) {
        statusDisplay.textContent = message;
        
        // 移除所有状态类
        statusDisplay.classList.remove('status-connected', 'status-error', 'status-connecting');
        
        // 根据消息内容添加适当的状态类
        if (isError) {
            statusDisplay.classList.add('status-error');
        } else if (message.includes('Connected to')) {
            statusDisplay.classList.add('status-connected');
        } else if (message.includes('Connecting')) {
            statusDisplay.classList.add('status-connecting');
        }
        
        console.log(`Status: ${message}`);
    }

    function logReceivedMessage(message) {
        const timestamp = new Date().toLocaleTimeString();
        receivedMessagesTextarea.value += `[${timestamp}] Received: ${message}\n\n`;
        receivedMessagesTextarea.scrollTop = receivedMessagesTextarea.scrollHeight; // Auto-scroll
    }

    function connectWebSocket() {
        const url = wsUrlInput.value.trim();
        if (!url) {
            updateStatus('WebSocket URL cannot be empty.', true);
            return;
        }

        updateStatus(`Connecting to ${url}...`);
        websocket = new WebSocket(url);

        websocket.onopen = () => {
            updateStatus(`Connected to ${url}`);
            connectBtn.disabled = true;
            disconnectBtn.disabled = false;
            sendBtn.disabled = false;
            wsUrlInput.disabled = true;
        };

        websocket.onmessage = (event) => {
            let messageData = event.data;
            try {
                // Try to parse as JSON and pretty-print
                const parsedJson = JSON.parse(messageData);
                messageData = JSON.stringify(parsedJson, null, 2); // Pretty print
            } catch (e) {
                // If not JSON, display as is
            }
            logReceivedMessage(messageData);
        };

        websocket.onerror = (error) => {
            updateStatus(`WebSocket Error: ${error.message || 'Unknown error. Check console.'}`, true);
            console.error('WebSocket Error:', error);
            // Ensure UI is reset if connection failed
            if (websocket.readyState !== WebSocket.OPEN) {
                disconnectWebSocket(false); // Pass false to avoid trying to close a non-existent connection
            }
        };

        websocket.onclose = (event) => {
            updateStatus(`Disconnected. Code: ${event.code}, Reason: ${event.reason || 'No reason given'}`);
            connectBtn.disabled = false;
            disconnectBtn.disabled = true;
            sendBtn.disabled = true;
            wsUrlInput.disabled = false;
            websocket = null;
        };
    }

    function disconnectWebSocket(notifyServer = true) {
        if (websocket) {
            if (notifyServer && websocket.readyState === WebSocket.OPEN) {
                 // Send a close signal if desired, though WebSocket.close() handles this.
                 // For some servers, an explicit disconnect message might be useful.
                 // Example: websocket.send(JSON.stringify({ type: 'disconnect_notice' }));
                websocket.close(1000, "Client initiated disconnect");
            } else if (!notifyServer && websocket.readyState !== WebSocket.CLOSED && websocket.readyState !== WebSocket.CLOSING) {
                // Force close if not notifying server (e.g., connection failed to open)
                websocket.close();
            }
            updateStatus('Disconnected');
        } else {
            updateStatus('Already disconnected or never connected.');
        }
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        sendBtn.disabled = true;
        wsUrlInput.disabled = false;
    }

    function sendMessage() {
        if (!websocket || websocket.readyState !== WebSocket.OPEN) {
            updateStatus('Not connected to WebSocket server.', true);
            return;
        }

        const message = messageToSendInput.value.trim();
        if (!message) {
            updateStatus('Cannot send an empty message.', true);
            return;
        }

        try {
            // Validate JSON before sending (optional, but good practice)
            JSON.parse(message);
            websocket.send(message);
            const timestamp = new Date().toLocaleTimeString();
            receivedMessagesTextarea.value += `[${timestamp}] Sent: ${message}\n\n`;
            receivedMessagesTextarea.scrollTop = receivedMessagesTextarea.scrollHeight;
            // messageToSendInput.value = ''; // Clear after sending if desired
        } catch (e) {
            updateStatus(`Invalid JSON: ${e.message}`, true);
            console.error('Invalid JSON:', e);
        }
    }

    connectBtn.addEventListener('click', connectWebSocket);
    disconnectBtn.addEventListener('click', () => disconnectWebSocket(true));
    sendBtn.addEventListener('click', sendMessage);

    clearLogBtn.addEventListener('click', () => {
        receivedMessagesTextarea.value = '';
        updateStatus('Message log cleared.');
    });

    // Initial state
    updateStatus('Idle. Enter WebSocket URL and connect.');
});
