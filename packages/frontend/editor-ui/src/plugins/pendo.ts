import type { IPersonalizationSurveyVersions, IUser } from '@/Interface';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/stores/settings.store';

/**
 * Query parameters that carry authentication material, keyed by the route they arrive on.
 * Pendo records the browser URL on every event, so these are stripped from what it records.
 * The browser URL itself and what the app reads from it are left untouched.
 */
const SENSITIVE_QUERY_PARAMS_BY_PATH: Array<{ pathSuffix: string; keys: string[] }> = [
	// Password reset link: /change-password?token=<reset JWT>&mfaEnabled=...
	{ pathSuffix: '/change-password', keys: ['token'] },
	// Invitation link: /signup?inviterId=...&inviteeId=...
	{ pathSuffix: '/signup', keys: ['inviterId', 'inviteeId'] },
	// License activation: /settings/usage?key=<activation key>
	{ pathSuffix: '/settings/usage', keys: ['key'] },
];

function getSensitiveQueryParams(url: URL): string[] {
	// Never throw here: a throwing transform makes Pendo fall back to the untransformed URL
	const pathname = String(url?.pathname ?? '').replace(/\/+$/, '');
	const match = SENSITIVE_QUERY_PARAMS_BY_PATH.find(({ pathSuffix }) =>
		pathname.endsWith(pathSuffix),
	);

	return match ? match.keys : [];
}

/**
 * Boots Pendo once at app entry with an anonymous visitor.
 * The signed-in user is registered later via `identifyPendoUser`.
 */
export function initializePendo() {
	window.pendo?.initialize({
		visitor: {
			id: '',
		},
		location: {
			transforms: [
				{
					attr: 'search',
					action: 'ExcludeKeys',
					data: (_search, url) => getSensitiveQueryParams(url),
				},
			],
		},
	});
}

function getPersonalizationMetadata(answers: IPersonalizationSurveyVersions | null | undefined) {
	if (!answers) {
		return {};
	}

	const workArea = 'workArea' in answers ? answers.workArea : undefined;
	let companyIndustry: string[] | null | undefined;
	if ('companyIndustry' in answers) {
		companyIndustry = answers.companyIndustry;
	} else if ('companyIndustryExtended' in answers) {
		companyIndustry = answers.companyIndustryExtended;
	}

	return {
		codingSkill: 'codingSkill' in answers ? answers.codingSkill : undefined,
		workArea: typeof workArea === 'string' ? [workArea] : workArea,
		companyIndustry,
		companySize: answers.companySize,
	};
}

/**
 * Registers the signed-in user (visitor) and their n8n instance (account) with Pendo.
 */
export function identifyPendoUser(user: IUser) {
	if (!window.pendo) {
		return;
	}

	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const instanceId = rootStore.instanceId;

	window.pendo.identify({
		visitor: {
			id: user.id,
			email: user.email,
			full_name: [user.firstName, user.lastName].filter(Boolean).join(' '),
			firstName: user.firstName,
			lastName: user.lastName,
			role: user.role,
			accountId: instanceId,
			createdAt: user.createdAt,
			disabled:
				'disabled' in user && typeof user.disabled === 'boolean' ? user.disabled : undefined,
			mfaEnabled: user.mfaEnabled,
			isPending: user.isPending,
			isOnboarded: user.settings?.isOnboarded,
			userActivated: user.settings?.userActivated,
			userActivatedAt: user.settings?.userActivatedAt,
			easyAIWorkflowOnboarded: user.settings?.easyAIWorkflowOnboarded,
			userClaimedAiCredits: user.settings?.userClaimedAiCredits,
			...getPersonalizationMetadata(user.personalizationAnswers),
		},
		...(instanceId
			? {
					account: {
						id: instanceId,
						instanceId,
						planName: settingsStore.planName,
						licenseEnvironment: settingsStore.settings.license?.environment,
						deploymentType: settingsStore.deploymentType,
						versionCli: rootStore.versionCli,
						releaseChannel: settingsStore.settings.releaseChannel,
						usersLimit: settingsStore.userManagement.quota,
						teamProjectsLimit: settingsStore.settings.enterprise?.projects?.team?.limit,
					},
				}
			: {}),
	});
}

/**
 * Resets Pendo to a fresh anonymous visitor so the next user is not tracked as the previous one.
 */
export function clearPendoSession() {
	window.pendo?.clearSession?.();
}
