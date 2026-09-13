import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { safeParseJson } from "../utils/apiUtils";
import {
  Mail,
  Phone,
  User,
  Calendar,
  Lock,
  Building2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Database,
  RefreshCw,
  Sparkles,
  Info,
  X,
  KeyRound,
} from "lucide-react";

interface AuthPageProps {
  onSuccess: (user: UserProfile) => void;
  onContinueAsGuest?: () => void;
  initialMode?: "signin" | "signup";
  onClose?: () => void;
}

const COUNTRY_CODES = [
  { code: "+1", country: "US/CA", flag: "🇺🇸" },
  { code: "+91", country: "IN", flag: "🇮🇳" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+61", country: "AU", flag: "🇦🇺" },
  { code: "+49", country: "DE", flag: "🇩🇪" },
  { code: "+33", country: "FR", flag: "🇫🇷" },
  { code: "+81", country: "JP", flag: "🇯🇵" },
  { code: "+65", country: "SG", flag: "🇸🇬" },
  { code: "+971", country: "AE", flag: "🇦🇪" },
  { code: "+55", country: "BR", flag: "🇧🇷" },
];

export const AuthPage: React.FC<AuthPageProps> = ({
  onSuccess,
  initialMode = "signup",
  onClose,
}) => {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);

  // Sign Up fields
  const [name, setName] = useState<string>("");
  const [dob, setDob] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [countryCode, setCountryCode] = useState<string>("+91");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [organization, setOrganization] = useState<string>("");

  // Gmail OTP verification state
  const [emailOtpSent, setEmailOtpSent] = useState<boolean>(false);
  const [emailOtpCode, setEmailOtpCode] = useState<string>("");
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [sendingEmailOtp, setSendingEmailOtp] = useState<boolean>(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState<boolean>(false);
  const [lastEmailDevOtp, setLastEmailDevOtp] = useState<string | null>(null);

  // Phone OTP verification state
  const [phoneOtpSent, setPhoneOtpSent] = useState<boolean>(false);
  const [phoneOtpCode, setPhoneOtpCode] = useState<string>("");
  const [phoneVerified, setPhoneVerified] = useState<boolean>(false);
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState<boolean>(false);
  const [verifyingPhoneOtp, setVerifyingPhoneOtp] = useState<boolean>(false);
  const [lastPhoneDevOtp, setLastPhoneDevOtp] = useState<string | null>(null);

  // Sign In fields
  const [loginIdentifier, setLoginIdentifier] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [loginWithOtp, setLoginWithOtp] = useState<boolean>(false);
  const [loginOtpSent, setLoginOtpSent] = useState<boolean>(false);
  const [loginOtpCode, setLoginOtpCode] = useState<string>("");
  const [loginDevOtp, setLoginDevOtp] = useState<string | null>(null);

  // Feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [accountNotFoundError, setAccountNotFoundError] = useState<boolean>(false);

  // Resend timers
  const [emailTimer, setEmailTimer] = useState<number>(0);
  const [phoneTimer, setPhoneTimer] = useState<number>(0);

  useEffect(() => {
    let interval: any;
    if (emailTimer > 0) {
      interval = setInterval(() => setEmailTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [emailTimer]);

  useEffect(() => {
    let interval: any;
    if (phoneTimer > 0) {
      interval = setInterval(() => setPhoneTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [phoneTimer]);

  const fullPhone = `${countryCode} ${phoneNumber.trim()}`;

  // 1. Send OTP to Gmail
  const handleSendEmailOtp = async () => {
    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid Gmail address first.");
      return;
    }
    setErrorMessage(null);
    setSendingEmailOtp(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: email.trim(), type: "email" }),
      });
      const parsed = await safeParseJson(res);
      if (!parsed.ok) {
        throw new Error(parsed.data?.error || parsed.error || "Failed to send Gmail OTP");
      }
      setEmailOtpSent(true);
      setEmailTimer(30);
      setLastEmailDevOtp(parsed.data.otpCode || null);
      setSuccessMessage(`OTP sent to ${email}. Check your inbox (or use the preview code below).`);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSendingEmailOtp(false);
    }
  };

  // 2. Verify Gmail OTP
  const handleVerifyEmailOtp = async () => {
    if (!emailOtpCode || emailOtpCode.trim().length !== 6) {
      setErrorMessage("Please enter the 6-digit verification code sent to your Gmail.");
      return;
    }
    setErrorMessage(null);
    setVerifyingEmailOtp(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: email.trim(),
          type: "email",
          code: emailOtpCode.trim(),
        }),
      });
      const parsed = await safeParseJson(res);
      if (!parsed.ok || !parsed.data?.verified) {
        throw new Error(parsed.data?.error || parsed.error || "Invalid OTP code");
      }
      setEmailVerified(true);
      setSuccessMessage("Gmail address verified successfully!");
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  // 3. Send OTP to Phone
  const handleSendPhoneOtp = async () => {
    if (!phoneNumber || phoneNumber.trim().length < 6) {
      setErrorMessage("Please enter a valid phone number first.");
      return;
    }
    setErrorMessage(null);
    setSendingPhoneOtp(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: fullPhone, type: "phone" }),
      });
      const parsed = await safeParseJson(res);
      if (!parsed.ok) {
        throw new Error(parsed.data?.error || parsed.error || "Failed to send Phone OTP");
      }
      setPhoneOtpSent(true);
      setPhoneTimer(30);
      setLastPhoneDevOtp(parsed.data.otpCode || null);
      setSuccessMessage(`OTP sent to ${fullPhone}. Use the code below to verify.`);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSendingPhoneOtp(false);
    }
  };

  // 4. Verify Phone OTP
  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtpCode || phoneOtpCode.trim().length !== 6) {
      setErrorMessage("Please enter the 6-digit verification code sent to your phone.");
      return;
    }
    setErrorMessage(null);
    setVerifyingPhoneOtp(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: fullPhone,
          type: "phone",
          code: phoneOtpCode.trim(),
        }),
      });
      const parsed = await safeParseJson(res);
      if (!parsed.ok || !parsed.data?.verified) {
        throw new Error(parsed.data?.error || parsed.error || "Invalid OTP code");
      }
      setPhoneVerified(true);
      setSuccessMessage("Phone number verified successfully!");
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setVerifyingPhoneOtp(false);
    }
  };

  // 5. Submit Sign Up (Store in SQL Database)
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation checks
    if (!name.trim()) {
      setErrorMessage("Full Name is required.");
      return;
    }
    if (!dob.trim()) {
      setErrorMessage("Date of Birth (DOB) is required.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("A valid Gmail or email address is required.");
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorMessage("Phone number is required.");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }
    if (!emailVerified) {
      setErrorMessage("Please send and verify the OTP for your Gmail address before creating your account.");
      return;
    }
    if (!phoneVerified) {
      setErrorMessage("Please send and verify the OTP for your phone number before creating your account.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          dob: dob.trim(),
          email: email.trim(),
          phone: fullPhone,
          password,
          organization: organization.trim() || undefined,
          emailOtp: emailOtpCode.trim(),
          phoneOtp: phoneOtpCode.trim(),
        }),
      });

      const parsed = await safeParseJson(res);
      if (!parsed.ok) {
        throw new Error(parsed.data?.error || parsed.error || "Failed to create account.");
      }

      setSuccessMessage("Account created and securely stored in MySQL/Cloud SQL database!");
      setTimeout(() => {
        onSuccess(parsed.data.user);
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Sign In (Strictly only registered users)
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setAccountNotFoundError(false);

    if (!loginIdentifier.trim()) {
      setErrorMessage("Please enter your registered Gmail or Phone number.");
      return;
    }

    if (!loginWithOtp && !loginPassword) {
      setErrorMessage("Please enter your account password.");
      return;
    }

    if (loginWithOtp && (!loginOtpCode || loginOtpCode.trim().length !== 6)) {
      setErrorMessage("Please enter the 6-digit OTP sent to your account.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          password: loginWithOtp ? undefined : loginPassword,
          otp: loginWithOtp ? loginOtpCode.trim() : undefined,
          method: loginIdentifier.includes("@") ? "email" : "phone",
        }),
      });

      const parsed = await safeParseJson(res);
      if (!parsed.ok) {
        if (parsed.data?.accountNotFound || res.status === 403) {
          setAccountNotFoundError(true);
        }
        throw new Error(parsed.data?.error || parsed.error || "Login failed.");
      }

      setSuccessMessage("Authentication verified. Loading workspace...");
      setTimeout(() => {
        onSuccess(parsed.data.user);
      }, 600);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 7. Send Login OTP
  const handleSendLoginOtp = async () => {
    if (!loginIdentifier.trim()) {
      setErrorMessage("Please enter your registered Gmail or Phone number first.");
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const isEmail = loginIdentifier.includes("@");
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: loginIdentifier.trim(),
          type: isEmail ? "email" : "phone",
        }),
      });
      const parsed = await safeParseJson(res);
      if (!parsed.ok) {
        throw new Error(parsed.data?.error || parsed.error || "Failed to send OTP.");
      }
      setLoginOtpSent(true);
      setLoginDevOtp(parsed.data?.otpCode || null);
      setSuccessMessage(`Verification code sent to ${loginIdentifier}.`);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] flex items-center justify-center py-4 sm:py-10 px-2 sm:px-4 md:px-6">
      <div className="w-full max-w-xl relative my-auto">
        {/* Main Card */}
        <div className="rounded-2xl border border-[#ded5c5] bg-[#fdfbf7] p-4 sm:p-7 md:p-9 shadow-sm space-y-5 sm:space-y-6 relative max-h-[96dvh] overflow-y-auto">
          {onClose && (
            <button
              onClick={onClose}
              title="Close and return"
              className="absolute right-5 top-5 p-1.5 rounded-lg text-[#8c8273] hover:text-[#1c1917] hover:bg-[#f7f3eb] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Header Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-[#24211e] text-[#f7f4ef] shadow-xs mb-1">
              <Database className="h-6 w-6 text-[#ded5c5]" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#1c1917] tracking-tight">
              GenAI Data Analyst Workspace
            </h1>
            <p className="text-sm text-[#736b5e] max-w-md mx-auto">
              Secure Cloud SQL relational storage with dual OTP verification. Only registered accounts can access the platform.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-[#ede6d8] rounded-xl text-sm font-medium">
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setErrorMessage(null);
                setAccountNotFoundError(false);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === "signup"
                  ? "bg-[#fdfbf7] text-[#1c1917] shadow-xs font-semibold"
                  : "text-[#736b5e] hover:text-[#1c1917]"
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setErrorMessage(null);
                setAccountNotFoundError(false);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === "signin"
                  ? "bg-[#fdfbf7] text-[#1c1917] shadow-xs font-semibold"
                  : "text-[#736b5e] hover:text-[#1c1917]"
              }`}
            >
              Sign In
            </button>
          </div>

          {/* Notification / Error Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#fdf2f2] border border-[#f5c6cb] text-[#b91c1c] text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">{errorMessage}</p>
                {accountNotFoundError && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setErrorMessage(null);
                      setAccountNotFoundError(false);
                      if (loginIdentifier.includes("@")) {
                        setEmail(loginIdentifier);
                      } else {
                        setPhoneNumber(loginIdentifier);
                      }
                    }}
                    className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#b91c1c] text-white text-[11px] font-semibold hover:bg-[#991b1b] transition-colors"
                  >
                    Create Account Now <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] text-xs flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#059669]" />
              <p className="font-medium">{successMessage}</p>
            </div>
          )}

          {/* ============================================================== */}
          {/* CREATE ACCOUNT FORM (NAME, DOB, GMAIL + OTP, PHONE + OTP, PWD) */}
          {/* ============================================================== */}
          {mode === "signup" && (
            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              <div className="border-b border-[#ebd7c1] pb-2">
                <div className="flex items-center justify-between text-xs font-medium text-[#736b5e]">
                  <span>Account Registration</span>
                  <span className="flex items-center gap-1 text-[#24211e] font-semibold">
                    <Database className="h-3 w-3 text-[#10b981]" /> Cloud SQL Active
                  </span>
                </div>
              </div>

              {/* 1. Full Name & DOB in 2-column layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#44403c]">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-[#8c8273]" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dhanush V R"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#ded5c5] bg-[#f7f4ef] text-sm text-[#1c1917] focus:outline-none focus:ring-1 focus:ring-[#24211e]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#44403c]">
                    Date of Birth (DOB) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-[#8c8273]" />
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#ded5c5] bg-[#f7f4ef] text-sm text-[#1c1917] focus:outline-none focus:ring-1 focus:ring-[#24211e]"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Gmail Address + OTP Verification */}
              <div className="rounded-xl border border-[#e5dcce] bg-[#f8f5ee] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#44403c] flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-[#8c8273]" />
                    Gmail / Email Address <span className="text-red-500">*</span>
                  </label>
                  {emailVerified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#059669] bg-[#ecfdf5] border border-[#a7f3d0] px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> Gmail Verified
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#8c8273]">Verification required</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    disabled={emailVerified}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailVerified(false);
                      setEmailOtpSent(false);
                    }}
                    placeholder="vrdhanush2005gj@gmail.com"
                    className="flex-1 px-3 py-2 rounded-lg border border-[#ded5c5] bg-white text-sm text-[#1c1917] focus:outline-none focus:ring-1 focus:ring-[#24211e] disabled:bg-[#f1eee7]"
                  />
                  {!emailVerified && (
                    <button
                      type="button"
                      disabled={sendingEmailOtp || emailTimer > 0}
                      onClick={handleSendEmailOtp}
                      className="px-3 py-2 rounded-lg bg-[#24211e] text-[#f7f4ef] text-xs font-medium hover:bg-[#38332e] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      {sendingEmailOtp
                        ? "Sending..."
                        : emailTimer > 0
                        ? `Resend (${emailTimer}s)`
                        : emailOtpSent
                        ? "Resend OTP"
                        : "Send OTP"}
                    </button>
                  )}
                </div>

                {/* Gmail OTP verification input */}
                {emailOtpSent && !emailVerified && (
                  <div className="pt-1.5 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={emailOtpCode}
                        onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="Enter 6-digit Gmail OTP"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-[#ded5c5] bg-white text-sm text-[#1c1917] tracking-wider font-mono text-center focus:outline-none focus:ring-1 focus:ring-[#24211e]"
                      />
                      <button
                        type="button"
                        disabled={verifyingEmailOtp || emailOtpCode.length !== 6}
                        onClick={handleVerifyEmailOtp}
                        className="px-3 py-1.5 rounded-lg bg-[#059669] text-white text-xs font-semibold hover:bg-[#047857] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                      >
                        {verifyingEmailOtp ? "Checking..." : "Verify Gmail"}
                      </button>
                    </div>

                    {lastEmailDevOtp && (
                      <div className="p-2 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] text-[11px] text-[#166534] flex items-center justify-between">
                        <span>OTP sent for testing: <strong className="font-mono text-xs">{lastEmailDevOtp}</strong></span>
                        <button
                          type="button"
                          onClick={() => setEmailOtpCode(lastEmailDevOtp)}
                          className="text-[10px] underline font-semibold text-[#15803d] hover:text-[#14532d]"
                        >
                          Auto-fill
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Phone Number + OTP Verification */}
              <div className="rounded-xl border border-[#e5dcce] bg-[#f8f5ee] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#44403c] flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-[#8c8273]" />
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  {phoneVerified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#059669] bg-[#ecfdf5] border border-[#a7f3d0] px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> Phone Verified
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#8c8273]">Verification required</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    disabled={phoneVerified}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-24 px-2 py-2 rounded-lg border border-[#ded5c5] bg-white text-xs text-[#1c1917] focus:outline-none focus:ring-1 focus:ring-[#24211e]"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code + c.country} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    required
                    disabled={phoneVerified}
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value.replace(/[^\d\s-]/g, ""));
                      setPhoneVerified(false);
                      setPhoneOtpSent(false);
                    }}
                    placeholder="9876543210"
                    className="flex-1 px-3 py-2 rounded-lg border border-[#ded5c5] bg-white text-sm text-[#1c1917] focus:outline-none focus:ring-1 focus:ring-[#24211e] disabled:bg-[#f1eee7]"
                  />
                  {!phoneVerified && (
                    <button
                      type="button"
                      disabled={sendingPhoneOtp || phoneTimer > 0}
                      onClick={handleSendPhoneOtp}
                      className="px-3 py-2 rounded-lg bg-[#24211e] text-[#f7f4ef] text-xs font-medium hover:bg-[#38332e] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      {sendingPhoneOtp
                        ? "Sending..."
                        : phoneTimer > 0
                        ? `Resend (${phoneTimer}s)`
                        : phoneOtpSent
                        ? "Resend OTP"
                        : "Send OTP"}
                    </button>
                  )}
                </div>

                {/* Phone OTP verification input */}
                {phoneOtpSent && !phoneVerified && (
                  <div className="pt-1.5 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={phoneOtpCode}
                        onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="Enter 6-digit Phone OTP"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-[#ded5c5] bg-white text-sm text-[#1c1917] tracking-wider font-mono text-center focus:outline-none focus:ring-1 focus:ring-[#24211e]"
                      />
                      <button
                        type="button"
                        disabled={verifyingPhoneOtp || phoneOtpCode.length !== 6}
                        onClick={handleVerifyPhoneOtp}
                        className="px-3 py-1.5 rounded-lg bg-[#059669] text-white text-xs font-semibold hover:bg-[#047857] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                      >
                        {verifyingPhoneOtp ? "Checking..." : "Verify Phone"}
                      </button>
                    </div>

                    {lastPhoneDevOtp && (
                      <div className="p-2 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] text-[11px] text-[#166534] flex items-center justify-between">
                        <span>OTP sent for testing: <strong className="font-mono text-xs">{lastPhoneDevOtp}</strong></span>
                        <button
                          type="button"
                          onClick={() => setPhoneOtpCode(lastPhoneDevOtp)}
                          className="text-[10px] underline font-semibold text-[#15803d] hover:text-[#14532d]"
                        >
                          Auto-fill
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Password & Organization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#44403c]">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#8c8273]" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#ded5c5] bg-[#f7f4ef] text-sm text-[#1c1917] focus:outline-none focus:ring-1 focus:ring-[#24211e]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#44403c]">
                    Organization / Company <span className="text-xs text-[#8c8273] font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-[#8c8273]" />
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="e.g. Analytics Lab"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#ded5c5] bg-[#f7f4ef] text-sm text-[#1c1917] focus:outline-none focus:ring-1 focus:ring-[#24211e]"
                    />
                  </div>
                </div>
              </div>

              {/* Verification Checklist */}
              <div className="p-3 rounded-xl bg-[#f1ece2] text-xs text-[#57534e] space-y-1.5">
                <p className="font-semibold text-[#292524]">Account Verification Requirements:</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <span className={`flex items-center gap-1.5 ${emailVerified ? "text-[#059669] font-medium" : "text-[#78716c]"}`}>
                    <CheckCircle2 className={`h-3.5 w-3.5 ${emailVerified ? "text-[#059669]" : "text-[#a8a29e]"}`} />
                    Gmail OTP Verified
                  </span>
                  <span className={`flex items-center gap-1.5 ${phoneVerified ? "text-[#059669] font-medium" : "text-[#78716c]"}`}>
                    <CheckCircle2 className={`h-3.5 w-3.5 ${phoneVerified ? "text-[#059669]" : "text-[#a8a29e]"}`} />
                    Phone OTP Verified
                  </span>
                </div>
              </div>

              {/* Submit Registration Button */}
              <button
                type="submit"
                disabled={submitting || !emailVerified || !phoneVerified}
                className="w-full py-3 rounded-xl bg-[#24211e] text-[#f7f4ef] text-sm font-semibold hover:bg-[#38332e] transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Storing in Cloud SQL Database...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Create Account & Save to Database
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <p className="text-xs text-[#736b5e]">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setErrorMessage(null);
                      setAccountNotFoundError(false);
                    }}
                    className="font-semibold text-[#1c1917] hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* SIGN IN FORM (STRICTLY ONLY REGISTERED ACCOUNTS CAN LOGIN)     */}
          {/* ============================================================== */}
          {mode === "signin" && (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-[#f5efe4] border border-[#e4d9c7] text-xs text-[#57534e] flex items-start gap-2">
                <Info className="h-4 w-4 text-[#8c8273] shrink-0 mt-0.5" />
                <p>
                  <strong>Access Policy:</strong> Only registered users with accounts stored in the database can log in. If you have not created an account, please switch to <em>Create Account</em>.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#44403c]">
                  Registered Gmail or Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-[#8c8273]" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. vrdhanush2005gj@gmail.com or +91 9876543210"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#ded5c5] bg-[#f7f4ef] text-sm text-[#1c1917] focus:outline-none focus:ring-1 focus:ring-[#24211e]"
                  />
                </div>
              </div>

              {!loginWithOtp ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[#44403c]">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setLoginWithOtp(true)}
                      className="text-xs text-[#736b5e] hover:text-[#1c1917] font-medium"
                    >
                      Sign in with OTP instead
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#8c8273]" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your account password"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#ded5c5] bg-[#f7f4ef] text-sm text-[#1c1917] focus:outline-none focus:ring-1 focus:ring-[#24211e]"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 rounded-xl border border-[#e5dcce] bg-[#f8f5ee] p-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#44403c] flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-[#8c8273]" />
                      Login OTP Code
                    </label>
                    <button
                      type="button"
                      onClick={() => setLoginWithOtp(false)}
                      className="text-xs text-[#736b5e] hover:text-[#1c1917] font-medium"
                    >
                      Sign in with Password instead
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={loginOtpCode}
                      onChange={(e) => setLoginOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="6-digit OTP"
                      className="flex-1 px-3 py-2 rounded-lg border border-[#ded5c5] bg-white text-sm text-[#1c1917] tracking-wider font-mono text-center focus:outline-none focus:ring-1 focus:ring-[#24211e]"
                    />
                    <button
                      type="button"
                      onClick={handleSendLoginOtp}
                      disabled={submitting}
                      className="px-3 py-2 rounded-lg bg-[#24211e] text-[#f7f4ef] text-xs font-medium hover:bg-[#38332e] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      {loginOtpSent ? "Resend OTP" : "Send OTP"}
                    </button>
                  </div>

                  {loginDevOtp && (
                    <div className="p-2 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] text-[11px] text-[#166534] flex items-center justify-between">
                      <span>Testing OTP: <strong className="font-mono text-xs">{loginDevOtp}</strong></span>
                      <button
                        type="button"
                        onClick={() => setLoginOtpCode(loginDevOtp)}
                        className="text-[10px] underline font-semibold text-[#15803d]"
                      >
                        Auto-fill
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Sign In */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#24211e] text-[#f7f4ef] text-sm font-semibold hover:bg-[#38332e] transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Verifying Credentials in Database...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    Sign In to Workspace
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-[#736b5e]">
                  Don't have an account yet?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setErrorMessage(null);
                      setAccountNotFoundError(false);
                    }}
                    className="font-semibold text-[#1c1917] hover:underline"
                  >
                    Create an account here
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Database & Security Assurance Footer */}
          <div className="pt-3 border-t border-[#ebd7c1] flex items-center justify-between text-[11px] text-[#8c8273]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#059669]" /> Cloud SQL Relational Storage
            </span>
            <span>OTP Verification Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
};
