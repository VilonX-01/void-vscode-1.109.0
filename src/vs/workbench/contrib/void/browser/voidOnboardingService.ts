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
			// Temporary startup blocker to avoid a one-frame workbench flash before
			// React mounts and decides whether onboarding should be shown.
			onboardingContainer.style.position = 'fixed';
			onboardingContainer.style.inset = '0';
			onboardingContainer.style.zIndex = '99999';
			onboardingContainer.style.background = 'var(--vscode-editor-background)';
			onboardingContainer.style.pointerEvents = 'auto';

			workbench.appendChild(onboardingContainer);
			this.instantiationService.invokeFunction((accessor: ServicesAccessor) => {
				const result = mountVoidOnboarding(onboardingContainer, accessor);
				if (result && typeof result.dispose === 'function') {
					this._register(toDisposable(result.dispose));
				}
			});

			// Remove temporary blocker styles after first paint; React onboarding (if
			// active) provides its own overlay styles.
			let raf1 = 0;
			let raf2 = 0;
			raf1 = targetWindow.requestAnimationFrame(() => {
				raf2 = targetWindow.requestAnimationFrame(() => {
					onboardingContainer.style.position = '';
					onboardingContainer.style.inset = '';
					onboardingContainer.style.zIndex = '';
					onboardingContainer.style.background = '';
					onboardingContainer.style.pointerEvents = '';
				});
			});
			this._register(toDisposable(() => {
				if (raf1) {
					targetWindow.cancelAnimationFrame(raf1);
				}
				if (raf2) {
					targetWindow.cancelAnimationFrame(raf2);
				}
			}));

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
