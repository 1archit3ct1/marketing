'use client';

/**
 * AURA Voice Mic Button Component
 * Persistent mic button for voice command editing
 * 
 * Features:
 * - Click to start/stop recording
 * - Visual feedback during recording
 * - Transcription display
 * - Command execution feedback
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@aura/ui/components/Button';
import { Tooltip } from '@aura/ui/components/Tooltip';
import { Badge } from '@aura/ui/components/Badge';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface VoiceMicButtonProps {
  onCommand?: (command: string) => void;
  onTranscription?: (text: string) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
}

export const VoiceMicButton: React.FC<VoiceMicButtonProps> = ({
  onCommand,
  onTranscription,
  onError,
  disabled = false,
  className
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [commandResult, setCommandResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<number>(0);

  // Initialize speech recognition if available
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);

  useEffect(() => {
    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const fullTranscript = finalTranscript || interimTranscript;
        setTranscription(fullTranscript);
        onTranscription?.(fullTranscript);

        // Auto-detect command completion
        if (finalTranscript && isCommandComplete(finalTranscript)) {
          handleCommand(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(`Recognition error: ${event.error}`);
        onError?.(new Error(event.error));
        stopRecording();
      };

      setSpeechRecognition(recognition);
    }
  }, [onTranscription, onError]);

  // Check if command seems complete
  const isCommandComplete = (text: string): boolean => {
    const commandKeywords = [
      'cut', 'trim', 'delete', 'remove', 'add', 'make',
      'faster', 'slower', 'bigger', 'smaller', 'shorten'
    ];
    
    const lowerText = text.toLowerCase();
    return commandKeywords.some(keyword => lowerText.includes(keyword));
  };

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError('');
      setTranscription('');
      setCommandResult('');

      // Use Web Speech API if available
      if (speechRecognition) {
        speechRecognition.start();
        setIsRecording(true);
        return;
      }

      // Fallback to MediaRecorder
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudioCommand(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Monitor for silence
      startSilenceMonitoring(mediaRecorder, stream);

    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('Could not access microphone. Please check permissions.');
      onError?.(error as Error);
    }
  }, [speechRecognition, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (speechRecognition) {
      speechRecognition.stop();
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }

    setIsRecording(false);
  }, [speechRecognition]);

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Start silence monitoring for auto-stop
  const startSilenceMonitoring = (mediaRecorder: MediaRecorder, stream: MediaStream) => {
    const audioContext = new AudioContext();
    const audioSource = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    audioSource.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const detectSilence = () => {
      if (mediaRecorder.state !== 'recording') return;

      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;

      if (average < 10) {
        silenceTimerRef.current++;
        
        // Auto-stop after 2 seconds of silence
        if (silenceTimerRef.current > 20) {
          stopRecording();
          silenceTimerRef.current = 0;
          return;
        }
      } else {
        silenceTimerRef.current = 0;
      }

      silenceTimeoutRef.current = setTimeout(detectSilence, 100);
    };

    detectSilence();
  };

  // Process audio command
  const processAudioCommand = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // In production, send to backend for Whisper transcription + command parsing
      // const formData = new FormData();
      // formData.append('audio', audioBlob, 'recording.webm');
      // const response = await fetch('/api/voice/command', { method: 'POST', body: formData });
      // const data = await response.json();
      
      // Mock processing for development
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock result
      const mockResult = 'Split clip at 0:42';
      setCommandResult(mockResult);
      onCommand?.(transcription);
      
    } catch (error) {
      console.error('Failed to process voice command:', error);
      setError('Failed to process voice command');
      onError?.(error as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear status
  const clearStatus = () => {
    setTranscription('');
    setCommandResult('');
    setError('');
  };

  // Keyboard shortcut (Ctrl+M or Cmd+M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        toggleRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording]);

  return (
    <div className={cn('relative', className)}>
      {/* Main Mic Button */}
      <Tooltip content={isRecording ? 'Stop recording (Ctrl+M)' : 'Start voice command (Ctrl+M)'} position="top">
        <button
          onClick={toggleRecording}
          disabled={disabled || isProcessing}
          className={cn(
            'relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300',
            'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:ring-offset-2 focus:ring-offset-background',
            disabled && 'opacity-50 cursor-not-allowed',
            isProcessing && 'cursor-wait'
          )}
          style={{
            background: isRecording 
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              : isProcessing
              ? 'linear-gradient(135deg, #7c5cfc 0%, #6d28d9 100%)'
              : 'linear-gradient(135deg, #7c5cfc 0%, #6d28d9 100%)'
          }}
        >
          {/* Recording Pulse Animation */}
          {isRecording && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
              <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse opacity-50" />
            </>
          )}

          {/* Mic Icon */}
          {isProcessing ? (
            <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
      </Tooltip>

      {/* Transcription Display */}
      {(transcription || commandResult || error) && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-panel border border-border rounded-xl shadow-xl p-3 z-50">
          {error ? (
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : commandResult ? (
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-accent-green flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-accent-green font-medium">{commandResult}</p>
                {transcription && (
                  <p className="text-xs text-gray-400 mt-1">"{transcription}"</p>
                )}
              </div>
              <button onClick={clearStatus} className="text-gray-400 hover:text-white">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">Listening...</p>
                <p className="text-sm text-white">{transcription || 'Speak now...'}</p>
              </div>
              <button onClick={clearStatus} className="text-gray-400 hover:text-white">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Arrow */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-panel border-r border-b border-border" />
        </div>
      )}

      {/* Keyboard Shortcut Hint */}
      {!isRecording && !transcription && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
          Ctrl+M
        </div>
      )}
    </div>
  );
};

export default VoiceMicButton;
