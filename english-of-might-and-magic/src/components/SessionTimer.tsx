import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export interface DecodedToken {
  exp?: number;
  remainingTokens?: number;
  isUnlimited?: boolean;
}

export function decodeJWT(token: string): DecodedToken | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch (e) {
    return null;
  }
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

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
    <div className={`flex items-center gap-2 bg-black/80 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 shadow-lg ${className}`}>
      {showLabel && <span className="text-xs font-bold text-amber-100 whitespace-nowrap">Trial Session Timer:</span>}
      <span className="text-sm font-bold text-amber-100 whitespace-nowrap">{timeRemaining}</span>
    </div>
  );
}
