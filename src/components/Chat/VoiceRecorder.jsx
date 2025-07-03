import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, X, Square } from 'lucide-react';

const VoiceRecorder = ({ isOpen, onClose, onSend }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startRecording();
    } else {
      cleanup();
    }

    return () => cleanup();
  }, [isOpen]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const cleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
    setAudioBlob(null);
    chunksRef.current = [];
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        } 
      });
      
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: 'audio/webm;codecs=opus'
        });
        setAudioBlob(blob);
        
        // Auto-send when recording stops
        setTimeout(() => {
          if (blob && recordingTime > 0) {
            const voiceMessage = {
              type: 'voice',
              audioBlob: blob,
              rawDuration: recordingTime,
              size: blob.size,
              mimeType: blob.type
            };
            onSend(voiceMessage);
            onClose();
          }
        }, 100);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
      onClose();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancel = () => {
    cleanup();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-800">
            {isRecording ? 'Recording Voice Message' : 'Voice Message'}
          </h3>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center h-20 bg-gray-50 rounded-lg">
            <div className="flex items-end space-x-1 h-12">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1 bg-green-500 rounded-full transition-all duration-300 ${
                    isRecording ? 'animate-pulse' : ''
                  }`}
                  style={{
                    height: `${20 + Math.random() * 80}%`,
                    minHeight: '4px',
                    opacity: isRecording ? 1 : 0.3
                  }}
                />
              ))}
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-gray-800">
              {formatTime(recordingTime)}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {isRecording 
                ? 'Recording... Tap stop to send'
                : 'Tap to start recording'
              }
            </p>
          </div>

          <div className="flex items-center justify-center space-x-4">
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg"
                title="Stop and Send"
              >
                <Square className="w-6 h-6" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="p-6 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors animate-pulse shadow-lg"
                title="Start Recording"
              >
                <Mic className="w-8 h-8" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceRecorder;