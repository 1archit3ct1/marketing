/**
 * AURA Timeline Store
 * Zustand store with Yjs CRDT for real-time collaboration
 */

'use client';

import { create } from 'zustand';
import * as Y from 'yjs';
import { useYjs, UseYjsReturn } from '../hooks/useYjs';

// ============================================
// Types
// ============================================

export interface Clip {
  id: string;
  assetId: string;
  trackId: string;
  start: number; // milliseconds
  duration: number; // milliseconds
  trimStart: number; // milliseconds
  trimEnd: number; // milliseconds
  speed: number;
  name?: string;
  thumbnail?: string;
}

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'caption' | 'effects';
  color: string;
  order: number;
  isLocked: boolean;
  isMuted: boolean;
  volume: number;
}

export interface TimelineState {
  duration: number; // milliseconds
  fps: number;
  width: number;
  height: number;
  clips: Clip[];
  tracks: Track[];
  selectedClipId: string | null;
  selectedTrackId: string | null;
  playheadPosition: number; // milliseconds
  isPlaying: boolean;
  zoom: number;
}

// ============================================
// Store State
// ============================================

interface TimelineStore {
  // State
  timeline: TimelineState;
  
  // Yjs integration
  yjs: UseYjsReturn | null;
  yTimeline: Y.Map<any> | null;
  
  // Actions - Timeline
  setDuration: (duration: number) => void;
  setFps: (fps: number) => void;
  setResolution: (width: number, height: number) => void;
  setZoom: (zoom: number) => void;
  
  // Actions - Playback
  play: () => void;
  pause: () => void;
  seek: (position: number) => void;
  
  // Actions - Tracks
  addTrack: (track: Omit<Track, 'id'>) => string;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  removeTrack: (id: string) => void;
  reorderTracks: (trackIds: string[]) => void;
  
  // Actions - Clips
  addClip: (clip: Omit<Clip, 'id'>) => string;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  removeClip: (id: string) => void;
  moveClip: (clipId: string, trackId: string, start: number) => void;
  trimClip: (clipId: string, side: 'start' | 'end', delta: number) => void;
  splitClip: (clipId: string, position: number) => string | null;
  
  // Actions - Selection
  selectClip: (clipId: string | null) => void;
  selectTrack: (trackId: string | null) => void;
  
  // Actions - Yjs
  initializeYjs: (docName: string, token?: string) => void;
  destroyYjs: () => void;
  
  // Actions - Import/Export
  importTimeline: (state: Partial<TimelineState>) => void;
  exportTimeline: () => TimelineState;
}

// ============================================
// Default State
// ============================================

const defaultTimeline: TimelineState = {
  duration: 60000, // 1 minute default
  fps: 30,
  width: 1080,
  height: 1920,
  clips: [],
  tracks: [],
  selectedClipId: null,
  selectedTrackId: null,
  playheadPosition: 0,
  isPlaying: false,
  zoom: 100
};

// ============================================
// Store Creation
// ============================================

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  // Initial state
  timeline: defaultTimeline,
  yjs: null,
  yTimeline: null,
  
  // ============================================
  // Timeline Actions
  // ============================================
  
  setDuration: (duration) => {
    const { yTimeline } = get();
    
    if (yTimeline) {
      yTimeline.set('duration', duration);
    } else {
      set((state) => ({
        timeline: { ...state.timeline, duration }
      }));
    }
  },
  
  setFps: (fps) => {
    const { yTimeline } = get();
    
    if (yTimeline) {
      yTimeline.set('fps', fps);
    } else {
      set((state) => ({
        timeline: { ...state.timeline, fps }
      }));
    }
  },
  
  setResolution: (width, height) => {
    const { yTimeline } = get();
    
    if (yTimeline) {
      yTimeline.set('width', width);
      yTimeline.set('height', height);
    } else {
      set((state) => ({
        timeline: { ...state.timeline, width, height }
      }));
    }
  },
  
  setZoom: (zoom) => {
    set((state) => ({
      timeline: { ...state.timeline, zoom }
    }));
  },
  
  // ============================================
  // Playback Actions
  // ============================================
  
  play: () => {
    set((state) => ({
      timeline: { ...state.timeline, isPlaying: true }
    }));
    
    // Start playhead animation
    const animate = () => {
      const { timeline, isPlaying } = get();
      if (!isPlaying) return;
      
      const newPosition = timeline.playheadPosition + (1000 / timeline.fps);
      
      if (newPosition >= timeline.duration) {
        get().pause();
        get().seek(0);
      } else {
        get().seek(newPosition);
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  },
  
  pause: () => {
    set((state) => ({
      timeline: { ...state.timeline, isPlaying: false }
    }));
  },
  
  seek: (position) => {
    set((state) => ({
      timeline: { ...state.timeline, playheadPosition: Math.max(0, Math.min(position, state.timeline.duration)) }
    }));
  },
  
  // ============================================
  // Track Actions
  // ============================================
  
  addTrack: (track) => {
    const { yTimeline, timeline } = get();
    const newTrack: Track = {
      ...track,
      id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    if (yTimeline) {
      const tracks = yTimeline.get('tracks') as Y.Array<any>;
      tracks.push([newTrack]);
    } else {
      set((state) => ({
        timeline: {
          ...state.timeline,
          tracks: [...state.timeline.tracks, newTrack]
        }
      }));
    }
    
    return newTrack.id;
  },
  
  updateTrack: (id, updates) => {
    const { yTimeline, timeline } = get();
    
    if (yTimeline) {
      const tracks = yTimeline.get('tracks') as Y.Array<any>;
      const index = tracks.toArray().findIndex((t: Track) => t.id === id);
      if (index !== -1) {
        const track = tracks.get(index);
        Object.entries(updates).forEach(([key, value]) => {
          track.set(key, value);
        });
      }
    } else {
      set((state) => ({
        timeline: {
          ...state.timeline,
          tracks: state.timeline.tracks.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          )
        }
      }));
    }
  },
  
  removeTrack: (id) => {
    const { yTimeline, timeline } = get();
    
    if (yTimeline) {
      const tracks = yTimeline.get('tracks') as Y.Array<any>;
      const index = tracks.toArray().findIndex((t: Track) => t.id === id);
      if (index !== -1) {
        tracks.delete(index, 1);
      }
      
      // Also remove clips on this track
      const clips = yTimeline.get('clips') as Y.Array<any>;
      const clipIndices: number[] = [];
      clips.forEach((clip: Clip, i: number) => {
        if (clip.trackId === id) {
          clipIndices.push(i);
        }
      });
      clipIndices.reverse().forEach((i: number) => clips.delete(i, 1));
    } else {
      set((state) => ({
        timeline: {
          ...state.timeline,
          tracks: state.timeline.tracks.filter((t) => t.id !== id),
          clips: state.timeline.clips.filter((c) => c.trackId !== id)
        }
      }));
    }
    
    // Clear selection if removed
    if (get().timeline.selectedTrackId === id) {
      get().selectTrack(null);
    }
  },
  
  reorderTracks: (trackIds) => {
    const { timeline } = get();
    
    const reordered = trackIds.map((id) =>
      timeline.tracks.find((t) => t.id === id)!
    ).map((track, index) => ({ ...track, order: index }));
    
    set((state) => ({
      timeline: {
        ...state.timeline,
        tracks: reordered
      }
    }));
  },
  
  // ============================================
  // Clip Actions
  // ============================================
  
  addClip: (clip) => {
    const { yTimeline, timeline } = get();
    const newClip: Clip = {
      ...clip,
      id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    if (yTimeline) {
      const clips = yTimeline.get('clips') as Y.Array<any>;
      clips.push([newClip]);
    } else {
      set((state) => ({
        timeline: {
          ...state.timeline,
          clips: [...state.timeline.clips, newClip]
        }
      }));
    }
    
    return newClip.id;
  },
  
  updateClip: (id, updates) => {
    const { yTimeline, timeline } = get();
    
    if (yTimeline) {
      const clips = yTimeline.get('clips') as Y.Array<any>;
      const index = clips.toArray().findIndex((c: Clip) => c.id === id);
      if (index !== -1) {
        const clip = clips.get(index);
        Object.entries(updates).forEach(([key, value]) => {
          clip.set(key, value);
        });
      }
    } else {
      set((state) => ({
        timeline: {
          ...state.timeline,
          clips: state.timeline.clips.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          )
        }
      }));
    }
  },
  
  removeClip: (id) => {
    const { yTimeline, timeline } = get();
    
    if (yTimeline) {
      const clips = yTimeline.get('clips') as Y.Array<any>;
      const index = clips.toArray().findIndex((c: Clip) => c.id === id);
      if (index !== -1) {
        clips.delete(index, 1);
      }
    } else {
      set((state) => ({
        timeline: {
          ...state.timeline,
          clips: state.timeline.clips.filter((c) => c.id !== id)
        }
      }));
    }
    
    // Clear selection if removed
    if (get().timeline.selectedClipId === id) {
      get().selectClip(null);
    }
  },
  
  moveClip: (clipId, trackId, start) => {
    get().updateClip(clipId, { trackId, start });
  },
  
  trimClip: (clipId, side, delta) => {
    const { timeline } = get();
    const clip = timeline.clips.find((c) => c.id === clipId);
    
    if (!clip) return;
    
    if (side === 'start') {
      const newStart = Math.max(0, clip.start + delta);
      const newDuration = clip.duration - delta;
      
      if (newDuration > 100) { // Minimum 100ms
        get().updateClip(clipId, {
          start: newStart,
          duration: newDuration,
          trimStart: clip.trimStart + delta
        });
      }
    } else {
      const newDuration = Math.max(100, clip.duration + delta);
      get().updateClip(clipId, {
        duration: newDuration,
        trimEnd: clip.trimEnd - delta
      });
    }
  },
  
  splitClip: (clipId, position) => {
    const { timeline, addClip } = get();
    const clip = timeline.clips.find((c) => c.id === clipId);
    
    if (!clip || position <= clip.start || position >= clip.start + clip.duration) {
      return null;
    }
    
    const splitPoint = position - clip.start;
    
    // Update original clip
    get().updateClip(clipId, {
      duration: splitPoint,
      trimEnd: clip.trimStart + splitPoint
    });
    
    // Create new clip
    const newClipId = addClip({
      assetId: clip.assetId,
      trackId: clip.trackId,
      start: position,
      duration: clip.duration - splitPoint,
      trimStart: clip.trimStart + splitPoint,
      trimEnd: clip.trimEnd,
      speed: clip.speed,
      name: clip.name,
      thumbnail: clip.thumbnail
    });
    
    return newClipId;
  },
  
  // ============================================
  // Selection Actions
  // ============================================
  
  selectClip: (clipId) => {
    set((state) => ({
      timeline: { ...state.timeline, selectedClipId: clipId }
    }));
  },
  
  selectTrack: (trackId) => {
    set((state) => ({
      timeline: { ...state.timeline, selectedTrackId: trackId }
    }));
  },
  
  // ============================================
  // Yjs Actions
  // ============================================
  
  initializeYjs: (docName, token) => {
    const { yjs } = get();
    
    if (yjs) {
      yjs.disconnect();
    }
    
    // Create new Yjs connection
    // This would use the useYjs hook logic
    // For now, we'll set up a basic structure
    
    const doc = new Y.Doc();
    const yTimeline = doc.getMap('timeline');
    
    // Initialize with current state
    const state = get().timeline;
    yTimeline.set('duration', state.duration);
    yTimeline.set('fps', state.fps);
    yTimeline.set('width', state.width);
    yTimeline.set('height', state.height);
    yTimeline.set('clips', new Y.Array());
    yTimeline.set('tracks', new Y.Array());
    
    // Listen for updates
    yTimeline.observeDeep((events) => {
      events.forEach((event) => {
        if (event.target === yTimeline) {
          // Update local state from Yjs
          const newTimeline: Partial<TimelineState> = {};
          
          const duration = yTimeline.get('duration');
          if (duration !== undefined) newTimeline.duration = duration;
          
          const fps = yTimeline.get('fps');
          if (fps !== undefined) newTimeline.fps = fps;
          
          const width = yTimeline.get('width');
          if (width !== undefined) newTimeline.width = width;
          
          const height = yTimeline.get('height');
          if (height !== undefined) newTimeline.height = height;
          
          const clips = yTimeline.get('clips')?.toArray();
          if (clips) newTimeline.clips = clips;
          
          const tracks = yTimeline.get('tracks')?.toArray();
          if (tracks) newTimeline.tracks = tracks;
          
          set((state) => ({
            timeline: { ...state.timeline, ...newTimeline }
          }));
        }
      });
    });
    
    set({ yTimeline });
  },
  
  destroyYjs: () => {
    const { yjs } = get();
    
    if (yjs) {
      yjs.disconnect();
    }
    
    set({ yjs: null, yTimeline: null });
  },
  
  // ============================================
  // Import/Export Actions
  // ============================================
  
  importTimeline: (state) => {
    set((s) => ({
      timeline: { ...s.timeline, ...state }
    }));
  },
  
  exportTimeline: () => {
    return get().timeline;
  }
}));

export default useTimelineStore;
