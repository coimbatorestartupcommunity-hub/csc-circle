"use client";

import * as React from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import {
  UploadCloud,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Video,
  ExternalLink,
  ShieldCheck,
  Calendar,
  ArrowRight,
  Mail,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

type Step = "upload" | "decoding" | "verifying" | "otp" | "success" | "error" | "early";

interface CheckInSuccessData {
  attendeeName: string;
  reference: string;
  eventTitle: string;
  meetingUrl: string;
  joinUrl?: string;
  alreadyCheckedIn?: boolean;
}

interface EarlyCheckInData {
  opensAt?: string;
  startsAt?: string;
  eventTitle?: string;
  message?: string;
}

interface OtpChallengeData {
  challengeId: string;
  maskedEmail: string;
  attendeeName: string;
  token: string;
}

export function QrCheckInClient({
  initialToken,
}: {
  initialToken?: string;
}) {
  const [step, setStep] = React.useState<Step>(
    initialToken && initialToken.length >= 16 ? "verifying" : "upload"
  );
  const [errorMessage, setErrorMessage] = React.useState<string>("");
  const [successData, setSuccessData] = React.useState<CheckInSuccessData | null>(null);
  const [earlyData, setEarlyData] = React.useState<EarlyCheckInData | null>(null);
  const [otpData, setOtpData] = React.useState<OtpChallengeData | null>(null);
  const [otpInput, setOtpInput] = React.useState<string>("");
  const [isVerifyingOtp, setIsVerifyingOtp] = React.useState<boolean>(false);
  const [countdown, setCountdown] = React.useState<number>(3);
  const [cameraActive, setCameraActive] = React.useState<boolean>(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const controlsRef = React.useRef<IScannerControls | null>(null);

  // Stop camera stream safely
  const stopCamera = React.useCallback(() => {
    try {
      controlsRef.current?.stop();
    } catch {}
    controlsRef.current = null;
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks?.().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  React.useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // 1. Process QR token with server
  const verifyToken = React.useCallback(async (token: string) => {
    stopCamera();
    setStep("verifying");
    setErrorMessage("");

    try {
      const res = await fetch("/api/events/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (data.status === "early") {
          setEarlyData({
            opensAt: data.opensAt,
            startsAt: data.startsAt,
            eventTitle: data.eventTitle || "Coimbatore Startup Community (CSC) - Joint Online Meeting",
            message: data.error,
          });
          setStep("early");
          return;
        }
        setErrorMessage(
          data.error || "Verification failed. Please check your QR code and try again."
        );
        setStep("error");
        return;
      }

      // If Option C: Registered email OTP is required
      if (data.requiresOtp) {
        setOtpData({
          challengeId: data.challengeId,
          maskedEmail: data.maskedEmail,
          attendeeName: data.attendeeName,
          token,
        });
        setStep("otp");
        return;
      }

      // Check-in Completed
      setSuccessData({
        attendeeName: data.attendeeName,
        reference: data.reference,
        eventTitle: data.eventTitle,
        meetingUrl: data.meetingUrl,
        joinUrl: data.joinUrl,
        alreadyCheckedIn: data.alreadyCheckedIn,
      });
      setCountdown(3);
      setStep("success");
    } catch (err) {
      console.error(err);
      setErrorMessage("Network connection error. Please retry verification.");
      setStep("error");
    }
  }, [stopCamera]);

  // Automatic token verification if supplied in query param (async inside effect callback)
  React.useEffect(() => {
    if (!initialToken || initialToken.length < 16) return;
    const controller = new AbortController();

    const run = async () => {
      try {
        const res = await fetch("/api/events/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: initialToken }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (controller.signal.aborted) return;

        if (!res.ok || !data.ok) {
          if (data.status === "early") {
            setEarlyData({
              opensAt: data.opensAt,
              startsAt: data.startsAt,
              eventTitle: data.eventTitle || "Coimbatore Startup Community (CSC) - Joint Online Meeting",
              message: data.error,
            });
            setStep("early");
            return;
          }
          setErrorMessage(data.error || "Verification failed.");
          setStep("error");
          return;
        }

        if (data.requiresOtp) {
          setOtpData({
            challengeId: data.challengeId,
            maskedEmail: data.maskedEmail,
            attendeeName: data.attendeeName,
            token: initialToken,
          });
          setStep("otp");
          return;
        }

        setSuccessData({
          attendeeName: data.attendeeName,
          reference: data.reference,
          eventTitle: data.eventTitle,
          meetingUrl: data.meetingUrl,
          joinUrl: data.joinUrl,
          alreadyCheckedIn: data.alreadyCheckedIn,
        });
        setCountdown(3);
        setStep("success");
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error(err);
          setErrorMessage("Network connection error.");
          setStep("error");
        }
      }
    };

    void run();
    return () => controller.abort();
  }, [initialToken]);

  // 2. Decode QR Code from an uploaded file locally in browser
  async function handleFileSelect(file: File) {
    if (!file) return;

    setStep("decoding");
    setErrorMessage("");

    try {
      const reader = new FileReader();

      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) {
          setErrorMessage("Could not read image file. Please try another image.");
          setStep("error");
          return;
        }

        try {
          const qrReader = new BrowserQRCodeReader();
          const result = await qrReader.decodeFromImageUrl(dataUrl);
          const rawText = result.getText();

          let token = rawText;
          try {
            const parsed = JSON.parse(rawText);
            if (parsed && typeof parsed === "object" && parsed.ref) {
              token = parsed.ref;
            }
          } catch {
            // Raw token format
          }

          if (!token || token.length < 16) {
            setErrorMessage("No valid event pass token found in the uploaded image.");
            setStep("error");
            return;
          }

          await verifyToken(token);
        } catch (decodeErr) {
          console.warn("QR_DECODE_FAILED", decodeErr);
          setErrorMessage(
            "Invalid QR Code. Please upload the original QR code provided in your CSC Circle registration confirmation email."
          );
          setStep("error");
        }
      };

      reader.onerror = () => {
        setErrorMessage("Failed to read the selected file.");
        setStep("error");
      };

      reader.readAsDataURL(file);
    } catch {
      setErrorMessage("An unexpected error occurred while processing the file.");
      setStep("error");
    }
  }

  // 3. Mobile Camera Scanner
  async function startCamera() {
    setCameraActive(true);
    setErrorMessage("");

    try {
      // Yield to let the video element unhide/mount in DOM
      await new Promise((resolve) => setTimeout(resolve, 100));
      const video = videoRef.current;
      if (!video) {
        throw new Error("Camera video element not available.");
      }

      // Check for getUserMedia support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported on this browser.");
      }

      // Explicitly set DOM properties required for mobile Safari & Chromium
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.setAttribute("muted", "true");
      video.setAttribute("autoplay", "true");

      // Request stream with resilient environment facing constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      video.srcObject = stream;
      await video.play().catch(() => {});

      // Wait until metadata is loaded and videoWidth > 0
      await new Promise<void>((resolve) => {
        if (video.readyState >= 2 && video.videoWidth > 0) {
          resolve();
        } else {
          video.onloadedmetadata = () => resolve();
          setTimeout(resolve, 400);
        }
      });

      // Resilient autofocus
      try {
        const track = stream.getVideoTracks()[0];
        await track?.applyConstraints({
          advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
        } as MediaTrackConstraints);
      } catch {
        // focusMode not supported
      }

      const qrReader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 80,
        delayBetweenScanSuccess: 400,
      });

      let scanned = false;
      const controls = await qrReader.decodeFromVideoElement(
        video,
        (result) => {
          if (result && !scanned) {
            const rawText = result.getText();
            let token = rawText;
            try {
              const parsed = JSON.parse(rawText);
              if (parsed?.ref) token = parsed.ref;
            } catch {
              // Raw token
            }
            if (token && token.length >= 16) {
              scanned = true;
              stopCamera();
              void verifyToken(token);
            }
          }
        }
      );

      controlsRef.current = {
        stop: () => {
          try {
            controls.stop();
          } catch {}
          stream.getTracks().forEach((track) => track.stop());
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
        },
      };
    } catch (camErr) {
      console.warn("CAMERA_ACCESS_DENIED", camErr);
      stopCamera();
      setErrorMessage("Camera access was denied, unavailable, or not supported. Please upload your QR code image.");
    }
  }

  // 4. Verify OTP (Option C)
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpData || otpInput.trim().length !== 6) return;

    setIsVerifyingOtp(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/events/check-in/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: otpData.challengeId,
          otp: otpInput.trim(),
          token: otpData.token,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMessage(data.error || "Incorrect verification code. Please try again.");
        setIsVerifyingOtp(false);
        return;
      }

      setSuccessData({
        attendeeName: data.attendeeName,
        reference: data.reference,
        eventTitle: data.eventTitle,
        meetingUrl: data.meetingUrl,
        joinUrl: data.joinUrl,
        alreadyCheckedIn: data.alreadyCheckedIn,
      });
      setCountdown(3);
      setStep("success");
    } catch {
      setErrorMessage("Network error while verifying OTP code.");
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  // Drag and Drop handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Event Header Identity Card */}
      <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/events/csc-joint-online-meeting-banner.webp"
            alt="CSC First Online Meeting Banner"
            className="size-full object-cover"
          />
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700">
            <ShieldCheck className="size-4" /> Official Event Check-in
          </div>
          <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
            Coimbatore Startup Community — First Online Meeting
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="size-3.5 text-teal-600" /> Sunday, Nov 22, 2026
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Video className="size-3.5 text-teal-600" /> Online — Google Meet
            </span>
          </div>
        </div>
      </div>

      {/* Main Check-in Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-md">
        {/* Step: Upload QR / Camera */}
        {step === "upload" && (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <UploadCloud className="size-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Upload Your Event QR Code</h2>
            <p className="mt-1 max-w-md text-xs text-slate-600">
              Upload the individual QR code received in your registration confirmation email. The system will automatically decode it, verify your registration, and connect you to Google Meet.
            </p>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) void handleFileSelect(e.target.files[0]);
              }}
            />

            {/* Drag & Drop Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="mt-6 flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-8 transition hover:border-teal-500 hover:bg-teal-50/40"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-white text-teal-600 shadow-xs">
                <UploadCloud className="size-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-800">
                Drag and drop your QR code here
              </p>
              <p className="mt-1 text-xs text-slate-500">
                or <span className="font-semibold text-teal-600 underline">browse files</span> from your device
              </p>
              <span className="mt-3 rounded-full bg-slate-200/60 px-2.5 py-0.5 text-[10px] font-medium text-slate-600">
                PNG, JPG, JPEG, WebP supported
              </span>
            </div>

            {/* Camera Scan Alternative */}
            <div className="mt-5 w-full">
              <div
                className={cn(
                  "relative mx-auto w-full max-w-sm aspect-square overflow-hidden rounded-2xl border-2 border-teal-500 bg-slate-950 shadow-lg",
                  !cameraActive && "hidden"
                )}
              >
                <video
                  ref={videoRef}
                  className="size-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                {/* Viewfinder Target & Scanner Frame */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative size-48 sm:size-56 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                    <span className="absolute -top-1 -left-1 size-4 border-t-4 border-l-4 border-teal-400 rounded-tl" />
                    <span className="absolute -top-1 -right-1 size-4 border-t-4 border-r-4 border-teal-400 rounded-tr" />
                    <span className="absolute -bottom-1 -left-1 size-4 border-b-4 border-l-4 border-teal-400 rounded-bl" />
                    <span className="absolute -bottom-1 -right-1 size-4 border-b-4 border-r-4 border-teal-400 rounded-br" />
                    <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent animate-pulse" />
                  </div>
                </div>
                <div className="absolute inset-x-0 top-3 flex justify-center pointer-events-none">
                  <span className="rounded-full bg-slate-950/80 px-3 py-1 text-[11px] font-semibold text-white shadow backdrop-blur-sm">
                    Align your CSC Event QR Code within the frame
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-3 flex justify-center">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={stopCamera}
                    className="gap-1.5 rounded-xl text-xs font-semibold shadow-md pointer-events-auto"
                  >
                    <CameraOff className="size-3.5" /> Stop Camera
                  </Button>
                </div>
              </div>

              {!cameraActive ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void startCamera()}
                  className="w-full gap-2 rounded-xl border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Camera className="size-4" /> Scan with Device Camera
                </Button>
              ) : null}
            </div>
          </div>
        )}

        {/* Step: Decoding / Verifying Progress */}
        {(step === "decoding" || step === "verifying") && (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 animate-pulse">
              <Loader2 className="size-8 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {step === "decoding" ? "Reading QR Code..." : "Verifying Registration & Payment..."}
            </h2>
            <p className="mt-2 max-w-sm text-xs text-slate-600">
              Please wait a moment while the server authenticates your individual pass and prepares your Google Meet session.
            </p>
          </div>
        )}

        {/* Step: Option C — Email OTP Challenge */}
        {step === "otp" && otpData && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col items-center text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
              <Mail className="size-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Enter Verification Code</h2>
            <p className="mt-1 max-w-md text-xs text-slate-600">
              Welcome, <span className="font-semibold text-slate-900">{otpData.attendeeName}</span>! To safeguard your pass from unauthorized sharing, a 6-digit verification code was sent to:
            </p>
            <div className="mt-2 rounded-xl bg-slate-100 px-3 py-1.5 font-mono text-xs font-bold text-slate-800">
              {otpData.maskedEmail}
            </div>

            <div className="mt-6 w-full max-w-xs">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="h-12 text-center font-mono text-2xl tracking-[0.3em] font-bold"
                autoFocus
                required
              />
            </div>

            {errorMessage && (
              <p className="mt-3 text-xs font-semibold text-red-600 flex items-center gap-1">
                <AlertCircle className="size-3.5 shrink-0" /> {errorMessage}
              </p>
            )}

            <div className="mt-5 flex w-full max-w-xs flex-col gap-2">
              <Button
                type="submit"
                disabled={otpInput.length !== 6 || isVerifyingOtp}
                className="h-11 w-full gap-2 rounded-xl bg-teal-600 font-bold text-white hover:bg-teal-700"
              >
                {isVerifyingOtp ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                Verify & Check In
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep("upload");
                  setOtpData(null);
                  setOtpInput("");
                }}
                className="text-xs text-slate-500 hover:text-slate-800 underline mt-1"
              >
                Upload a different pass
              </button>
            </div>
          </form>
        )}

        {/* Step: Success Screen & Google Meet Redirection */}
        {step === "success" && successData && (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm animate-bounce">
              <CheckCircle2 className="size-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Check-in Successful!</h2>
            <p className="mt-1 text-sm font-medium text-emerald-800">
              Welcome, {successData.attendeeName}! Your attendance has been recorded.
            </p>

            <div className="my-5 w-full rounded-2xl border border-teal-200 bg-teal-50/60 p-4 text-left text-xs">
              <div className="flex justify-between border-b border-teal-200/60 pb-2">
                <span className="text-slate-500">Attendee</span>
                <span className="font-bold text-slate-900">{successData.attendeeName}</span>
              </div>
              <div className="flex justify-between border-b border-teal-200/60 py-2">
                <span className="text-slate-500">Pass Reference</span>
                <span className="font-mono font-bold text-teal-800">{successData.reference}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Meeting Platform</span>
                <span className="font-semibold text-slate-800">Google Meet</span>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-teal-600 bg-white p-5 w-full text-center shadow-sm">
              <p className="text-sm font-bold text-teal-900 flex items-center justify-center gap-1.5">
                <Video className="size-4 text-teal-600" /> Connecting to Google Meet
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Redirecting to your conference room in <span className="font-mono font-bold text-teal-700">{countdown}</span> seconds...
              </p>
              <div className="mt-4 flex justify-center">
                <a
                  href={successData.meetingUrl}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-teal-700 transition"
                >
                  <Video className="size-4" /> Join Google Meet Now <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Step: Early Check-in Notice (Opens 3 Hours Before Meeting) */}
        {step === "early" && earlyData && (
          <div className="flex flex-col items-center py-5 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 shadow-sm">
              <Calendar className="size-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Check-In Opens 3 Hours Before Meeting
            </h2>
            <p className="mt-2 text-xs sm:text-sm font-medium text-slate-600 max-w-md leading-relaxed">
              Your registration and QR pass are <strong className="text-emerald-700">confirmed and valid</strong>. To ensure an orderly session, automated Google Meet check-in unlocks <strong>3 hours prior to the session start time</strong> on the event day.
            </p>

            <div className="my-5 w-full rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-left text-xs space-y-2">
              <div className="flex justify-between border-b border-amber-200/60 pb-2">
                <span className="text-slate-500">Event</span>
                <span className="font-bold text-slate-900 truncate max-w-[200px]">{earlyData.eventTitle}</span>
              </div>
              <div className="flex justify-between border-b border-amber-200/60 py-2">
                <span className="text-slate-500">Check-In Window</span>
                <span className="font-semibold text-amber-900">Opens 3 Hours Before Start Time</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Meeting Platform</span>
                <span className="font-semibold text-slate-800">Google Meet</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 text-left w-full space-y-1.5">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-teal-600" />
                <strong>What should you do now?</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                <li>Keep the <strong>QR pass image</strong> saved on your phone or laptop.</li>
                <li>You will receive an email and WhatsApp reminder right when check-in unlocks.</li>
                <li>Visit this link 3 hours before the meeting to upload or scan your QR code for instant entry.</li>
              </ul>
            </div>

            <div className="mt-5 flex gap-3">
              <Button
                type="button"
                onClick={() => {
                  setStep("upload");
                  setErrorMessage("");
                }}
                className="gap-2 rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <RefreshCw className="size-3.5" /> Return to Check-In Page
              </Button>
            </div>
          </div>
        )}

        {/* Step: Error Screen */}
        {step === "error" && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <AlertCircle className="size-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Verification Failed</h2>
            <p className="mt-2 max-w-md text-xs text-slate-600 leading-relaxed">
              {errorMessage || "We could not verify your pass. Please upload the original QR code image from your confirmation email."}
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                onClick={() => {
                  setStep("upload");
                  setErrorMessage("");
                }}
                className="gap-2 rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <RefreshCw className="size-3.5" /> Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
