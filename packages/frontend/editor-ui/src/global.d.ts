export {};

declare global {
	type PendoMetadataValue = string | number | boolean | string[] | null | undefined;

	type PendoMetadata = Record<string, PendoMetadataValue>;

	interface PendoIdentity {
		visitor: { id: string } & PendoMetadata;
		account?: { id: string } & PendoMetadata;
	}

	interface PendoLocationTransform {
		attr: 'search' | 'hash' | 'pathname' | 'hostname' | 'href' | 'protocol';
		action: 'AllowOnlyKeys' | 'ExcludeKeys' | 'AddTo' | 'Replace' | 'Clear' | 'ForceSecure';
		data?: string | string[] | ((value: string, url: URL) => string | string[]);
	}

	interface PendoInitializeOptions extends PendoIdentity {
		location?: { transforms: PendoLocationTransform[] };
	}

	interface Pendo {
		initialize: (options: PendoInitializeOptions) => void;
		identify: (identity: PendoIdentity) => void;
		// Not stubbed by the install snippet, so it only exists once the agent has loaded
		clearSession?: () => void;
	}

	interface Window {
		pendo?: Pendo;
	}
}
