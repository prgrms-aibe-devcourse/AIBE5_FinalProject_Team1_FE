import {
  Client,
  type IFrame,
  type IMessage,
  type StompHeaders,
  type StompSubscription
} from "@stomp/stompjs";
import { getAccessToken } from "../auth";

type StompMessageHandler<T = unknown> = (payload: T, frame: IMessage) => void;

type PendingSend = {
  destination: string;
  body?: unknown;
  headers?: StompHeaders;
};

type SubscriptionEntry = {
  destination: string;
  handler: StompMessageHandler;
  headers?: StompHeaders;
  stompSubscription?: StompSubscription;
};

export type ChatStompClient = {
  connect: () => void;
  disconnect: () => void;
  isConnected: () => boolean;
  send: (destination: string, body?: unknown, headers?: StompHeaders) => void;
  subscribe: <T = unknown>(
    destination: string,
    handler: StompMessageHandler<T>,
    headers?: StompHeaders
  ) => { unsubscribe: () => void };
};

export type ChatStompClientOptions = {
  url?: string;
  reconnectDelay?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event | Error | IFrame) => void;
};

function getDefaultStompUrl() {
  const explicitUrl = import.meta.env.VITE_WS_BASE_URL;
  if (explicitUrl) {
    return explicitUrl;
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const baseUrl = new URL(apiBaseUrl || window.location.origin, window.location.origin);
  baseUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
  baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, "")}/ws`;
  baseUrl.search = "";
  baseUrl.hash = "";

  return baseUrl.toString();
}

function parseJsonBody(body: string) {
  if (!body) return null;

  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function getAuthorizationConnectHeaders(): StompHeaders | null {
  const accessToken = getAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : null;
}

function isAuthenticationErrorFrame(frame: IFrame) {
  const errorText = [
    frame.headers.message,
    frame.body
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  return [
    "accessdenied",
    "authorization",
    "authenticate",
    "authentication",
    "forbidden",
    "unauthorized",
    "401",
    "403",
    "인증",
    "토큰"
  ].some((keyword) => errorText.includes(keyword));
}

export function createChatStompClient(options: ChatStompClientOptions = {}): ChatStompClient {
  const subscriptions = new Map<string, SubscriptionEntry>();
  const pendingSends: PendingSend[] = [];
  const url = options.url ?? getDefaultStompUrl();
  const reconnectDelay = options.reconnectDelay ?? 5000;

  let subscriptionSequence = 0;

  const stompClient = new Client({
    brokerURL: url,
    connectHeaders: getAuthorizationConnectHeaders() ?? {},
    reconnectDelay,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => undefined,
    onConnect: () => {
      flushSubscriptions();
      flushPendingSends();
      options.onConnect?.();
    },
    onDisconnect: () => {
      options.onDisconnect?.();
    },
    onStompError: (frame) => {
      if (isAuthenticationErrorFrame(frame)) {
        pendingSends.length = 0;
        stompClient.reconnectDelay = 0;
        void stompClient.deactivate();
      }
      options.onError?.(frame);
    },
    onWebSocketError: (event) => {
      options.onError?.(event);
    },
    onWebSocketClose: () => {
      subscriptions.forEach((subscription) => {
        subscription.stompSubscription = undefined;
      });
      options.onDisconnect?.();
    }
  });

  const activateSubscription = (subscription: SubscriptionEntry) => {
    if (!stompClient.connected || subscription.stompSubscription) return;

    subscription.stompSubscription = stompClient.subscribe(
      subscription.destination,
      (message) => {
        subscription.handler(parseJsonBody(message.body), message);
      },
      subscription.headers
    );
  };

  function flushSubscriptions() {
    subscriptions.forEach(activateSubscription);
  }

  function flushPendingSends() {
    while (pendingSends.length > 0 && stompClient.connected) {
      const next = pendingSends.shift();
      if (!next) return;
      publish(next.destination, next.body, next.headers);
    }
  }

  const connect = () => {
    if (stompClient.active) return;
    const connectHeaders = getAuthorizationConnectHeaders();
    if (!connectHeaders) {
      pendingSends.length = 0;
      return;
    }
    stompClient.connectHeaders = connectHeaders;
    stompClient.reconnectDelay = reconnectDelay;
    stompClient.activate();
  };

  const disconnect = () => {
    subscriptions.forEach((subscription) => {
      subscription.stompSubscription?.unsubscribe();
      subscription.stompSubscription = undefined;
    });
    subscriptions.clear();
    pendingSends.length = 0;
    void stompClient.deactivate();
  };

  const publish = (destination: string, body?: unknown, headers?: StompHeaders) => {
    stompClient.publish({
      destination,
      body: body === undefined ? "" : JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        ...headers
      }
    });
  };

  const send = (destination: string, body?: unknown, headers?: StompHeaders) => {
    if (!stompClient.connected) {
      if (!getAccessToken()) return;
      pendingSends.push({ destination, body, headers });
      connect();
      return;
    }

    publish(destination, body, headers);
  };

  const subscribe = <T = unknown>(
    destination: string,
    handler: StompMessageHandler<T>,
    headers?: StompHeaders
  ) => {
    const id = `sub-${++subscriptionSequence}`;
    const subscription: SubscriptionEntry = {
      destination,
      handler: handler as StompMessageHandler,
      headers
    };
    subscriptions.set(id, subscription);
    activateSubscription(subscription);

    return {
      unsubscribe() {
        const existing = subscriptions.get(id);
        if (!existing) return;
        existing.stompSubscription?.unsubscribe();
        subscriptions.delete(id);
      }
    };
  };

  return {
    connect,
    disconnect,
    isConnected: () => stompClient.connected,
    send,
    subscribe
  };
}
