import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

export class TestRunner {
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    public async runSubtest(filePath: string, subtestPath: string): Promise<void> {
        this.outputChannel.clear();
        this.outputChannel.appendLine(`Running subtest: ${subtestPath}`);
        this.outputChannel.appendLine(`File: ${filePath}`);
        this.outputChannel.appendLine('-'.repeat(80));

        try {
            const config = vscode.workspace.getConfiguration('test2SubtestFilter');
            const proveCommand = config.get<string>('proveCommand', 'prove');
            const proveArgs = config.get<string[]>('proveArgs', ['-lv']);

            // Get workspace folder for the file
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
            const cwd = workspaceFolder?.uri.fsPath || path.dirname(filePath);

            // Construct the command
            const args = [...proveArgs, filePath];
            const env = {
                ...process.env,
                SUBTEST_FILTER: subtestPath
            };

            this.outputChannel.appendLine(`Command: SUBTEST_FILTER='${subtestPath}' ${proveCommand} ${args.join(' ')}`);
            this.outputChannel.appendLine(`Working directory: ${cwd}`);
            this.outputChannel.appendLine('-'.repeat(80));
            this.outputChannel.appendLine('');

            await this.executeCommand(proveCommand, args, env, cwd);
        } catch (error) {
            this.outputChannel.appendLine('');
            this.outputChannel.appendLine('-'.repeat(80));
            this.outputChannel.appendLine(`Error: ${error}`);
            vscode.window.showErrorMessage(`Failed to run subtest: ${error}`);
        }
    }

    private executeCommand(
        command: string,
        args: string[],
        env: NodeJS.ProcessEnv,
        cwd: string
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const process = cp.spawn(command, args, {
                cwd,
                env,
                shell: true
            });

            process.stdout.on('data', (data: Buffer) => {
                this.outputChannel.append(data.toString());
            });

            process.stderr.on('data', (data: Buffer) => {
                this.outputChannel.append(data.toString());
            });

            process.on('error', (error: Error) => {
                reject(error);
            });

            process.on('close', (code: number) => {
                this.outputChannel.appendLine('');
                this.outputChannel.appendLine('-'.repeat(80));
                if (code === 0) {
                    this.outputChannel.appendLine('✓ Tests passed');
                    vscode.window.showInformationMessage('Subtest passed!');
                } else {
                    this.outputChannel.appendLine(`✗ Tests failed with exit code ${code}`);
                    vscode.window.showErrorMessage(`Subtest failed with exit code ${code}`);
                }
                resolve();
            });
        });
    }
}
