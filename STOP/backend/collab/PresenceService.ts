/**
 * AURA Presence Service
 * Real-time user presence and cursor tracking for collaboration
 */

import { WebSocket } from 'ws';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { v4 as uuidv4 } from 'uuid';

// Environment variables
const PRESENCE_HEARTBEAT_INTERVAL = parseInt(process.env.PRESENCE_HEARTBEAT_INTERVAL || '15000'); // 15 seconds
const PRESENCE_TIMEOUT = parseInt(process.env.PRESENCE_TIMEOUT || '30000'); // 30 seconds

export interface PresenceUser {
  id: string;
  name: string;
  avatarUrl?: string;
  color: string;
  connectionId: string;
}

export interface PresenceState {
  user: PresenceUser;
  cursor?: {
    x: number;
    y: number;
  };
  selection?: {
    type: 'clip' | 'track' | 'timeline';
    id: string;
  };
  playheadPosition?: number;
  viewport?: {
    start: number;
    end: number;
    zoom: number;
  };
  isIdle: boolean;
  lastActive: number;
}

export interface PeerState {
  connectionId: string;
  state: PresenceState;
  lastSeen: number;
}

/**
 * Presence manager for a single document
 */
class PresenceManager {
  private awareness: Awareness;
  private peers: Map<string, PeerState> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  constructor(awareness: Awareness) {
    this.awareness = awareness;
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Listen for awareness updates
    this.awareness.on('update', ({ added, updated, removed }) => {
      this.handleAwarenessUpdate(added, updated, removed);
    });
  }
  
  /**
   * Set local user state
   */
  setLocalState(updates: Partial<PresenceState>): void {
    const currentState = this.awareness.getLocalState() as PresenceState | null;
    
    const newState: PresenceState = {
      user: currentState?.user || {
        id: '',
        name: 'Anonymous',
        color: this.generateRandomColor()
      },
      cursor: currentState?.cursor,
      selection: currentState?.selection,
      playheadPosition: currentState?.playheadPosition,
      viewport: currentState?.viewport,
      isIdle: false,
      lastActive: Date.now(),
      ...updates
    };
    
    this.awareness.setLocalState(newState);
  }
  
  /**
   * Update cursor position
   */
  updateCursor(x: number, y: number): void {
    const currentState = this.awareness.getLocalState() as PresenceState | null;
    
    this.awareness.setLocalState({
      ...currentState,
      cursor: { x, y },
      isIdle: false,
      lastActive: Date.now()
    });
  }
  
  /**
   * Update selection
   */
  updateSelection(type: 'clip' | 'track' | 'timeline', id: string): void {
    const currentState = this.awareness.getLocalState() as PresenceState | null;
    
    this.awareness.setLocalState({
      ...currentState,
      selection: { type, id },
      isIdle: false,
      lastActive: Date.now()
    });
  }
  
  /**
   * Update playhead position
   */
  updatePlayhead(position: number): void {
    const currentState = this.awareness.getLocalState() as PresenceState | null;
    
    this.awareness.setLocalState({
      ...currentState,
      playheadPosition: position,
      isIdle: false,
      lastActive: Date.now()
    });
  }
  
  /**
   * Update viewport
   */
  updateViewport(start: number, end: number, zoom: number): void {
    const currentState = this.awareness.getLocalState() as PresenceState | null;
    
    this.awareness.setLocalState({
      ...currentState,
      viewport: { start, end, zoom },
      isIdle: false,
      lastActive: Date.now()
    });
  }
  
  /**
   * Get all peer states
   */
  getPeers(): Map<string, PeerState> {
    return new Map(this.peers);
  }
  
  /**
   * Get peer by connection ID
   */
  getPeer(connectionId: string): PeerState | undefined {
    return this.peers.get(connectionId);
  }
  
  /**
   * Get active peers (seen within timeout)
   */
  getActivePeers(): PeerState[] {
    const now = Date.now();
    const active: PeerState[] = [];
    
    this.peers.forEach((peer) => {
      if (now - peer.lastSeen < PRESENCE_TIMEOUT) {
        active.push(peer);
      }
    });
    
    return active;
  }
  
  /**
   * Handle awareness updates
   */
  private handleAwarenessUpdate(
    added: number[],
    updated: number[],
    removed: number[]
  ): void {
    const states = this.awareness.getStates();
    
    // Handle added/updated
    [...added, ...updated].forEach((clientID) => {
      const state = states.get(clientID);
      if (state) {
        const peerState = state as PresenceState;
        const connectionId = peerState.user.connectionId;
        
        this.peers.set(connectionId, {
          connectionId,
          state: peerState,
          lastSeen: Date.now()
        });
      }
    });
    
    // Handle removed
    removed.forEach((clientID) => {
      const state = states.get(clientID);
      if (state) {
        const peerState = state as PresenceState;
        const connectionId = peerState.user.connectionId;
        this.peers.delete(connectionId);
      }
    });
  }
  
  /**
   * Start heartbeat to mark idle users
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const currentState = this.awareness.getLocalState() as PresenceState | null;
      
      if (currentState) {
        const now = Date.now();
        const isIdle = now - currentState.lastActive > PRESENCE_HEARTBEAT_INTERVAL;
        
        if (isIdle !== currentState.isIdle) {
          this.awareness.setLocalState({
            ...currentState,
            isIdle
          });
        }
      }
      
      // Clean up stale peers
      this.peers.forEach((peer, connectionId) => {
        if (now - peer.lastSeen > PRESENCE_TIMEOUT * 2) {
          this.peers.delete(connectionId);
        }
      });
    }, PRESENCE_HEARTBEAT_INTERVAL);
  }
  
  /**
   * Stop heartbeat
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  /**
   * Generate random color for user
   */
  private generateRandomColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  /**
   * Destroy presence manager
   */
  destroy(): void {
    this.stopHeartbeat();
    this.peers.clear();
  }
}

/**
 * Create presence manager for a document
 */
export function createPresenceManager(awareness: Awareness): PresenceManager {
  return new PresenceManager(awareness);
}

/**
 * Presence Service for API routes
 */
export class PresenceService {
  private static managers: Map<string, PresenceManager> = new Map();
  
  /**
   * Get or create presence manager for document
   */
  static getManager(docName: string, awareness: Awareness): PresenceManager {
    let manager = this.managers.get(docName);
    
    if (!manager) {
      manager = createPresenceManager(awareness);
      this.managers.set(docName, manager);
    }
    
    return manager;
  }
  
  /**
   * Get all active users in a document
   */
  static getActiveUsers(docName: string): PresenceState[] {
    const manager = this.managers.get(docName);
    if (!manager) return [];
    
    return manager.getActivePeers().map((peer) => peer.state);
  }
  
  /**
   * Remove presence manager
   */
  static removeManager(docName: string): void {
    const manager = this.managers.get(docName);
    if (manager) {
      manager.destroy();
      this.managers.delete(docName);
    }
  }
}

/**
 * WebSocket handler for presence updates
 */
export function handlePresenceMessage(
  ws: WebSocket,
  data: {
    type: 'cursor' | 'selection' | 'playhead' | 'viewport' | 'idle';
    payload: any;
  }
): void {
  // This would be called from the Yjs server
  // to handle presence-specific messages
  
  switch (data.type) {
    case 'cursor':
      // Broadcast cursor position
      broadcastPresence(ws, {
        type: 'cursor',
        payload: data.payload
      });
      break;
      
    case 'selection':
      // Broadcast selection change
      broadcastPresence(ws, {
        type: 'selection',
        payload: data.payload
      });
      break;
      
    case 'playhead':
      // Broadcast playhead position
      broadcastPresence(ws, {
        type: 'playhead',
        payload: data.payload
      });
      break;
      
    case 'viewport':
      // Broadcast viewport change
      broadcastPresence(ws, {
        type: 'viewport',
        payload: data.payload
      });
      break;
      
    case 'idle':
      // Mark user as idle/active
      broadcastPresence(ws, {
        type: 'idle',
        payload: data.payload
      });
      break;
  }
}

/**
 * Broadcast presence update to other clients
 */
function broadcastPresence(
  sender: WebSocket,
  data: { type: string; payload: any }
): void {
  // This would be implemented in the Yjs server
  // to broadcast presence updates to other clients
  console.log('Broadcasting presence:', data);
}

export default {
  createPresenceManager,
  PresenceService,
  handlePresenceMessage
};
