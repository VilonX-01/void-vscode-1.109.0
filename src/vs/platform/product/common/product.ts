/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { env } from '../../../base/common/process.js';
import { IDefaultChatAgent, IProductConfiguration } from '../../../base/common/product.js';
import { ISandboxConfiguration } from '../../../base/parts/sandbox/common/sandboxTypes.js';

/**
 * @deprecated It is preferred that you use `IProductService` if you can. This
 * allows web embedders to override our defaults. But for things like `product.quality`,
 * the use is fine because that property is not overridable.
 */
let product: IProductConfiguration;

function withDefaultChatAgent(defaultChatAgent: IDefaultChatAgent | undefined): IDefaultChatAgent {
	const fallback: IDefaultChatAgent = {
		extensionId: 'GitHub.copilot',
		chatExtensionId: 'GitHub.copilot-chat',
		chatExtensionOutputId: 'github.copilot-chat',
		documentationUrl: 'https://code.visualstudio.com/docs/copilot/overview',
		skusDocumentationUrl: 'https://docs.github.com/en/copilot',
		publicCodeMatchesUrl: 'https://docs.github.com/en/copilot/responsible-use',
		manageSettingsUrl: 'https://github.com/settings/copilot',
		managePlanUrl: 'https://github.com/settings/billing',
		manageOverageUrl: 'https://github.com/settings/billing',
		upgradePlanUrl: 'https://github.com/features/copilot/plans',
		signUpUrl: 'https://github.com/features/copilot',
		termsStatementUrl: 'https://docs.github.com/site-policy/github-terms/github-terms-for-additional-products-and-features#github-copilot',
		privacyStatementUrl: 'https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement',
		provider: {
			default: { id: 'github', name: 'GitHub' },
			enterprise: { id: 'github-enterprise', name: 'GitHub Enterprise' },
			google: { id: 'google', name: 'Google' },
			apple: { id: 'apple', name: 'Apple' }
		},
		providerUriSetting: 'github-enterprise.uri',
		providerScopes: [[]],
		entitlementUrl: '',
		entitlementSignupLimitedUrl: '',
		tokenEntitlementUrl: '',
		mcpRegistryDataUrl: '',
		chatQuotaExceededContext: 'chatQuotaExceeded',
		completionsQuotaExceededContext: 'completionsQuotaExceeded',
		walkthroughCommand: '',
		completionsMenuCommand: '',
		completionsRefreshTokenCommand: '',
		chatRefreshTokenCommand: '',
		generateCommitMessageCommand: '',
		resolveMergeConflictsCommand: '',
		completionsAdvancedSetting: 'github.copilot.advanced',
		completionsEnablementSetting: 'github.copilot.enable',
		nextEditSuggestionsSetting: 'github.copilot.nextEditSuggestions.enabled'
	};

	if (!defaultChatAgent) {
		return fallback;
	}

	return {
		...fallback,
		...defaultChatAgent,
		provider: {
			...fallback.provider,
			...defaultChatAgent.provider,
			default: { ...fallback.provider.default, ...defaultChatAgent.provider?.default },
			enterprise: { ...fallback.provider.enterprise, ...defaultChatAgent.provider?.enterprise },
			google: { ...fallback.provider.google, ...defaultChatAgent.provider?.google },
			apple: { ...fallback.provider.apple, ...defaultChatAgent.provider?.apple },
		},
		providerScopes: defaultChatAgent.providerScopes ?? fallback.providerScopes,
	};
}

// Native sandbox environment
const vscodeGlobal = (globalThis as { vscode?: { context?: { configuration(): ISandboxConfiguration | undefined } } }).vscode;
if (typeof vscodeGlobal !== 'undefined' && typeof vscodeGlobal.context !== 'undefined') {
	const configuration: ISandboxConfiguration | undefined = vscodeGlobal.context.configuration();
	if (configuration) {
		product = configuration.product;
	} else {
		throw new Error('Sandbox: unable to resolve product configuration from preload script.');
	}
}
// _VSCODE environment
else if (globalThis._VSCODE_PRODUCT_JSON && globalThis._VSCODE_PACKAGE_JSON) {
	// Obtain values from product.json and package.json-data
	product = globalThis._VSCODE_PRODUCT_JSON as unknown as IProductConfiguration;

	// Some forks omit this key; core services in recent VS Code assume it exists.
	Object.assign(product, { defaultChatAgent: withDefaultChatAgent(product.defaultChatAgent) });

	// Running out of sources
	if (env['VSCODE_DEV']) {
		Object.assign(product, {
			nameShort: `${product.nameShort} Dev`,
			nameLong: `${product.nameLong} Dev`,
			dataFolderName: `${product.dataFolderName}-dev`,
			serverDataFolderName: product.serverDataFolderName ? `${product.serverDataFolderName}-dev` : undefined
		});
	}

	// Version is added during built time, but we still
	// want to have it running out of sources so we
	// read it from package.json only when we need it.
	if (!product.version) {
		const pkg = globalThis._VSCODE_PACKAGE_JSON as { version: string };

		Object.assign(product, {
			version: pkg.version
		});
	}
}

// Web environment or unknown
else {

	// Built time configuration (do NOT modify)
	// eslint-disable-next-line local/code-no-dangerous-type-assertions
	product = { /*BUILD->INSERT_PRODUCT_CONFIGURATION*/ } as unknown as IProductConfiguration;

	// Running out of sources
	if (Object.keys(product).length === 0) {
		Object.assign(product, {
			version: '1.104.0-dev',
			nameShort: 'Code - OSS Dev',
			nameLong: 'Code - OSS Dev',
			applicationName: 'code-oss',
			dataFolderName: '.vscode-oss',
			urlProtocol: 'code-oss',
			reportIssueUrl: 'https://github.com/microsoft/vscode/issues/new',
			licenseName: 'MIT',
			licenseUrl: 'https://github.com/microsoft/vscode/blob/main/LICENSE.txt',
			serverLicenseUrl: 'https://github.com/microsoft/vscode/blob/main/LICENSE.txt',
			defaultChatAgent: {
				extensionId: 'GitHub.copilot',
				chatExtensionId: 'GitHub.copilot-chat',
				provider: {
					default: {
						id: 'github',
						name: 'GitHub',
					},
					enterprise: {
						id: 'github-enterprise',
						name: 'GitHub Enterprise',
					}
				},
				providerScopes: []
			}
		});
	}

	Object.assign(product, { defaultChatAgent: withDefaultChatAgent(product.defaultChatAgent) });
}

export default product;
