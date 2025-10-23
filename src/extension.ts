import * as vscode from 'vscode';
import { Test2SubtestController } from './testController';

let testController: Test2SubtestController;

export function activate(context: vscode.ExtensionContext) {
    console.log('Test2 Subtest Filter extension is now active');

    // Create test controller
    testController = new Test2SubtestController(context);

    context.subscriptions.push(
        testController
    );
}

export function deactivate() {
    if (testController) {
        testController.dispose();
    }
}
