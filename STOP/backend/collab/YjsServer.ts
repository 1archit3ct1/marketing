/**
 * AURA Yjs WebSocket Server
 * Real-time collaborative editing using Yjs CRDT
 */

import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import { syncProtocol, encoding, decoding } from 'y-protocols';
import { messageSync, messageAwareness, messageAuth } from 'y-protocols';
import { Awareness } from 'y-protocols/awareness';
import * as mutex from 'lib0/mutex';
import * as map from 'lib0/map';
import * as error from 'lib0/error';
import { IncomingMessage, OutgoingMessage } from 'y-protocols';

// Environment variables
const PORT = parseInt(process.env.YJS_PORT || '1234');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Document storage
const docs: Map<string, Y.Doc> = new Map();
const docConnections: Map<string, Set<Connection>> = new Map();

// Awareness for cursor presence
const awarenesses: Map<string, Awareness> = new Map();

interface Connection {
  doc: Y.Doc;
  ws: WebSocket;
  subs: Map<string, () => void>;
  conns: Set<Connection>;
  connId: string;
  userId?: string;
  userName?: string;
  userColor?: string;
}

/**
 * Create or get a Yjs document
 */
function getDoc(docName: string): Y.Doc {
  let doc = docs.get(docName);
  
  if (!doc) {
    doc = new Y.Doc();
    docs.set(docName, doc);
    docConnections.set(docName, new Set());
    
    // Create awareness for this document
    const awareness = new Awareness(doc);
    awarenesses.set(docName, awareness);
    
    // Handle document updates
    doc.on('update', (update: Uint8Array, origin: any) => {
      broadcastUpdate(docName, update, origin);
    });
    
    // Handle awareness updates
    awareness.on('update', ({ added, updated, removed }: any) => {
      broadcastAwareness(docName, added, updated, removed);
    });
    
    console.log(`Created document: ${docName}`);
  }
  
  return doc;
}

/**
 * Get awareness for a document
 */
function getAwareness(docName: string): Awareness {
  return awarenesses.get(docName)!;
}

/**
 * Broadcast update to all connections except sender
 */
function broadcastUpdate(docName: string, update: Uint8Array, origin: any): void {
  const conns = docConnections.get(docName);
  if (!conns) return;
  
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeUpdate(encoder, update);
  const message = encoding.toUint8Array(encoder);
  
  conns.forEach((conn) => {
    if (conn.ws.readyState === WebSocket.OPEN && conn !== origin) {
      conn.ws.send(message);
    }
  });
}

/**
 * Broadcast awareness update
 */
function broadcastAwareness(
  docName: string,
  added: number[],
  updated: number[],
  removed: number[]
): void {
  const conns = docConnections.get(docName);
  const awareness = awarenesses.get(docName);
  if (!conns || !awareness) return;
  
  const states = awareness.getStates();
  
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageAwareness);
  
  const updatedStates: Array<{ clientID: number; state: any }> = [];
  
  [...added, ...updated].forEach((clientID) => {
    const state = states.get(clientID);
    if (state) {
      updatedStates.push({ clientID, state });
    }
  });
  
  awarenessProtocol.writeAwarenessStates(encoder, updatedStates);
  const message = encoding.toUint8Array(encoder);
  
  conns.forEach((conn) => {
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(message);
    }
  });
}

/**
 * Handle incoming WebSocket message
 */
function handleMessage(conn: Connection, message: Uint8Array): void {
  const encoder = encoding.createEncoder();
  const decoder = decoding.createDecoder(message);
  const messageType = decoding.readVarUint(decoder);
  
  switch (messageType) {
    case messageSync:
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.readSyncMessage(
        decoder,
        encoder,
        conn.doc,
        conn
      );
      if (encoding.length(encoder) > 1) {
        conn.ws.send(encoding.toUint8Array(encoder));
      }
      break;
      
    case messageAwareness:
      awarenessProtocol.readAwarenessStates(
        decoder,
        getAwareness(conn.doc.name),
        conn
      );
      break;
      
    case messageAuth:
      // Handle authentication
      handleAuth(conn, decoder);
      break;
  }
}

/**
 * Handle authentication message
 */
function handleAuth(conn: Connection, decoder: decoding.Decoder): void {
  try {
    const token = decoding.readVarString(decoder);
    
    // In production, verify the token with your auth service
    // For now, we'll parse user info from the token
    const userInfo = JSON.parse(token);
    
    conn.userId = userInfo.id;
    conn.userName = userInfo.name;
    conn.userColor = userInfo.color || generateRandomColor();
    
    // Update awareness with user info
    const awareness = getAwareness(conn.doc.name);
    awareness.setLocalStateField('user', {
      name: conn.userName,
      color: conn.userColor
    });
    
    console.log(`User ${conn.userName} authenticated to document ${conn.doc.name}`);
  } catch (error) {
    console.error('Auth error:', error);
    conn.ws.close();
  }
}

/**
 * Generate random color for user
 */
function generateRandomColor(): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Add connection to document
 */
function addConnection(docName: string, conn: Connection): void {
  const conns = docConnections.get(docName);
  if (!conns) return;
  
  conns.add(conn);
  conn.conns = conns;
  
  // Send current awareness states
  const awareness = getAwareness(docName);
  const states = awareness.getStates();
  
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageAwareness);
  
  const allStates: Array<{ clientID: number; state: any }> = [];
  states.forEach((state, clientID) => {
    allStates.push({ clientID, state });
  });
  
  awarenessProtocol.writeAwarenessStates(encoder, allStates);
  conn.ws.send(encoding.toUint8Array(encoder));
}

/**
 * Remove connection from document
 */
function removeConnection(conn: Connection): void {
  const docName = conn.doc.name;
  const conns = docConnections.get(docName);
  
  if (conns) {
    conns.delete(conn);
    
    // Clean up awareness
    const awareness = getAwareness(docName);
    awareness.removeStates([conn.doc.clientID]);
    
    // Clean up document if no connections
    if (conns.size === 0) {
      docs.delete(docName);
      docConnections.delete(docName);
      awarenesses.delete(docName);
      console.log(`Cleaned up document: ${docName}`);
    }
  }
  
  // Clean up subscriptions
  conn.subs.forEach((unsub) => unsub());
  conn.subs.clear();
}

/**
 * Create WebSocket server
 */
export function createYjsServer(): WebSocketServer {
  const wss = new WebSocketServer({
    port: PORT,
    path: '/yjs'
  });
  
  wss.on('connection', (ws: WebSocket, req) => {
    // Extract document name from URL
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const docName = url.pathname.split('/').pop() || 'default';
    
    console.log(`New connection to document: ${docName}`);
    
    // Get or create document
    const doc = getDoc(docName);
    
    // Create connection
    const conn: Connection = {
      doc,
      ws,
      subs: new Map(),
      conns: new Set(),
      connId: Math.random().toString(36).substr(2, 9)
    };
    
    // Add to document connections
    addConnection(docName, conn);
    
    // Send sync step 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    ws.send(encoding.toUint8Array(encoder));
    
    // Handle messages
    ws.on('message', (data: ArrayBuffer) => {
      handleMessage(conn, new Uint8Array(data));
    });
    
    // Handle close
    ws.on('close', () => {
      console.log(`Connection closed: ${conn.connId}`);
      removeConnection(conn);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      removeConnection(conn);
    });
    
    // Handle pong (keep-alive)
    ws.on('pong', () => {
      conn.ws.isAlive = true;
    });
  });
  
  // Keep-alive interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  wss.on('close', () => {
    clearInterval(interval);
  });
  
  console.log(`Yjs WebSocket server running on port ${PORT}`);
  
  return wss;
}

/**
 * Get document state as JSON
 */
export function getDocumentState(docName: string): any {
  const doc = docs.get(docName);
  if (!doc) return null;
  
  return {
    name: docName,
    connections: docConnections.get(docName)?.size || 0,
    state: Y.encodeStateAsUpdate(doc)
  };
}

/**
 * Get awareness states for a document
 */
export function getAwarenessStates(docName: string): any[] {
  const awareness = awarenesses.get(docName);
  if (!awareness) return [];
  
  const states: any[] = [];
  awareness.getStates().forEach((state, clientID) => {
    states.push({ clientID, ...state });
  });
  
  return states;
}

/**
 * Close the server
 */
export function closeYjsServer(wss: WebSocketServer): void {
  wss.clients.forEach((client) => {
    client.close();
  });
  wss.close();
  
  docs.clear();
  docConnections.clear();
  awarenesses.clear();
  
  console.log('Yjs server closed');
}

// Awareness protocol helper
const awarenessProtocol = {
  readAwarenessStates: (
    decoder: decoding.Decoder,
    awareness: Awareness,
    conn: Connection
  ): void => {
    const added: number[] = [];
    const updated: number[] = [];
    const removed: number[] = [];
    
    const numStates = decoding.readVarUint(decoder);
    for (let i = 0; i < numStates; i++) {
      const clientID = decoding.readVarUint(decoder);
      const state = decoding.readVarString(decoder);
      
      if (state === '') {
        removed.push(clientID);
      } else if (awareness.getStates().has(clientID)) {
        updated.push(clientID);
      } else {
        added.push(clientID);
      }
      
      awareness.setLocalStateField(clientID.toString(), state);
    }
    
    awareness.emit('update', { added, updated, removed }, conn);
  },
  
  writeAwarenessStates: (
    encoder: encoding.Encoder,
    states: Array<{ clientID: number; state: any }>
  ): void => {
    encoding.writeVarUint(encoder, states.length);
    states.forEach(({ clientID, state }) => {
      encoding.writeVarUint(encoder, clientID);
      encoding.writeVarString(encoder, JSON.stringify(state));
    });
  }
};

export default {
  createYjsServer,
  getDocumentState,
  getAwarenessStates,
  closeYjsServer
};
