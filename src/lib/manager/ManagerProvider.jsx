'use client';

/**
 * Boots the Manager browser logger and injects the analytics tracker once.
 * Renders nothing. Safe to mount in the root layout on every app.
 */
import { useEffect } from 'react';
import { managerConfig, managerTrackerScript } from './index';
import { initLogger } from './logger.js';

export default function ManagerProvider() {
  useEffect(() => {
    if (!managerConfig.enabled || typeof window === 'undefined') return;

    try {
      const log = initLogger({
        endpoint: managerConfig.endpoint,
        appId: managerConfig.appId,
        apiKey: managerConfig.apiKey,
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        release: process.env.NEXT_PUBLIC_RELEASE || 'web',
        captureConsole: ['warn', 'error'],
        captureGlobalErrors: true,
        captureFetch: true,
        redactKeys: ['password', 'token', 'secret', 'authorization', 'cookie'],
      });
      log.info('manager_logger_started', { source: 'client' });
    } catch {
      /* observability must never break the app */
    }

    const tracker = managerTrackerScript();
    if (!tracker) return;
    if (document.querySelector(`script[src="${tracker.src}"]`)) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = tracker.src;
    script.dataset.app = tracker.appId;
    script.dataset.key = tracker.key;
    document.body.appendChild(script);
  }, []);

  return null;
}
