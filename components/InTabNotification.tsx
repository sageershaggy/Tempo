import React, { useEffect, useState } from 'react';

export interface NotificationData {
  id: string;
  type: 'timer' | 'task' | 'reminder';
  title: string;
  message: string;
  icon?: string;
  actions?: {
    label: string;
    onClick: () => void;
    primary?: boolean;
  }[];
}

interface InTabNotificationProps {
  notification: NotificationData | null;
  onDismiss: () => void;
  playSound?: boolean;
}

// Sound generator for notifications
const playNotificationSound = (type: 'timer' | 'task' | 'reminder') => {
  try {
    const ctx = new AudioContext();

    const playTone = (freq: number, startTime: number, duration: number, volume: number = 0.4) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;

    if (type === 'timer') {
      // Celebratory ascending tones for timer completion
      playTone(523.25, now, 0.2);        // C5
      playTone(659.25, now + 0.15, 0.2); // E5
      playTone(783.99, now + 0.3, 0.4);  // G5
    } else if (type === 'task' || type === 'reminder') {
      // Alert double beep for task reminders
      playTone(880, now, 0.15, 0.3);       // A5
      playTone(880, now + 0.2, 0.15, 0.3); // A5 again
    }
  } catch (e) {
    console.warn('[Tempo] Could not play notification sound:', e);
  }
};

export const InTabNotification: React.FC<InTabNotificationProps> = ({
  notification,
  onDismiss,
  playSound = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (notification) {
      // Play sound when notification appears
      if (playSound) {
        playNotificationSound(notification.type);
      }
      // Trigger enter animation
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [notification, playSound]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setIsVisible(false);
    setTimeout(() => {
      setIsLeaving(false);
      onDismiss();
    }, 300);
  };

  if (!notification && !isLeaving) return null;

  const getIconForType = (type: string) => {
    switch (type) {
      case 'timer': return 'celebration';
      case 'task': return 'task_alt';
      case 'reminder': return 'notifications_active';
      default: return 'info';
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'timer': return 'from-primary to-secondary';
      case 'task': return 'from-green-500 to-emerald-500';
      case 'reminder': return 'from-orange-500 to-amber-500';
      default: return 'from-blue-500 to-cyan-500';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-4 pointer-events-none">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleDismiss}
      />

      {/* Notification Card */}
      <div
        className={`relative w-[calc(100%-2rem)] max-w-sm pointer-events-auto transition-all duration-300 transform ${
          isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-8 opacity-0 scale-95'
        }`}
      >
        {/* Glow effect */}
        <div className={`absolute -inset-1 bg-gradient-to-r ${getColorForType(notification?.type || 'timer')} rounded-2xl blur-lg opacity-30 animate-pulse`} />

        {/* Card */}
        <div className="relative bg-surface-dark border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          {/* Top gradient bar */}
          <div className={`h-1 bg-gradient-to-r ${getColorForType(notification?.type || 'timer')}`} />

          {/* Content */}
          <div className="p-5">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getColorForType(notification?.type || 'timer')} flex items-center justify-center shrink-0 shadow-lg`}>
                <span className="material-symbols-outlined text-white text-2xl">
                  {notification?.icon || getIconForType(notification?.type || 'timer')}
                </span>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white mb-1">
                  {notification?.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {notification?.message}
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted hover:text-white transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Actions */}
            {notification?.actions && notification.actions.length > 0 && (
              <div className="flex gap-2">
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      action.onClick();
                      handleDismiss();
                    }}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      action.primary
                        ? 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 shadow-lg'
                        : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook to manage notifications
export const useInTabNotification = () => {
  const [notification, setNotification] = useState<NotificationData | null>(null);

  const showNotification = (data: Omit<NotificationData, 'id'>) => {
    setNotification({
      ...data,
      id: `notif-${Date.now()}`,
    });
  };

  const dismissNotification = () => {
    setNotification(null);
  };

  return {
    notification,
    showNotification,
    dismissNotification,
  };
};
