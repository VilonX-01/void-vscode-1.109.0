/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { mountVoidOnboarding } from './react/out/void-onboarding/index.js'
import { h, getActiveWindow } from '../../../../base/browser/dom.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';

// Onboarding contribution that mounts the component at startup
export class OnboardingContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.voidOnboarding';

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService,
	) {
		super();
		this.initialize();
	}

	private initialize(): void {
		// Get the active window reference for multi-window support
		const targetWindow = getActiveWindow();

		// Resolve the active workbench container via layout service first.
		// Fallback to DOM query if container is not available yet.
		let workbench: Element | null = null;
		try {
			workbench = this.layoutService.getContainer(targetWindow);
		} catch {
			workbench = targetWindow.document.querySelector('.monaco-workbench');
		}

		if (workbench) {

			const onboardingContainer = h('div.void-onboarding-container').root;
			workbench.appendChild(onboardingContainer);
			this.instantiationService.invokeFunction((accessor: ServicesAccessor) => {
				const result = mountVoidOnboarding(onboardingContainer, accessor);
				if (result && typeof result.dispose === 'function') {
					this._register(toDisposable(result.dispose));
				}
			});
			// Register cleanup for the DOM element
			this._register(toDisposable(() => {
				if (onboardingContainer.parentElement) {
					onboardingContainer.parentElement.removeChild(onboardingContainer);
				}
			}));
		}
	}
}

// Mount before workbench restore completes to avoid showing the regular editor first.
registerWorkbenchContribution2(OnboardingContribution.ID, OnboardingContribution, WorkbenchPhase.BlockRestore);
