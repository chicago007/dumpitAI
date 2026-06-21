"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
};

type SpeechRecognitionResultEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
};

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionInstance)
  | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const SPEECH_ERRORS: Record<string, string> = {
  "not-allowed":
    "마이크 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.",
  "no-speech": "음성이 감지되지 않았습니다. 다시 시도해 주세요.",
  "network": "음성 인식에 네트워크 연결이 필요합니다.",
  aborted: "음성 입력이 중단되었습니다.",
};

export function useSpeechRecognition(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const baseContentRef = useRef("");

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const startListening = useCallback(
    (currentContent: string) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) {
        setSpeechError("이 브라우저는 음성 입력을 지원하지 않습니다.");
        return;
      }

      if (recognitionRef.current) {
        stopListening();
        return;
      }

      setSpeechError(null);
      baseContentRef.current = currentContent;

      const recognition = new Ctor();
      recognition.lang = "ko-KR";
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };
      recognition.onerror = (event) => {
        const message =
          SPEECH_ERRORS[event.error] ??
          "음성 입력 중 오류가 발생했습니다.";
        setSpeechError(message);
        setIsListening(false);
        recognitionRef.current = null;
      };
      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const base = baseContentRef.current;
        const trimmed = transcript.trim();
        if (!trimmed) return;

        const combined = base
          ? `${base.trimEnd()} ${trimmed}`
          : trimmed;
        onTranscript(combined);
      };

      recognitionRef.current = recognition;
      recognition.start();
    },
    [onTranscript, stopListening],
  );

  useEffect(() => {
    return () => stopListening();
  }, [stopListening]);

  return {
    isListening,
    isSupported,
    speechError,
    startListening,
    stopListening,
  };
}
