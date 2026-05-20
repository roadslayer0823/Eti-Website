import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { decodeJWT, formatTimeRemaining, DecodedToken } from '../utils/sessionTimer';

interface SessionTimerProps {
  token: string | null;
  className?: string;
  showLabel?: boolean;
}

export default function SessionTimer({ token, className = '', showLabel = true }: SessionTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('--:--');
  const [remainingTokens, setRemainingTokens] = useState<number | undefined>(undefined);
  const [isUnlimited, setIsUnlimited] = useState(false);

  useEffect(() => {
    if (!token) {
      setTimeRemaining('--:--');
      setRemainingTokens(undefined);
      setIsUnlimited(false);
      return;
    }

    const decoded = decodeJWT(token);
    if (!decoded) return;

    setRemainingTokens(decoded.remainingTokens);
    setIsUnlimited(decoded.isUnlimited || false);

    if (decoded.isUnlimited || !decoded.exp) {
      setTimeRemaining('Unlimited');
      return;
    }

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = decoded.exp! - now;
      
      if (diff <= 0) {
        setTimeRemaining('00:00');
        // Auto-logout when timer expires
        localStorage.removeItem('eti_jwt_token');
        window.location.href = 'https://portal.eti.com.hk/landing/';
        return;
      }

      setTimeRemaining(formatTimeRemaining(diff));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [token]);

  if (!token) return null;

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-1.5 sm:px-3 py-1 sm:py-1.5 shadow-sm ${className}`}>
      <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-[var(--text-muted)] whitespace-nowrap">Trial Session Timer:</span>
      <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-[var(--text-main)] whitespace-nowrap">{timeRemaining}</span>
    </div>
  );
}
