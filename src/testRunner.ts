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

        try {
            const config = vscode.workspace.getConfiguration('test2SubtestFilter');
            const proveCommand = config.get<string>('proveCommand', 'prove');
            const proveArgs = config.get<string[]>('proveArgs', ['-lv']);

            // Get workspace folder for the file
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
            const cwd = workspaceFolder?.uri.fsPath || path.dirname(filePath);

            // Convert file path to relative path from workspace
            const relativeFilePath = path.relative(cwd, filePath);

            this.outputChannel.appendLine(`File: ${relativeFilePath}`);
            this.outputChannel.appendLine('-'.repeat(80));

            // Check if using docker compose exec or docker exec
            const dockerExecMatch = proveCommand.match(/^(docker[\s-]compose\s+exec|docker\s+exec)\s+(\S+)\s+(.*)$/i);

            let finalCommand: string;
            let finalArgs: string[];
            let env = { ...process.env };

            if (dockerExecMatch) {
                // docker compose exec <container> <rest>
                // → docker compose exec <container> env SUBTEST_FILTER='...' <rest>
                const dockerCmd = dockerExecMatch[1];        // "docker compose exec" or "docker exec"
                const container = dockerExecMatch[2];        // "app"
                const restCommand = dockerExecMatch[3];      // "carton exec -- prove"

                // Properly quote the subtest path for shell
                const quotedSubtestPath = `'${subtestPath.replace(/'/g, "'\\''")}'`;

                finalCommand = `${dockerCmd} ${container} env SUBTEST_FILTER=${quotedSubtestPath} ${restCommand}`;
                finalArgs = [...proveArgs, relativeFilePath];

                this.outputChannel.appendLine(`Command: ${finalCommand} ${finalArgs.join(' ')}`);
            } else {
                // For normal commands, use environment variables
                finalCommand = proveCommand;
                finalArgs = [...proveArgs, relativeFilePath];
                env.SUBTEST_FILTER = subtestPath;

                this.outputChannel.appendLine(`Command: SUBTEST_FILTER='${subtestPath}' ${finalCommand} ${finalArgs.join(' ')}`);
            }

            this.outputChannel.appendLine(`Working directory: ${cwd}`);
            this.outputChannel.appendLine('-'.repeat(80));
            this.outputChannel.appendLine('');

            await this.executeCommand(finalCommand, finalArgs, env, cwd);
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
