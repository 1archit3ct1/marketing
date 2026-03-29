/**
 * AURA useYjs Hook
 * React hook for Yjs CRDT integration with timeline store
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Awareness } from 'y-protocols/awareness';

export interface UseYjsOptions {
  docName: string;
  serverUrl?: string;
  token?: string;
  onSync?: (isSynced: boolean) => void;
  onError?: (error: Error) => void;
}

export interface UseYjsReturn {
  doc: Y.Doc | null;
  provider: WebsocketProvider | null;
  awareness: Awareness | null;
  isSynced: boolean;
  isConnected: boolean;
  peers: Map<number, any>;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Default Yjs server URL
 */
const DEFAULT_SERVER_URL = process.env.NEXT_PUBLIC_YJS_URL || 'ws://localhost:1234';

/**
 * useYjs hook for real-time collaboration
 */
export function useYjs(options: UseYjsOptions): UseYjsReturn {
  const { docName, serverUrl = DEFAULT_SERVER_URL, token, onSync, onError } = options;
  
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  
  const [isSynced, setIsSynced] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [peers, setPeers] = useState<Map<number, any>>(new Map());
  
  // Initialize Yjs document and provider
  const connect = useCallback(() => {
    if (providerRef.current) return; // Already connected
    
    try {
      // Create Yjs document
      const doc = new Y.Doc();
      docRef.current = doc;
      
      // Create WebSocket provider
      const provider = new WebsocketProvider(
        serverUrl,
        docName,
        doc,
        {
          connect: true,
          maxBackoffTime: 10000,
          // Pass auth token in query params
          params: token ? { token } : undefined
        }
      );
      
      providerRef.current = provider;
      awarenessRef.current = provider.awareness;
      
      // Set local user state
      if (token) {
        try {
          const userInfo = JSON.parse(token);
          provider.awareness.setLocalStateField('user', {
            name: userInfo.name || 'Anonymous',
            color: userInfo.color || '#7c5cfc',
            id: userInfo.id
          });
        } catch (e) {
          console.error('Failed to parse user token:', e);
        }
      }
      
      // Handle sync events
      provider.on('synced', () => {
        setIsSynced(true);
        onSync?.(true);
      });
      
      provider.on('connection', () => {
        setIsConnected(true);
      });
      
      provider.on('connection-close', () => {
        setIsConnected(false);
      });
      
      provider.on('connection-error', (error: Error) => {
        console.error('Yjs connection error:', error);
        setIsConnected(false);
        onError?.(error);
      });
      
      provider.on('status', (event: { status: string }) => {
        console.log('Yjs connection status:', event.status);
        setIsConnected(event.status === 'connected');
      });
      
      // Listen to awareness updates
      provider.awareness.on('update', ({ added, updated, removed }) => {
        const states = provider.awareness.getStates();
        const newPeers = new Map<number, any>();
        
        states.forEach((state, clientID) => {
          if (clientID !== doc.clientID) {
            newPeers.set(clientID, state);
          }
        });
        
        setPeers(newPeers);
      });
      
      // Handle document updates
      doc.on('update', (update: Uint8Array, origin: any) => {
        // Origin is the provider when update comes from network
        // Origin is null/undefined when update is local
        console.log('Document updated, origin:', origin === provider ? 'network' : 'local');
      });
      
    } catch (error) {
      console.error('Failed to initialize Yjs:', error);
      onError?.(error as Error);
    }
  }, [docName, serverUrl, token, onSync, onError]);
  
  // Disconnect from Yjs
  const disconnect = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
    }
    
    if (docRef.current) {
      docRef.current.destroy();
      docRef.current = null;
    }
    
    awarenessRef.current = null;
    setIsSynced(false);
    setIsConnected(false);
    setPeers(new Map());
  }, []);
  
  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);
  
  return {
    doc: docRef.current,
    provider: providerRef.current,
    awareness: awarenessRef.current,
    isSynced,
    isConnected,
    peers,
    connect,
    disconnect
  };
}

/**
 * useYjsMap hook for synchronized Map
 */
export function useYjsMap<T = any>(
  yjs: UseYjsReturn,
  mapName: string
): [Y.Map<T>, (key: string, value: T) => void] {
  const yMapRef = useRef<Y.Map<T> | null>(null);
  
  useEffect(() => {
    if (yjs.doc) {
      yMapRef.current = yjs.doc.getMap(mapName);
    }
    
    return () => {
      yMapRef.current = null;
    };
  }, [yjs.doc, mapName]);
  
  const set = useCallback((key: string, value: T) => {
    if (yMapRef.current) {
      yMapRef.current.set(key, value);
    }
  }, []);
  
  return [yMapRef.current as Y.Map<T>, set];
}

/**
 * useYjsArray hook for synchronized Array
 */
export function useYjsArray<T = any>(
  yjs: UseYjsReturn,
  arrayName: string
): [Y.Array<T>, (index: number, value: T) => void, (value: T) => void] {
  const yArrayRef = useRef<Y.Array<T> | null>(null);
  
  useEffect(() => {
    if (yjs.doc) {
      yArrayRef.current = yjs.doc.getArray(arrayName);
    }
    
    return () => {
      yArrayRef.current = null;
    };
  }, [yjs.doc, arrayName]);
  
  const set = useCallback((index: number, value: T) => {
    if (yArrayRef.current) {
      yArrayRef.current.delete(index, 1);
      yArrayRef.current.insert(index, [value]);
    }
  }, []);
  
  const push = useCallback((value: T) => {
    if (yArrayRef.current) {
      yArrayRef.current.push([value]);
    }
  }, []);
  
  return [yArrayRef.current as Y.Array<T>, set, push];
}

/**
 * useYjsText hook for synchronized Text
 */
export function useYjsText(
  yjs: UseYjsReturn,
  textName: string
): [Y.Text, (value: string) => void] {
  const yTextRef = useRef<Y.Text | null>(null);
  
  useEffect(() => {
    if (yjs.doc) {
      yTextRef.current = yjs.doc.getText(textName);
    }
    
    return () => {
      yTextRef.current = null;
    };
  }, [yjs.doc, textName]);
  
  const set = useCallback((value: string) => {
    if (yTextRef.current) {
      yTextRef.current.delete(0, yTextRef.current.length);
      yTextRef.current.insert(0, value);
    }
  }, []);
  
  return [yTextRef.current as Y.Text, set];
}

export default useYjs;
