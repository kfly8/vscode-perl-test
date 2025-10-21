import * as vscode from 'vscode';
import { SubtestCodeLensProvider } from './subtestCodeLensProvider';
import { TestRunner } from './testRunner';

let outputChannel: vscode.OutputChannel;
let testRunner: TestRunner;

export function activate(context: vscode.ExtensionContext) {
    console.log('Test2 Subtest Filter extension is now active');

    // Create output channel for test results
    outputChannel = vscode.window.createOutputChannel('Test2 Subtest Filter');
    testRunner = new TestRunner(outputChannel);

    // Register CodeLens provider for Perl test files
    const codeLensProvider = new SubtestCodeLensProvider();
    const codeLensProviderDisposable = vscode.languages.registerCodeLensProvider(
        { language: 'perl', pattern: '**/*.t' },
        codeLensProvider
    );

    // Register command to run subtest
    const runSubtestCommand = vscode.commands.registerCommand(
        'test2-subtest-filter.runSubtest',
        async (filePath: string, subtestPath: string) => {
            outputChannel.show(true);
            await testRunner.runSubtest(filePath, subtestPath);
        }
    );

    context.subscriptions.push(
        codeLensProviderDisposable,
        runSubtestCommand,
        outputChannel
    );
}

export function deactivate() {
    if (outputChannel) {
        outputChannel.dispose();
    }
}
