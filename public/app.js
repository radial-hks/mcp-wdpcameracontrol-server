document.addEventListener('DOMContentLoaded', () => {
    const wsUrlInput = document.getElementById('wsUrl');
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const statusDisplay = document.getElementById('status');
    const messageToSendInput = document.getElementById('messageToSend');
    const sendBtn = document.getElementById('sendBtn');
    const formatJsonBtn = document.getElementById('formatJsonBtn');
    const jsonValidationStatus = document.getElementById('jsonValidationStatus');
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
            wsUrlInput.disabled = true;
            
            // 连接成功后，验证当前JSON输入是否有效
            validateJsonInput();
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
        
        // 清除JSON验证状态
        if (jsonValidationStatus) {
            jsonValidationStatus.textContent = '';
            jsonValidationStatus.classList.remove('json-valid', 'json-invalid');
        }
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

        // 由于我们已经在输入时验证了JSON，并且只有在JSON有效时才启用发送按钮
        // 所以这里可以直接发送，不需要再次验证
        websocket.send(message);
        const timestamp = new Date().toLocaleTimeString();
        receivedMessagesTextarea.value += `[${timestamp}] Sent: ${message}\n\n`;
        receivedMessagesTextarea.scrollTop = receivedMessagesTextarea.scrollHeight;
        // messageToSendInput.value = ''; // Clear after sending if desired
    }

    // 验证JSON格式是否合法
    function validateJson(jsonString) {
        if (!jsonString.trim()) {
            return { valid: false, message: '输入为空' };
        }
        
        try {
            JSON.parse(jsonString);
            return { valid: true, message: '格式正确' };
        } catch (e) {
            return { valid: false, message: e.message };
        }
    }
    
    // 格式化JSON
    function formatJson() {
        const jsonString = messageToSendInput.value.trim();
        if (!jsonString) {
            updateStatus('无内容可格式化', true);
            return;
        }
        
        try {
            const parsedJson = JSON.parse(jsonString);
            messageToSendInput.value = JSON.stringify(parsedJson, null, 4);
            updateJsonValidationStatus(true, '格式化成功');
        } catch (e) {
            updateStatus(`无法格式化: ${e.message}`, true);
        }
    }
    
    // 更新JSON验证状态显示
    function updateJsonValidationStatus(isValid, message) {
        jsonValidationStatus.textContent = message;
        jsonValidationStatus.classList.remove('json-valid', 'json-invalid');
        
        if (isValid) {
            jsonValidationStatus.classList.add('json-valid');
        } else {
            jsonValidationStatus.classList.add('json-invalid');
        }
    }
    
    // 实时验证JSON
    function validateJsonInput() {
        const result = validateJson(messageToSendInput.value);
        updateJsonValidationStatus(result.valid, result.message);
        
        // 只有在连接状态下且JSON有效时才启用发送按钮
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            sendBtn.disabled = !result.valid;
        }
    }

    // 事件监听器
    connectBtn.addEventListener('click', connectWebSocket);
    disconnectBtn.addEventListener('click', () => disconnectWebSocket(true));
    sendBtn.addEventListener('click', sendMessage);
    formatJsonBtn.addEventListener('click', formatJson);
    
    // 输入时实时验证JSON
    messageToSendInput.addEventListener('input', validateJsonInput);

    clearLogBtn.addEventListener('click', () => {
        receivedMessagesTextarea.value = '';
        updateStatus('Message log cleared.');
    });

    // Initial state
    updateStatus('Idle. Enter WebSocket URL and connect.');
    validateJsonInput(); // 初始验证
});
