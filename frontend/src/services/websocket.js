import { Client } from '@stomp/stompjs';
import { API_BASE_URL } from './api';

let stompClient = null;
const connectionListeners = new Set();
let isConnecting = false;

function getBrokerUrl() {
  const base = API_BASE_URL || 'http://localhost:8080';
  const wsProto = base.startsWith('https') ? 'wss://' : 'ws://';
  const host = base.replace(/^https?:\/\//, '');
  return `${wsProto}${host}/ws-proctor`;
}

export function getWebSocketClient() {
  if (stompClient && stompClient.active) {
    return stompClient;
  }

  if (!stompClient) {
    const brokerURL = getBrokerUrl();
    stompClient = new Client({
      brokerURL,
      reconnectDelay: 3000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: () => {
        // Disabled verbose debug output in production
      },
      onConnect: () => {
        isConnecting = false;
        connectionListeners.forEach((listener) => listener(true));
      },
      onDisconnect: () => {
        connectionListeners.forEach((listener) => listener(false));
      },
      onStompError: (frame) => {
        console.warn('STOMP error:', frame.headers['message'], frame.body);
      },
      onWebSocketError: (err) => {
        console.warn('WebSocket connection error:', err);
      },
    });
  }

  if (!stompClient.active && !isConnecting) {
    isConnecting = true;
    stompClient.activate();
  }

  return stompClient;
}

export function subscribeToExaminerRiskUpdates(onMessage) {
  const client = getWebSocketClient();

  const setupSubscription = () => {
    try {
      return client.subscribe('/topic/examiner/risk-updates', (message) => {
        try {
          const data = JSON.parse(message.body);
          onMessage(data);
        } catch (e) {
          console.warn('Error parsing risk update payload:', e);
        }
      });
    } catch (err) {
      console.warn('Failed to subscribe to /topic/examiner/risk-updates:', err);
      return null;
    }
  };

  let sub = null;
  if (client.connected) {
    sub = setupSubscription();
  }

  const listener = (connected) => {
    if (connected) {
      if (sub) {
        try { sub.unsubscribe(); } catch (e) { void e; }
      }
      sub = setupSubscription();
    }
  };
  connectionListeners.add(listener);

  return () => {
    connectionListeners.delete(listener);
    if (sub) {
      try { sub.unsubscribe(); } catch (e) { void e; }
    }
  };
}

export function subscribeToSessionEvents(sessionId, onMessage) {
  if (!sessionId) return () => {};
  const client = getWebSocketClient();

  const setupSubscription = () => {
    try {
      return client.subscribe(`/topic/sessions/${sessionId}`, (message) => {
        try {
          const data = JSON.parse(message.body);
          onMessage(data);
        } catch (e) {
          console.warn('Error parsing session event payload:', e);
        }
      });
    } catch (err) {
      console.warn(`Failed to subscribe to session ${sessionId}:`, err);
      return null;
    }
  };

  let sub = null;
  if (client.connected) {
    sub = setupSubscription();
  }

  const listener = (connected) => {
    if (connected) {
      if (sub) {
        try { sub.unsubscribe(); } catch (e) { void e; }
      }
      sub = setupSubscription();
    }
  };
  connectionListeners.add(listener);

  return () => {
    connectionListeners.delete(listener);
    if (sub) {
      try { sub.unsubscribe(); } catch (e) { void e; }
    }
  };
}
