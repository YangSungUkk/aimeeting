import { useCallback, useEffect, useRef, useState } from "react";

type RecorderStatus = "idle" | "recording" | "paused" | "stopped";

type RecorderPanelProps = {
  onTranscript?: (text: string) => void;
};

export default function RecorderPanel({ onTranscript }: RecorderPanelProps) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [permissionError, setPermissionError] = useState<string>("");
  const [partialText, setPartialText] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const wsReadyRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const formatTime = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const hh = String(Math.floor(total / 3600)).padStart(2, "0");
    const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    return hh === "00" ? `${mm}:${ss}` : `${hh}:${mm}:${ss}`;
  };

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    startTimeRef.current = Date.now() - elapsedMs;
    timerRef.current = window.setInterval(() => {
      if (startTimeRef.current != null) {
        setElapsedMs(Date.now() - startTimeRef.current);
      }
    }, 200);
  };

  const handleStart = useCallback(async () => {
    try {
      setPermissionError("");
      // 보안 컨텍스트/로컬호스트 확인
      const isSecure = typeof window !== "undefined" ? window.isSecureContext : true;
      const host = typeof window !== "undefined" ? window.location.hostname : "";
      const isLocalhost = host === "localhost" || host === "127.0.0.1";
      if (!isSecure && !isLocalhost) {
        setPermissionError("마이크는 HTTPS에서만 동작합니다. 배포(https) 또는 터널(ngrok)로 접속하세요.");
        setStatus("idle");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        // TODO: 업로드 또는 STT 전송 훅 연동 예정
        void blob;
      };
      mediaRecorder.start();
      setElapsedMs(0);
      setStatus("recording");
      startTimer();

      // AssemblyAI Realtime 연결
      const tokenRes = await fetch("/api/assemblyai-token", { method: "POST" });
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok || !tokenJson.token) {
        const serverMsg = (tokenJson && tokenJson.error) ? String(tokenJson.error) : "Token failed";
        setPermissionError(`토큰 발급 실패: ${serverMsg}`);
        throw new Error(serverMsg);
      }

      const sampleRate = 16000;
      const url = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${sampleRate}&token=${tokenJson.token}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        wsReadyRef.current = true;
      };

      ws.onclose = () => {
        wsReadyRef.current = false;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            text?: string;
            transcript?: string;
            message_type?: string;
          };
          const candidate = msg.text || msg.transcript || "";
          if (candidate) {
            setPartialText(candidate);
            if (onTranscript) onTranscript(candidate);
          }
        } catch {
          // ignore non-JSON frames
        }
      };
      ws.onerror = () => {
        setPermissionError("실시간 연결 오류가 발생했습니다.");
      };

      // 마이크 → AudioContext → ScriptProcessor → PCM Int16 → WS 전송
      type WindowWithAudio = Window & {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const { AudioContext: AC, webkitAudioContext: WAC } = window as unknown as WindowWithAudio;
      const AudioCtxCtor = AC ?? WAC;
      if (!AudioCtxCtor) throw new Error("AudioContext not supported");
      const audioCtx = new AudioCtxCtor({ sampleRate });
      try { await audioCtx.resume(); } catch {}
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      mediaStreamSourceRef.current = source;
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      source.connect(processor);
      processor.connect(audioCtx.destination);

      const toBase64 = (buffer: ArrayBuffer) => {
        let binary = "";
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
        // btoa is available in browsers
        return btoa(binary);
      };

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        if (ws && ws.readyState === WebSocket.OPEN && wsReadyRef.current) {
          const base64 = toBase64(pcm16.buffer);
          try {
            ws.send(JSON.stringify({ audio_data: base64 }));
          } catch {}
        }
      };
    } catch (err) {
      const name = (err as { name?: string })?.name || "";
      const message =
        name === "NotAllowedError"
          ? "브라우저 권한이 차단되었습니다. 주소창 사이트 설정에서 마이크를 '허용'으로 변경하세요."
          : name === "NotFoundError"
          ? "사용 가능한 마이크가 없습니다. 입력 장치를 확인하세요."
          : name === "NotReadableError"
          ? "다른 앱이 마이크를 사용 중입니다. 해당 앱을 종료 후 다시 시도하세요."
          : name === "NotSupportedError"
          ? "브라우저가 마이크를 지원하지 않거나 정책상 차단되었습니다. 최신 브라우저/HTTPS를 사용하세요."
          : (err as Error)?.message?.includes("Token")
          ? "실시간 토큰 발급에 실패했습니다. 서버 환경변수를 확인하세요."
          : "실시간 전송 중 오류가 발생했습니다. 네트워크/브라우저 설정을 확인하세요.";
      setPermissionError(message);
      setStatus("idle");
    }
  }, [startTimer]);

  const handlePause = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) return;
    if (status === "recording") {
      mediaRecorder.pause();
      setStatus("paused");
      stopTimer();
    }
  }, [status, stopTimer]);

  const handleResume = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) return;
    if (status === "paused") {
      mediaRecorder.resume();
      setStatus("recording");
      startTimer();
    }
  }, [status, startTimer]);

  const handleStop = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) return;
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
    setStatus("stopped");
    stopTimer();

    // 오디오 노드 및 WS 정리
    try { processorRef.current?.disconnect(); } catch {}
    try { mediaStreamSourceRef.current?.disconnect(); } catch {}
    try { audioContextRef.current?.close(); } catch {}
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try { wsRef.current.close(); } catch {}
    }
  }, [stopTimer]);

  useEffect(() => {
    return () => {
      stopTimer();
      const mediaRecorder = mediaRecorderRef.current;
      if (mediaRecorder) {
        try { mediaRecorder.stop(); } catch {}
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const isRecording = status === "recording";
  const isPaused = status === "paused";
  const isIdle = status === "idle" || status === "stopped";

  return (
    <div className="rounded-xl border border-black/[.08] dark:border-white/[.12] p-4 bg-background/80 min-h-[260px]">
      {!((typeof window !== "undefined" ? window.isSecureContext : true) || (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))) && (
        <div className="mb-3 text-xs text-amber-600 bg-amber-100/40 dark:text-amber-300 dark:bg-amber-300/10 px-2 py-2 rounded space-y-2">
          <div>이 페이지는 보안 연결(HTTPS)이 아닙니다. 마이크 권한은 HTTPS 또는 localhost에서만 동작합니다.</div>
          <div className="text-[11px] text-foreground/70">
            휴대폰으로 <span className="font-medium">192.168.x.x</span>로 접속 중이라면 아래 방법 중 하나로 HTTPS로 접속하세요.
          </div>
          <div className="rounded border border-black/[.06] dark:border-white/[.08] bg-background/70 p-2 text-[11px]">
            <div className="font-medium mb-1">빠른 방법 1: 터널링 (권장)</div>
            <pre className="whitespace-pre-wrap break-all">npx ngrok http 3000</pre>
            <div className="text-foreground/60 mt-1">발급된 <span className="font-mono">https://*.ngrok.io</span> 주소로 휴대폰에서 접속</div>
          </div>
          <div className="rounded border border-black/[.06] dark:border-white/[.08] bg-background/70 p-2 text-[11px]">
            <div className="font-medium mb-1">방법 2: 로컬 HTTPS 프록시</div>
            <pre className="whitespace-pre-wrap break-all">npx local-ssl-proxy --source 3443 --target 3000</pre>
            <div className="text-foreground/60 mt-1">휴대폰에서 <span className="font-mono">https://[PC-로컬-IP]:3443</span> 접속 (최초 보안 경고 확인 필요)</div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-foreground/70">녹음 상태</div>
        <div className={`text-sm font-medium ${isRecording ? "text-red-500" : "text-foreground/80"}`}>
          {status === "idle" && "대기 중"}
          {status === "recording" && "녹음 중"}
          {status === "paused" && "일시 정지"}
          {status === "stopped" && "정지됨"}
        </div>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className={`h-2 w-2 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-foreground/40"}`}></div>
        <div className="text-2xl tabular-nums font-semibold" aria-label="경과 시간">{formatTime(elapsedMs)}</div>
      </div>
      {permissionError && (
        <div className="text-xs text-red-500 mb-3">{permissionError}</div>
      )}
      <div className="mb-3 text-sm text-foreground/70 min-h-[24px]" aria-live="polite">{partialText}</div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleStart}
          disabled={!isIdle}
          className="h-10 px-4 rounded-md bg-foreground text-background disabled:opacity-40"
        >
          시작
        </button>
        <button
          onClick={isPaused ? handleResume : handlePause}
          disabled={!isRecording && !isPaused}
          className="h-10 px-4 rounded-md border border-black/[.1] dark:border-white/[.15] disabled:opacity-40"
        >
          {isPaused ? "재개" : "일시 정지"}
        </button>
        <button
          onClick={handleStop}
          disabled={!isRecording && !isPaused}
          className="h-10 px-4 rounded-md border border-black/[.1] dark:border-white/[.15] disabled:opacity-40"
        >
          정지
        </button>
      </div>
    </div>
  );
}


