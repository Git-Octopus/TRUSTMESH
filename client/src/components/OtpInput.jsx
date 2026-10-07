import React, { useRef, useEffect, useState } from 'react';

/**
 * OtpInput - 6-digit cryptographic verification code input
 * Supports auto-focus, backspace jumping, paste handling, and cooldown timer
 */
export default function OtpInput({
  value = '',
  onChange,
  onComplete,
  onResend,
  resendCooldown = 30,
  expirySeconds = 300,
  isVerifying = false,
  error = ''
}) {
  const inputsRef = useRef([]);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(expirySeconds);
  const [cooldown, setCooldown] = useState(resendCooldown);
  const [canResend, setCanResend] = useState(false);

  // Sync external string value if provided
  useEffect(() => {
    if (value && value.length <= 6) {
      const arr = value.split('').slice(0, 6);
      while (arr.length < 6) arr.push('');
      setDigits(arr);
    }
  }, [value]);

  // Expiry countdown timer (5 mins)
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  // Resend cooldown timer (30s)
  useEffect(() => {
    if (cooldown <= 0) {
      setCanResend(true);
      return;
    }
    setCanResend(false);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleChange = (index, val) => {
    // Only accept numeric characters
    const clean = val.replace(/[^0-9]/g, '');
    const char = clean.slice(-1);

    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    const fullCode = newDigits.join('');
    onChange?.(fullCode);

    // Auto-focus next box
    if (char && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    // Auto trigger onComplete if all 6 digits entered
    if (newDigits.every((d) => d !== '') && fullCode.length === 6) {
      onComplete?.(fullCode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;

    const arr = pasted.split('');
    while (arr.length < 6) arr.push('');
    setDigits(arr);

    const fullCode = arr.join('');
    onChange?.(fullCode);

    const focusIdx = Math.min(pasted.length, 5);
    inputsRef.current[focusIdx]?.focus();

    if (pasted.length === 6) {
      onComplete?.(pasted);
    }
  };

  const handleResendClick = () => {
    if (!canResend) return;
    setCooldown(resendCooldown);
    setCanResend(false);
    setTimeLeft(expirySeconds);
    setDigits(['', '', '', '', '', '']);
    onChange?.('');
    inputsRef.current[0]?.focus();
    onResend?.();
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex gap-2 sm:gap-3 justify-center mb-4" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputsRef.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={isVerifying || timeLeft === 0}
            className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-mono font-bold rounded-lg border bg-slate-900 text-white transition-all focus:outline-none focus:ring-2 focus:ring-tm-blue ${
              digit
                ? 'border-tm-blue/70 shadow-lg shadow-blue-500/10'
                : 'border-slate-700 hover:border-slate-600'
            } ${error ? 'border-rose-500/80 ring-1 ring-rose-500' : ''}`}
          />
        ))}
      </div>

      {/* Timer and Expiration Info */}
      <div className="flex items-center justify-between w-full max-w-xs text-xs text-slate-400 mb-4 px-1">
        <span>
          {timeLeft > 0 ? (
            <>Expires in <span className="font-mono text-amber-400 font-semibold">{formatTimer(timeLeft)}</span></>
          ) : (
            <span className="text-rose-400 font-semibold">Code expired</span>
          )}
        </span>
        <button
          type="button"
          onClick={handleResendClick}
          disabled={!canResend || isVerifying}
          className={`font-medium transition-colors ${
            canResend && !isVerifying
              ? 'text-tm-teal hover:underline cursor-pointer'
              : 'text-slate-600 cursor-not-allowed'
          }`}
        >
          {canResend ? 'Resend Code' : `Resend in ${cooldown}s`}
        </button>
      </div>

      {error && <p className="text-rose-400 text-xs mb-2 text-center">{error}</p>}
    </div>
  );
}
