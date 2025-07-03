import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, X } from 'lucide-react';

const SimpleVoiceRecorder = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    startRecording();
    return () => cleanup();
  }, []);

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
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error('Error starting recording:', error);
      onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);
      onSend({
        audioBlob,
        audioUrl,
        duration: recordingTime,
        size: audioBlob.size,
        mimeType: audioBlob.type
      });
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-3 bg-gray-100 rounded-lg p-3">
      {/* Recording indicator */}
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className="text-sm font-mono text-gray-700">
          {formatTime(recordingTime)}
        </span>
      </div>

      {/* Waveform visualization */}
      <div className="flex-1 flex items-center justify-center space-x-1 h-8">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className={`w-1 bg-green-500 rounded-full transition-all duration-200 ${
              isRecording ? 'animate-pulse' : ''
            }`}
            style={{
              height: `${10 + Math.random() * 20}px`,
              opacity: isRecording ? 1 : 0.5
            }}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onCancel}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
          title="Cancel"
        >
          <X className="w-5 h-5" />
        </button>

        {isRecording ? (
          <button
            onClick={stopRecording}
            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
            title="Stop recording"
          >
            <div className="w-3 h-3 bg-white rounded-sm" />
          </button>
        ) : audioBlob ? (
          <button
            onClick={handleSend}
            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
            title="Send voice message"
          >
            <Send className="w-5 h-5" />
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default SimpleVoiceRecorder;