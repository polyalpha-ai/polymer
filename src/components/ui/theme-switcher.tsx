'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const themes = [
  {
    key: 'system',
    icon: Monitor,
    label: 'System theme',
  },
  {
    key: 'light',
    icon: Sun,
    label: 'Light theme',
  },
  {
    key: 'dark',
    icon: Moon,
    label: 'Dark theme',
  },
];

export type ThemeSwitcherProps = {
  value?: 'light' | 'dark' | 'system';
  onChange?: (theme: 'light' | 'dark' | 'system') => void;
  defaultValue?: 'light' | 'dark' | 'system';
  className?: string;
  requiresSubscription?: boolean;
  hasSubscription?: boolean;
  onUpgradeClick?: () => void;
  userId?: string;
  sessionId?: string;
  tier?: string;
};

export const ThemeSwitcher = ({
  value,
  onChange,
  defaultValue = 'light',
  className,
  requiresSubscription = false,
  hasSubscription = false,
  onUpgradeClick,
  userId,
  sessionId,
  tier,
}: ThemeSwitcherProps) => {
  // Simple controllable state implementation
  const [internalTheme, setInternalTheme] = useState<'light' | 'dark' | 'system'>(defaultValue);
  const isControlled = value !== undefined;
  const theme = isControlled ? value : internalTheme;
  
  const setTheme = useCallback((newTheme: 'light' | 'dark' | 'system') => {
    if (!isControlled) {
      setInternalTheme(newTheme);
    }
    onChange?.(newTheme);
  }, [isControlled, onChange]);

  const [mounted, setMounted] = useState(false);

  const handleThemeClick = useCallback(
    async (themeKey: 'light' | 'dark' | 'system') => {
      // Check if dark mode or system theme requires subscription
      if (requiresSubscription && (themeKey === 'dark' || themeKey === 'system') && !hasSubscription) {
        onUpgradeClick?.();
        return;
      }

      const previousTheme = theme || defaultValue;
      
      // Track usage via server action - only for theme changes (not initial load)
      if (previousTheme !== themeKey && mounted) {
        try {
          console.log('[ThemeSwitcher] Tracking theme change:', { 
            from: previousTheme, 
            to: themeKey, 
            tier,
            userId: userId ? 'present' : 'missing'
          });
          
          const response = await fetch('/api/usage/dark-mode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fromTheme: previousTheme,
              toTheme: themeKey,
              sessionId: sessionId || `session_${Date.now()}`
            })
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('[ThemeSwitcher] Usage tracking failed:', error);
          } else {
            const result = await response.json();
            console.log('[ThemeSwitcher] Usage tracked successfully:', result);
          }
        } catch (error) {
          console.error('[ThemeSwitcher] Error tracking dark mode switch:', error);
        }
      }

      // Apply the theme change
      setTheme(themeKey);
      
      // Apply to document root for CSS
      if (typeof window !== 'undefined') {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        
        if (themeKey === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          root.classList.add(systemTheme);
        } else {
          root.classList.add(themeKey);
        }
      }
    },
    [setTheme, requiresSubscription, hasSubscription, onUpgradeClick, theme, defaultValue, sessionId, tier, userId, mounted]
  );

  // Prevent hydration mismatch and initialize theme
  useEffect(() => {
    setMounted(true);
    
    // Initialize theme on mount
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      const currentTheme = theme || defaultValue;
      
      root.classList.remove('light', 'dark');
      
      if (currentTheme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(currentTheme);
      }
    }
  }, [theme, defaultValue]);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative isolate flex h-8 rounded-full bg-background p-1 ring-1 ring-border',
        className
      )}
    >
      {themes.map(({ key, icon: Icon, label }) => {
        const isActive = theme === key;
        const isRestrictedTheme = key === 'dark' || key === 'system';
        const isDisabled = requiresSubscription && isRestrictedTheme && !hasSubscription;

        return (
          <button
            aria-label={label}
            className={cn(
              'relative h-6 w-6 rounded-full transition-opacity',
              isDisabled ? 'cursor-not-allowed opacity-50 hover:opacity-60' : 'hover:bg-muted/50'
            )}
            key={key}
            onClick={() => handleThemeClick(key as 'light' | 'dark' | 'system')}
            type="button"
            disabled={isDisabled}
          >
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-full bg-secondary"
                layoutId="activeTheme"
                transition={{ type: 'spring', duration: 0.5 }}
              />
            )}
            <Icon
              className={cn(
                'relative z-10 m-auto h-4 w-4',
                isActive ? 'text-foreground' : 'text-muted-foreground',
                isDisabled && 'opacity-50'
              )}
            />
          </button>
        );
      })}
    </div>
  );
};