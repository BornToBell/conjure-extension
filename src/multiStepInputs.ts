/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { workspace, QuickPickItem, window, Disposable, CancellationToken, QuickInputButton, QuickInput, ExtensionContext, QuickInputButtons, Uri, WorkspaceFolder, QuickPickOptions, } from 'vscode';
import * as fs from 'fs';
import { resolve } from 'path';
/**
 * A multi-step input using window.createQuickPick() and window.createInputBox().
 * 
 * This first part uses the helper class `MultiStepInput` that wraps the API for the multi-step case.
 */
export async function multiStepInput(context: ExtensionContext) {

    // class MyButton implements QuickInputButton {
    //     constructor(public iconPath: { light: Uri; dark: Uri; }, public tooltip: string) { }
    // }

    // const createResourceGroupButton = new MyButton({
    //     dark: Uri.file(context.asAbsolutePath('resources/dark/add.svg')),
    //     light: Uri.file(context.asAbsolutePath('resources/light/add.svg')),
    // }, 'Create Resource Group');




    interface State {
        title: string;
        step: number;
        totalSteps: number;
        resourceGroup: QuickPickItem | string;
        essence: string;
        existParam: boolean;
        exist: string;
        directory: string;
        params: string[];
    }

    /**
     * Start multi-step actions.
     * @returns state(collection of inputs)
     */
    async function collectInputs() {
        const state = {} as Partial<State>;
        await MultiStepInput.run(input => askParam(input, state));
        return state as State;
    }

    /**
     * Find essence files in workspace.
     * @param dir Directory of workspace
     * @returns essence files
     */
    function getFilesFolder(dir: string): string[] {
        let Files: string[] = [];
        const files = fs.readdirSync(dir, { withFileTypes: true });
        files.map(dir => {
            if (dir.isFile() && dir.name.endsWith('.essence')) {
                Files.push(dir.name);
            }
        });
        return Files;
    }

    /**
     * Find essence files in workspace.
     * @param dir directory which has parameter files
     * @returns parameter files
     */
    function getParams(dir: string): string[] {
        let Files: string[] = [];
        const files = fs.readdirSync(dir, { withFileTypes: true });
        files.map(dir => {
            if (dir.isFile() && dir.name.endsWith('.param')) {
                Files.push(dir.name);
            }
        });
        return Files;
    }

    /**
     * Ask whether parameter file is required.
     * @param input 
     * @param state 
     * @returns Go to step to pick essence files.
     */
    async function askParam(input: MultiStepInput, state: Partial<State>) {
        const resourceGroups: QuickPickItem[] = ['Yes', 'No'].map(label => ({ label }));
        const pick = await input.showQuickPick({
            title:'Ask Exist of Param',
            step: 0,
            totalSteps: 3,
            placeholder: 'Do you use parameter file(s)?',
            items: resourceGroups,
            activeItem: typeof state.resourceGroup !== 'string' ? state.resourceGroup : undefined,
            shouldResume: shouldResume
        });
        state.exist = pick.label;
        state.directory = workspace.rootPath;
        if (pick.label === 'No') {
            state.exist = 'No';
            state.existParam = false;
            state.params = [];
            state.directory = '';
        } else {
            state.existParam = true;
        }
        return (input: MultiStepInput) => pickEssence(input, state);
    }

    /**
     * Select an essence file.
     * @param input 
     * @param state 
     * @returns Go to ask directory.
     */
    async function pickEssence(input: MultiStepInput, state: Partial<State>) {
        const dir = workspace.rootPath;
        if (dir === undefined) {
            const message = "YOUR-EXTENSION: Working folder not found, open a folder an try again";
            window.showErrorMessage(message);
        } else {

            const resourceGroups: QuickPickItem[] = getFilesFolder(dir).map(file => ({ label: file }));

            if (resourceGroups.length === 0) {
                const message1 = "YOUR-EXTENSION: Essence file not found, try another folder";
                window.showErrorMessage(message1);
            } else {
                const pick = await input.showQuickPick({
                    title: 'Pick essence',
                    step: 1,
                    totalSteps: state.existParam ? 3 : 1,
                    placeholder: 'Pick a essence file',
                    items: resourceGroups,
                    activeItem: typeof state.resourceGroup !== 'string' ? state.resourceGroup : undefined,
                    // buttons: [createResourceGroupButton],
                    shouldResume: shouldResume
                });
                state.essence = dir + '/' + pick.label;
                if (state.existParam) {
                    return (input: MultiStepInput) => askDirectory(input, state);
                }
            }

        }
    }

    /**
     * Get directories in workspace.
     * @param dir 
     * @returns directories
     */
    function getFolders(dir: string): string[] {
        let Folders: string[] = [];
        const files = fs.readdirSync(dir, { withFileTypes: true });
        files.map(dir => {
            if (dir.isDirectory()) {
                Folders.push(dir.name);
            }
        });
        return Folders;
    }

    /**
     * Ask whether parameter files exist in directory in workspace.
     * @param input 
     * @param state 
     * @returns Go to pick directory or pick parameter files.
     */
    async function askDirectory(input: MultiStepInput, state: Partial<State>) {
        const resourceGroups: QuickPickItem[] = ['Yes', 'No'].map(label => ({ label }));
        const pick = await input.showQuickPick({
            title: 'Ask Dir',
            step: 2,
            totalSteps: 3,
            placeholder: 'Do param file(s) exist in workspace?',
            items: resourceGroups,
            activeItem: typeof state.resourceGroup !== 'string' ? state.resourceGroup : undefined,
            shouldResume: shouldResume
        });
        state.exist = pick.label;
        if (pick.label === 'Yes') {
            return (input: MultiStepInput) => pickParams(input, state);
        } else {
            return (input: MultiStepInput) => pickDirectory(input, state);
        }

    }

    /**
     * Pick a directory which should has parameter file(s).
     * @param input 
     * @param state 
     * @returns Go to pick parameter file.
     */
    async function pickDirectory(input: MultiStepInput, state: Partial<State>) {
        if (workspace.rootPath !== undefined) {
            const dir = workspace.rootPath;
            const folders: string[] = getFolders(dir);
            let resourceGroups: QuickPickItem[];
            if (folders.length > 0) {
                resourceGroups = folders.map(f => ({ label: f }));
            } else {
                resourceGroups = [];
            }
            const pick = await input.showQuickPick({
                title: 'Directory',
                step: 3,
                totalSteps: 4,
                placeholder: 'Select Directory',
                items: resourceGroups,
                activeItem: typeof state.resourceGroup !== 'string' ? state.resourceGroup : undefined,
                shouldResume: shouldResume
            });
            state.directory = dir + '/' + pick.label;
            return (input: MultiStepInput) => pickParams(input, state);
        }
    }

    /**
     * Pick parameter file(s)
     * @param input 
     * @param state 
     */
    async function pickParams(input: MultiStepInput, state: Partial<State>) {
        const additionalSteps = state.exist === 'No' ? 1 : 0;
        const dir = workspace.rootPath;
        if (state.directory !== undefined) {
            const params: string[] = getParams(state.directory);
            let resourceGroups: QuickPickItem[];
            if (params.length > 0) {
                resourceGroups = params.map(f => ({ label: f }));
            } else {
                resourceGroups = [];
            }
            const options: QuickPickOptions = {
                canPickMany: true
            };
            const pick = await input.showMultiQuickPick({
                title: 'Parameter file',
                step: 3 + additionalSteps,
                totalSteps: 3 + additionalSteps,
                placeholder: 'Choose param file(s)',
                items: resourceGroups,
                activeItem: typeof state.resourceGroup !== 'string' ? state.resourceGroup : undefined,
                shouldResume: shouldResume
            }, options);
            state.params = pick.map(item => item.label);
        }

    }

    function shouldResume() {
        // Could show a notification with the option to resume.
        return new Promise<boolean>((resolve, reject) => {
            // noop
        });
    }
    
    const state = await collectInputs();
    return state;

}


// -------------------------------------------------------
// Helper code that wraps the API for the multi-step case.
// -------------------------------------------------------


class InputFlowAction {
    static back = new InputFlowAction();
    static cancel = new InputFlowAction();
    static resume = new InputFlowAction();
}

type InputStep = (input: MultiStepInput) => Thenable<InputStep | void>;

interface QuickPickParameters<T extends QuickPickItem> {
    title: string;
    step: number;
    totalSteps: number;
    items: T[];
    activeItem?: T;
    ignoreFocusOut?: boolean;
    placeholder: string;
    buttons?: QuickInputButton[];
    shouldResume: () => Thenable<boolean>;
}

interface InputBoxParameters {
    title: string;
    step: number;
    totalSteps: number;
    value: string;
    prompt: string;
    validate: (value: string) => Promise<string | undefined>;
    buttons?: QuickInputButton[];
    ignoreFocusOut?: boolean;
    placeholder?: string;
    shouldResume: () => Thenable<boolean>;
}

class MultiStepInput {

    static async run<T>(start: InputStep) {
        const input = new MultiStepInput();
        return input.stepThrough(start);
    }

    private current?: QuickInput;
    private steps: InputStep[] = [];

    private async stepThrough<T>(start: InputStep) {
        let step: InputStep | void = start;
        while (step) {
            this.steps.push(step);
            if (this.current) {
                this.current.enabled = false;
                this.current.busy = true;
            }
            try {
                step = await step(this);
            } catch (err) {
                if (err === InputFlowAction.back) {
                    this.steps.pop();
                    step = this.steps.pop();
                } else if (err === InputFlowAction.resume) {
                    step = this.steps.pop();
                } else if (err === InputFlowAction.cancel) {
                    step = undefined;
                } else {
                    throw err;
                }
            }
        }
        if (this.current) {
            this.current.dispose();
        }
    }


    async showQuickPick<T extends QuickPickItem, P extends QuickPickParameters<T>>({ title, step, totalSteps, items, activeItem, ignoreFocusOut, placeholder, buttons, shouldResume }: P, options?: QuickPickOptions) {
        const disposables: Disposable[] = [];
        try {
            return await new Promise<T | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
                const input = window.createQuickPick<T>();
                input.title = title;
                input.step = step;
                input.totalSteps = totalSteps;
                input.ignoreFocusOut = ignoreFocusOut ?? false;
                input.placeholder = placeholder;
                input.items = items;
                input.canSelectMany = options?.canPickMany === undefined ? false : options.canPickMany;
                if (activeItem) {
                    input.activeItems = [activeItem];
                }
                input.buttons = [
                    ...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
                    ...(buttons || [])
                ];
                if (items.length === 0) {       
                    window.showErrorMessage(`${input.title} does not exist.`);
                    reject(InputFlowAction.back);
                }
                disposables.push(
                    input.onDidTriggerButton(item => {
                        if (item === QuickInputButtons.Back) {
                            reject(InputFlowAction.back);
                        } else {
                            resolve(<any>item);
                        }
                    }),
                    input.onDidChangeSelection(items => {
                        if (!input.canSelectMany) {
                            resolve(items[0]);
                        }

                    }),
                    input.onDidHide(() => {
                        (async () => {
                            reject(shouldResume && await shouldResume() ? InputFlowAction.resume : InputFlowAction.cancel);
                        })()
                            .catch(reject);
                    })
                );
                if (this.current) {
                    this.current.dispose();
                }
                this.current = input;
                this.current.show();
            });
        } finally {
            disposables.forEach(d => d.dispose());
        }
    }

    async showMultiQuickPick<T extends QuickPickItem, P extends QuickPickParameters<T>>({ title, step, totalSteps, items, activeItem, ignoreFocusOut, placeholder, buttons, shouldResume }: P, options?: QuickPickOptions) {
        const disposables: Disposable[] = [];
        try {
            return await new Promise<T[] | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
                const input = window.createQuickPick<T>();
                input.title = title;
                input.step = step;
                input.totalSteps = totalSteps;
                input.ignoreFocusOut = ignoreFocusOut ?? false;
                input.placeholder = placeholder;
                input.items = items;
                input.canSelectMany = options?.canPickMany === undefined ? false : options.canPickMany;
                if (activeItem) {
                    input.activeItems = [activeItem];
                }
                input.buttons = [
                    ...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
                    ...(buttons || [])
                ];

                if (items.length === 0) {
                    
                    window.showErrorMessage(`${input.title} does not exist.`);
                    reject(InputFlowAction.back);
                }
                disposables.push(
                    input.onDidTriggerButton(item => {
                        if (item === QuickInputButtons.Back) {
                            reject(InputFlowAction.back);
                        } else {
                            resolve(<any>item);
                        }
                    }),
                    input.onDidAccept(() => {
                        if (input.selectedItems.length > 0) {
                            const items: T[] = input.selectedItems.map(pick => ({ ...pick }));
                            resolve(items);
                        } else {
                            reject(InputFlowAction.resume);
                            window.showErrorMessage('Choose more than 1 param file.');
                        }
                    })

                );
                if (this.current) {
                    this.current.dispose();
                }
                this.current = input;
                this.current.show();
            });
        } finally {
            disposables.forEach(d => d.dispose());
        }
    }

    async showInputBox<P extends InputBoxParameters>({ title, step, totalSteps, value, prompt, validate, buttons, ignoreFocusOut, placeholder, shouldResume }: P) {
        const disposables: Disposable[] = [];
        try {
            return await new Promise<string | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
                const input = window.createInputBox();
                input.title = title;
                input.step = step;
                input.totalSteps = totalSteps;
                input.value = value || '';
                input.prompt = prompt;
                input.ignoreFocusOut = ignoreFocusOut ?? false;
                input.placeholder = placeholder;
                input.buttons = [
                    ...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
                    ...(buttons || [])
                ];
                let validating = validate('');
                disposables.push(
                    input.onDidTriggerButton(item => {
                        if (item === QuickInputButtons.Back) {
                            reject(InputFlowAction.back);
                        } else {
                            resolve(<any>item);
                        }
                    }),
                    input.onDidAccept(async () => {
                        const value = input.value;
                        input.enabled = false;
                        input.busy = true;
                        if (!(await validate(value))) {
                            resolve(value);
                        }
                        input.enabled = true;
                        input.busy = false;
                    }),
                    input.onDidChangeValue(async text => {
                        const current = validate(text);
                        validating = current;
                        const validationMessage = await current;
                        if (current === validating) {
                            input.validationMessage = validationMessage;
                        }
                    }),
                    input.onDidHide(() => {
                        (async () => {
                            reject(shouldResume && await shouldResume() ? InputFlowAction.resume : InputFlowAction.cancel);
                        })()
                            .catch(reject);
                    })
                );
                if (this.current) {
                    this.current.dispose();
                }
                this.current = input;
                this.current.show();
            });
        } finally {
            disposables.forEach(d => d.dispose());
        }
    }
}

