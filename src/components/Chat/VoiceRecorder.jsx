import React, { useState, useRef, useEffect } from 'react';
import { Mic, X, Square } from 'lucide-react';

const VoiceRecorder = ({ isOpen, onClose, onSend }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
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

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { 
          type: 'audio/webm;codecs=opus'
        });
        
        // Send immediately when recording stops
        if (blob && recordingTime > 0) {
          const voiceMessage = {
            type: 'voice',
            audioBlob: blob,
            rawDuration: recordingTime,
            size: blob.size,
            mimeType: blob.type
          };
          
          // Call onSend and wait for it to complete
          await onSend(voiceMessage);
        }
        
        // Close the recorder after sending
        onClose();
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setIsRecording(false);
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
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
            Recording Voice Message
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
                ? 'Recording... Press stop to send'
                : 'Sending voice message...'
              }
            </p>
          </div>

          <div className="flex items-center justify-center">
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg"
                title="Stop and Send"
              >
                <Square className="w-6 h-6" />
              </button>
            ) : (
              <div className="p-4">
                <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceRecorder;