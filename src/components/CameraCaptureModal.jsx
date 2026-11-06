import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Camera, X, Check, RotateCcw, RefreshCw, AlertCircle, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CameraCaptureModal({ isOpen, onCapture, onClose }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const isOpenRef = useRef(isOpen);
  const activeReqIdRef = useRef(0);
  const snappedUrlRef = useRef(null);

  const [streamReady, setStreamReady] = useState(false);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [snappedBlob, setSnappedBlob] = useState(null);
  const [snappedUrl, setSnappedUrl] = useState(null);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const stopStream = useCallback(() => {
    activeReqIdRef.current += 1;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        const srcObj = videoRef.current.srcObject;
        if (srcObj && srcObj.getTracks) {
          srcObj.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch {}
          });
        }
      } catch {}
      videoRef.current.srcObject = null;
    }
    setStreamReady(false);
    setIsLoadingCamera(false);
  }, []);

  const startCamera = useCallback(async (mode = facingMode) => {
    stopStream();
    setErrorMsg(null);
    setIsLoadingCamera(true);

    if (snappedUrlRef.current) {
      URL.revokeObjectURL(snappedUrlRef.current);
      snappedUrlRef.current = null;
    }
    setSnappedBlob(null);
    setSnappedUrl(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg(t("kosten.cameraError", "Camera is niet beschikbaar op dit apparaat."));
      setIsLoadingCamera(false);
      return;
    }

    const currentReqId = ++activeReqIdRef.current;

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback for laptops/webcams where ideal facingMode or resolution fails
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      // If user closed modal or requested another stream while waiting for getUserMedia
      if (activeReqIdRef.current !== currentReqId || !isOpenRef.current) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;

        const markReady = () => {
          if (activeReqIdRef.current === currentReqId) {
            setStreamReady(true);
            setIsLoadingCamera(false);
          }
        };

        video.onloadedmetadata = markReady;
        video.oncanplay = markReady;
        video.onplay = markReady;

        try {
          await video.play();
          markReady();
        } catch {
          // Play might be deferred by browser
        }
      }
    } catch (err) {
      if (activeReqIdRef.current !== currentReqId || !isOpenRef.current) return;
      console.warn("[CameraCaptureModal] getUserMedia error:", err);
      setIsLoadingCamera(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg(t("kosten.cameraPermissionDenied", "Cameratoegang is geweigerd. Geef toestemming in je browser."));
      } else {
        setErrorMsg(t("kosten.cameraError", "Kan camera niet openen. Upload een foto via je bestanden."));
      }
    }
  }, [facingMode, stopStream, t]);

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopStream();
    }
    return () => {
      stopStream();
      if (snappedUrlRef.current) {
        URL.revokeObjectURL(snappedUrlRef.current);
        snappedUrlRef.current = null;
      }
    };
  }, [isOpen, facingMode, startCamera, stopStream]);

  const toggleCameraFacing = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || video.clientWidth || 1280;
    const height = video.videoHeight || video.clientHeight || 720;

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvasRef.current = canvas;
    }
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setSnappedBlob(blob);
        if (snappedUrlRef.current) {
          URL.revokeObjectURL(snappedUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        snappedUrlRef.current = url;
        setSnappedUrl(url);
      },
      "image/jpeg",
      0.92
    );
  };

  const handleRetake = () => {
    if (snappedUrlRef.current) {
      URL.revokeObjectURL(snappedUrlRef.current);
      snappedUrlRef.current = null;
    }
    setSnappedBlob(null);
    setSnappedUrl(null);

    // Keep stream alive: immediately ensure video element plays
    if (streamRef.current) {
      if (videoRef.current) {
        if (videoRef.current.srcObject !== streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
        videoRef.current.play().catch(() => {});
        setStreamReady(true);
      }
    } else {
      startCamera(facingMode);
    }
  };

  const handleConfirmUse = () => {
    if (!snappedBlob) return;
    const file = new File([snappedBlob], `receipt-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    if (snappedUrlRef.current) {
      URL.revokeObjectURL(snappedUrlRef.current);
      snappedUrlRef.current = null;
    }
    stopStream();
    onCapture(file);
    onClose();
  };

  const handleClose = () => {
    if (snappedUrlRef.current) {
      URL.revokeObjectURL(snappedUrlRef.current);
      snappedUrlRef.current = null;
    }
    stopStream();
    onClose();
  };

  const handleFallbackFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (snappedUrlRef.current) {
        URL.revokeObjectURL(snappedUrlRef.current);
        snappedUrlRef.current = null;
      }
      stopStream();
      onCapture(file);
      onClose();
    }
  };

  const [phoneEl, setPhoneEl] = useState(() =>
    typeof document !== "undefined" ? document.getElementById("app-shell-phone") : null
  );

  useEffect(() => {
    if (!phoneEl && typeof document !== "undefined") {
      setPhoneEl(document.getElementById("app-shell-phone"));
    }
  }, [phoneEl]);

  if (!isOpen) return null;

  const modalNode = (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-3 rounded-3xl overflow-hidden backdrop-blur-xs"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-h-[92%] flex flex-col overflow-hidden rounded-3xl border border-border bg-card p-3.5 shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="font-display text-sm font-bold text-ink truncate">
              {t("kosten.cameraTitle", "Foto van bon maken")}
            </h3>
            <p className="text-[11px] text-ink-soft truncate">
              {t("kosten.cameraSubtitle", "Plaats de bon in beeld en maak een scherpe foto")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label={t("kosten.cameraClose", "Annuleren")}
            className="grid size-8 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-muted cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative w-full flex-1 min-h-[200px] max-h-[285px] overflow-hidden rounded-xl bg-black flex items-center justify-center">
          {errorMsg ? (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center text-white">
              <AlertCircle className="size-8 text-amber-400 mb-2" />
              <p className="text-xs font-semibold max-w-xs">{errorMsg}</p>
              <label className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-95">
                <Upload className="size-3.5" />
                <span>{t("kosten.chooseFile", "Bestand kiezen")}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFallbackFile}
                />
              </label>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${snappedUrl ? "hidden" : "block"}`}
              />

              {snappedUrl ? (
                <img
                  src={snappedUrl}
                  alt="Receipt preview"
                  className="absolute inset-0 h-full w-full object-contain bg-black"
                />
              ) : null}

              {isLoadingCamera && !streamReady && !snappedUrl ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white gap-2">
                  <Loader2 className="size-6 animate-spin text-white/80" />
                  <span className="text-xs">{t("kosten.cameraLoading", "Camera starten...")}</span>
                </div>
              ) : null}

              {/* Viewfinder frame overlay */}
              {!snappedUrl ? (
                <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-dashed border-white/60" />
              ) : null}
            </>
          )}
        </div>

        {/* Controls */}
        <div className="mt-3 flex items-center justify-between gap-2 shrink-0">
          {snappedUrl ? (
            <>
              <Button
                variant="outline"
                onClick={handleRetake}
                className="flex-1 min-h-[38px] gap-1.5 rounded-xl text-xs font-bold"
              >
                <RotateCcw className="size-3.5" />
                <span>{t("kosten.cameraRetake", "Opnieuw")}</span>
              </Button>
              <Button
                onClick={handleConfirmUse}
                className="flex-1 min-h-[38px] gap-1.5 rounded-xl text-xs font-bold bg-brand text-primary-foreground hover:bg-brand/90"
              >
                <Check className="size-3.5" />
                <span>{t("kosten.cameraUsePhoto", "Foto gebruiken")}</span>
              </Button>
            </>
          ) : !errorMsg ? (
            <>
              <button
                type="button"
                onClick={toggleCameraFacing}
                title={t("kosten.cameraSwitch", "Camera wisselen")}
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-background text-ink shadow-2xs hover:bg-muted cursor-pointer"
              >
                <RefreshCw className="size-4" />
              </button>

              <button
                type="button"
                onClick={handleCapture}
                disabled={!streamReady && isLoadingCamera}
                className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-xs font-bold text-primary-foreground shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Camera className="size-4" />
                <span>{t("kosten.cameraCapture", "Foto maken")}</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="px-2.5 py-2 text-xs font-semibold text-ink-soft hover:text-ink cursor-pointer"
              >
                {t("kosten.cameraClose", "Annuleren")}
              </button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full min-h-[38px] rounded-xl text-xs"
            >
              {t("kosten.cameraClose", "Sluiten")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return phoneEl ? createPortal(modalNode, phoneEl) : modalNode;
}
