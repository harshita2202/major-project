import { Client } from '@stomp/stompjs';
import { API_BASE_URL } from './api';

let stompClient = null;
const connectionListeners = new Set();
const pendingMessagesQueue = [];
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
      reconnectDelay: 2000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: () => {
        // Disabled verbose debug output in production
      },
      onConnect: () => {
        isConnecting = false;
        connectionListeners.forEach((listener) => {
          try {
            listener(true);
          } catch (e) {
            console.warn('[WebSocket] Listener error:', e);
          }
        });

        // Flush pending queued messages
        while (pendingMessagesQueue.length > 0) {
          const item = pendingMessagesQueue.shift();
          try {
            stompClient.publish({ destination: item.destination, body: item.body });
          } catch (e) {
            console.warn('[WebSocket] Failed to flush queued message:', e);
          }
        }
      },
      onDisconnect: () => {
        isConnecting = false;
        connectionListeners.forEach((listener) => {
          try {
            listener(false);
          } catch (e) {
            console.warn('[WebSocket] Listener disconnect error:', e);
          }
        });
      },
      onStompError: (frame) => {
        isConnecting = false;
        console.warn('STOMP error:', frame.headers['message'], frame.body);
      },
      onWebSocketError: (err) => {
        isConnecting = false;
        console.warn('WebSocket connection error:', err);
      },
      onWebSocketClose: () => {
        isConnecting = false;
      },
    });
  }

  if (!stompClient.active && !isConnecting) {
    isConnecting = true;
    stompClient.activate();
  }

  return stompClient;
}

/**
 * Universal safe topic subscription that automatically resubscribes on reconnect
 * without ever overwriting client.onConnect.
 */
export function subscribeToTopic(topic, onMessage) {
  const client = getWebSocketClient();

  const setupSubscription = () => {
    try {
      return client.subscribe(topic, (message) => {
        try {
          const data = JSON.parse(message.body);
          onMessage(data);
        } catch (e) {
          console.warn(`[WebSocket] Error parsing payload on ${topic}:`, e);
        }
      });
    } catch (err) {
      console.warn(`[WebSocket] Failed to subscribe to ${topic}:`, err);
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

/**
 * Send a STOMP message, queuing it if the client is still connecting.
 */
export function sendWebSocketMessage(destination, payload) {
  const client = getWebSocketClient();
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);

  if (client && client.connected) {
    try {
      client.publish({ destination, body });
      return true;
    } catch (err) {
      console.warn(`[WebSocket] Failed to publish to ${destination}:`, err);
    }
  }

  // Queue if client is not connected yet
  pendingMessagesQueue.push({ destination, body });
  return false;
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

export function subscribeToExaminerMobileStatus(onMessage) {
  const client = getWebSocketClient();

  const setupSubscription = () => {
    try {
      return client.subscribe('/topic/examiner/mobile-status', (message) => {
        try {
          const data = JSON.parse(message.body);
          onMessage(data);
        } catch (e) {
          console.warn('Error parsing examiner mobile status payload:', e);
        }
      });
    } catch (err) {
      console.warn('Failed to subscribe to /topic/examiner/mobile-status:', err);
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
