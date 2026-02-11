'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/shared/utils/cn';
import { Loader2 } from 'lucide-react';

interface TransitionProps {
  show: boolean;
  onComplete?: () => void;
  message?: 'switch' | 'create';
}

export function Transition({ show, onComplete, message = 'switch' }: TransitionProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  const getMessage = () => {
    switch (message) {
      case 'create':
        return {
          title: 'Deploying new agent...',
          subtitle: 'Setting up configuration and preferences',
        };
      default:
        return {
          title: 'Switching agent profiles...',
          subtitle: 'Loading agent configuration and preferences',
        };
    }
  };

  if (!show) return null;

  const messageContent = getMessage();

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 flex flex-col items-center justify-center',
          'bg-background/95 backdrop-blur-md'
        )}
        style={{
          animation: 'fadeIn 400ms ease-out',
        }}
        role="status"
        aria-live="polite"
        aria-label={messageContent.title}
      >
        <div className="text-center space-y-6 -mt-8">
          <div className="flex justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <div className="text-xl font-medium">{messageContent.title}</div>
            <div className="text-sm text-muted-foreground">{messageContent.subtitle}</div>
          </div>
        </div>
      </div>
    </>
  );
}

