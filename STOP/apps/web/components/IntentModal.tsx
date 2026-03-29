'use client';

/**
 * AURA Intent Modal
 * Primary creation entry point - replaces 'open file and start editing'
 * 
 * Features:
 * - Upload footage area (drag or phone upload QR)
 * - Intent field: text input OR voice recording
 * - Platform selector
 * - Vibe selector (5 mood tiles)
 */

import React, { useState, useCallback, useRef } from 'react';
import { Modal } from '@aura/ui/components/Modal';
import { Button } from '@aura/ui/components/Button';
import { Input } from '@aura/ui/components/Input';
import { Textarea } from '@aura/ui/components/Textarea';
import { VStack, HStack } from '@aura/ui/components/Stack';
import { Badge } from '@aura/ui/components/Badge';
import { Panel } from '@aura/ui/components/Panel';
import { Typography } from '@aura/ui/components/Typography';
import { VibePicker, VibeType } from './VibePicker';
import { PlatformSelector, PlatformType } from './PlatformSelector';

export interface IntentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (intent: IntentData) => void;
  projectId?: string;
}

export interface IntentData {
  text: string;
  voiceRecordingUrl?: string;
  platform: PlatformType;
  vibe: VibeType;
  assetIds: string[];
}

export const IntentModal: React.FC<IntentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  projectId
}) => {
  const [intentText, setIntentText] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('tiktok');
  const [selectedVibe, setSelectedVibe] = useState<VibeType>('hype');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState<string | null>(null);
  const [uploadedAssets, setUploadedAssets] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle text input changes and generate suggestions
  const handleTextChange = (value: string) => {
    setIntentText(value);
    
    // Generate suggestions for partial input
    if (value.length > 3 && value.length < 20) {
      // In production, call API for suggestions
      const mockSuggestions = [
        `Make a 60s ${selectedVibe} video for ${selectedPlatform}`,
        `Create a high energy edit with trending music`,
        `Turn my footage into a viral ${selectedPlatform} clip`
      ];
      setSuggestions(mockSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setVoiceRecording(audioUrl);
        
        // In production, upload to server and get URL
        // const formData = new FormData();
        // formData.append('audio', audioBlob, 'recording.webm');
        // const response = await fetch('/api/upload-audio', { method: 'POST', body: formData });
        // const data = await response.json();
        // setVoiceRecording(data.url);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  // Process uploaded files
  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      // In production, upload to server
      // const formData = new FormData();
      // formData.append('file', file);
      // formData.append('projectId', projectId || '');
      // const response = await fetch('/api/ingest/upload', { method: 'POST', body: formData });
      // const data = await response.json();
      // setUploadedAssets(prev => [...prev, data.assetId]);
      
      // Mock: just store filename as ID
      setUploadedAssets(prev => [...prev, `asset_${file.name.replace(/\s/g, '_')}`]);
    }
  };

  // Remove uploaded asset
  const removeAsset = (assetId: string) => {
    setUploadedAssets(prev => prev.filter(id => id !== assetId));
  };

  // Apply suggestion
  const applySuggestion = (suggestion: string) => {
    setIntentText(suggestion);
    setSuggestions([]);
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!intentText && !voiceRecording) {
      return; // Require either text or voice
    }

    const intentData: IntentData = {
      text: intentText,
      voiceRecordingUrl: voiceRecording || undefined,
      platform: selectedPlatform,
      vibe: selectedVibe,
      assetIds: uploadedAssets
    };

    onSubmit(intentData);
    handleClose();
  };

  // Handle close and reset
  const handleClose = () => {
    setIntentText('');
    setVoiceRecording(null);
    setUploadedAssets([]);
    setSuggestions([]);
    onClose();
  };

  // Example intents for inspiration
  const exampleIntents = [
    'Make a 60s TikTok hook from my gym footage, high energy, trending sound',
    'YouTube tutorial intro, professional, under 30s',
    'Instagram Reels showcasing my product, aesthetic vibes, chill music',
    'Fast-paced gaming highlights with beat drops and captions'
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Project"
      description="Describe what you want to make. AURA will draft it for you."
      size="xl"
    >
      <VStack gap="lg" className="w-full">
        
        {/* Step 1: Upload Footage */}
        <section className="w-full">
          <Typography variant="h4" className="mb-3">1. Upload Footage</Typography>
          
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
              isDragOver
                ? 'border-accent-purple bg-accent-purple/10'
                : 'border-border hover:border-gray-600'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*,image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-panel flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              
              <div>
                <p className="text-white font-medium">Drag and drop files here</p>
                <p className="text-gray-400 text-sm mt-1">
                  or <button onClick={() => fileInputRef.current?.click()} className="text-accent-purple hover:underline">browse files</button>
                </p>
              </div>
              
              <p className="text-gray-500 text-xs">
                Supports: MP4, MOV, AVI, MKV, WebM, MP3, WAV, JPG, PNG, GIF
              </p>
            </div>
          </div>
          
          {/* Uploaded Assets */}
          {uploadedAssets.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {uploadedAssets.map((assetId) => (
                <Badge key={assetId} variant="accent" size="sm" className="gap-2">
                  {assetId.replace('asset_', '').replace(/_/g, ' ')}
                  <button
                    onClick={() => removeAsset(assetId)}
                    className="ml-1 hover:text-white"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </Badge>
              ))}
            </div>
          )}
          
          {/* QR Upload Option */}
          <div className="mt-3 flex items-center justify-between">
            <Typography variant="caption">Or upload from phone</Typography>
            <Button variant="ghost" size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Show QR Code
            </Button>
          </div>
        </section>

        {/* Step 2: Describe Your Vision */}
        <section className="w-full">
          <Typography variant="h4" className="mb-3">2. Describe Your Vision</Typography>
          
          <div className="relative">
            <Textarea
              value={intentText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Tell AURA what you want to create... e.g., 'Make a 60s TikTok hook from my gym footage, high energy, trending sound'"
              rows={4}
              className="pr-12"
            />
            
            {/* Voice Recording Button */}
            <div className="absolute right-3 bottom-3">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-2 rounded-full transition-all duration-200 ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-panel text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
                title={isRecording ? 'Stop recording' : 'Start voice recording'}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Voice Recording Preview */}
          {voiceRecording && (
            <div className="mt-3 flex items-center gap-3 p-3 bg-panel rounded-lg">
              <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-white">Voice recording</p>
                <audio src={voiceRecording} controls className="h-8 mt-1" />
              </div>
              <button
                onClick={() => setVoiceRecording(null)}
                className="p-2 text-gray-400 hover:text-red-500"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-3 space-y-2">
              <Typography variant="caption">Suggestions:</Typography>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => applySuggestion(suggestion)}
                    className="px-3 py-1.5 bg-panel border border-border rounded-full text-xs text-gray-300 hover:text-white hover:border-gray-600 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Example Intents */}
          {!intentText && (
            <div className="mt-4">
              <Typography variant="caption" className="mb-2 block">Examples:</Typography>
              <div className="space-y-1">
                {exampleIntents.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleTextChange(example)}
                    className="block w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-panel transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Step 3: Select Platform */}
        <section className="w-full">
          <Typography variant="h4" className="mb-3">3. Select Platform</Typography>
          <PlatformSelector
            value={selectedPlatform}
            onChange={setSelectedPlatform}
          />
        </section>

        {/* Step 4: Choose Vibe */}
        <section className="w-full">
          <Typography variant="h4" className="mb-3">4. Choose Vibe</Typography>
          <VibePicker
            selectedVibe={selectedVibe}
            onSelect={setSelectedVibe}
          />
        </section>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          
          <Button
            variant="accent"
            onClick={handleSubmit}
            disabled={!intentText && !voiceRecording}
            className="px-8"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Draft
          </Button>
        </div>
      </VStack>
    </Modal>
  );
};

export default IntentModal;
