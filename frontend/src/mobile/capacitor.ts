import { Capacitor } from '@capacitor/core';

export function isNativeCapacitor() {
  return Capacitor.isNativePlatform();
}

export function isCapacitorShellOrigin() {
  const isDefaultCapacitorLocalhost =
    (window.location.protocol === 'http:' || window.location.protocol === 'https:') &&
    window.location.hostname === 'localhost' &&
    !window.location.port;

  return (isNativeCapacitor() && window.location.protocol === 'capacitor:') || isDefaultCapacitorLocalhost;
}
