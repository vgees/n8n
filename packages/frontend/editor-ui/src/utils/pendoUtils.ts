/**
 * Thin, safe wrapper around the Pendo agent's Track Events API.
 *
 * The Pendo agent is loaded externally (install snippet) and exposed as `window.pendo`.
 * When the agent is not present (e.g. self-hosted instances without Pendo), calls are no-ops.
 * Tracking failures must never break application flow, so all errors are swallowed.
 */

export type PendoTrackPropertyValue = string | number | boolean | string[] | null | undefined;

export type PendoTrackProperties = Record<string, PendoTrackPropertyValue>;

interface PendoAgent {
	track?: (eventName: string, properties?: PendoTrackProperties) => void;
}

type WindowWithPendo = Window & { pendo?: PendoAgent };

export function trackPendoEvent(eventName: string, properties: PendoTrackProperties = {}): void {
	try {
		if (typeof window === 'undefined') return;

		const pendo = (window as WindowWithPendo).pendo;
		if (typeof pendo?.track !== 'function') return;

		pendo.track(eventName, properties);
	} catch {
		// Tracking is best-effort and must never interrupt the user flow.
	}
}
