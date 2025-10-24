import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface SubtestData {
    filePath: string;
    testMethod?: string;        // Test::Class method name
    subtestFilter?: string;     // Subtest filter path
}

interface SubtestInfo {
    name: string;
    line: number;
    path: string[];
    isTestClassMethod: boolean;  // True if this is a Test::Class method (not a subtest inside it)
}

export class Test2SubtestController {
    private controller: vscode.TestController;
    private testData = new WeakMap<vscode.TestItem, SubtestData>();

    constructor(context: vscode.ExtensionContext) {
        this.controller = vscode.tests.createTestController(
            'test2-subtest-filter',
            'Test2 Subtest Filter'
        );

        // Create run profile for running tests
        this.controller.createRunProfile(
            'Run',
            vscode.TestRunProfileKind.Run,
            (request, token) => this.runHandler(request, token),
            true
        );

        // Set up resolveHandler to discover tests
        this.controller.resolveHandler = async (item) => {
            if (!item) {
                // Discover all test files in workspace
                await this.discoverAllTests();
            } else {
                // Resolve children for a specific test file
                await this.resolveTestFile(item);
            }
        };

        // Watch for file changes
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.t');
        watcher.onDidCreate(uri => this.discoverTestFile(uri));
        watcher.onDidChange(uri => this.refreshTestFile(uri));
        watcher.onDidDelete(uri => this.removeTestFile(uri));

        // Automatically resolve tests when a test file is opened
        context.subscriptions.push(
            vscode.workspace.onDidOpenTextDocument(async (document) => {
                if (document.uri.scheme === 'file' && document.uri.fsPath.endsWith('.t')) {
                    await this.resolveTestsForOpenDocument(document);
                }
            })
        );

        // Resolve tests for already open documents
        vscode.workspace.textDocuments.forEach(async (document) => {
            if (document.uri.scheme === 'file' && document.uri.fsPath.endsWith('.t')) {
                await this.resolveTestsForOpenDocument(document);
            }
        });
    }

    public dispose(): void {
        this.controller.dispose();
    }

    private async runHandler(request: vscode.TestRunRequest, token: vscode.CancellationToken): Promise<void> {
        const run = this.controller.createTestRun(request);
        const queue: vscode.TestItem[] = [];

        if (request.include) {
            request.include.forEach(test => queue.push(test));
        } else {
            this.controller.items.forEach(test => queue.push(test));
        }

        for (const test of queue) {
            if (token.isCancellationRequested) {
                run.skipped(test);
                continue;
            }

            // If it's a file item, run all children
            if (test.children.size > 0) {
                test.children.forEach(child => queue.push(child));
            } else {
                await this.executeTest(test, run);
            }
        }

        run.end();
    }

    private async executeTest(test: vscode.TestItem, run: vscode.TestRun): Promise<void> {
        const data = this.testData.get(test);
        if (!data) {
            run.skipped(test);
            return;
        }

        const { filePath, testMethod, subtestFilter } = data;

        run.started(test);

        try {
            const config = vscode.workspace.getConfiguration('test2SubtestFilter');
            const proveCommand = config.get<string>('proveCommand', 'prove -lv');

            const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
            const cwd = workspaceFolder?.uri.fsPath || path.dirname(filePath);
            const relativeFilePath = path.relative(cwd, filePath);

            const dockerExecMatch = proveCommand.match(/^(docker[\s-]compose\s+exec|docker\s+exec)\s+(\S+)\s+(.*)$/i);

            let finalCommand: string;
            let env: NodeJS.ProcessEnv = {
                ...process.env,
                FORCE_COLOR: '1',
                CLICOLOR_FORCE: '1',
                CURE_COLOR: '1'
            };

            // Build environment variables for both TEST_METHOD and SUBTEST_FILTER
            const envVars: string[] = [];
            if (testMethod) {
                env.TEST_METHOD = testMethod;
                envVars.push(`TEST_METHOD='${testMethod}'`);
            }
            if (subtestFilter) {
                env.SUBTEST_FILTER = subtestFilter;
                envVars.push(`SUBTEST_FILTER='${subtestFilter}'`);
            }

            if (dockerExecMatch) {
                const dockerCmd = dockerExecMatch[1];
                const container = dockerExecMatch[2];
                const restCommand = dockerExecMatch[3];

                const envPart = envVars.map(v => {
                    const [key, value] = v.split('=');
                    const quotedValue = value.replace(/^'|'$/g, '').replace(/'/g, "'\\''");
                    return `${key}='${quotedValue}'`;
                }).join(' ');

                finalCommand = `${dockerCmd} ${container} env ${envPart} ${restCommand} ${relativeFilePath}`;

                run.appendOutput(`> ${finalCommand}\r\n`);
            } else {
                finalCommand = `${proveCommand} ${relativeFilePath}`;
                const envPrefix = envVars.length > 0 ? envVars.join(' ') + ' ' : '';
                run.appendOutput(`> ${envPrefix}${finalCommand}\r\n`);
            }

            run.appendOutput('\r\n');

            const startTime = Date.now();
            const exitCode = await this.executeCommand(finalCommand, env, cwd, run);
            const duration = Date.now() - startTime;

            if (exitCode === 0) {
                run.passed(test, duration);
            } else {
                run.failed(test, new vscode.TestMessage(`Test failed with exit code ${exitCode}`), duration);
            }
        } catch (error) {
            run.appendOutput(`\r\n${'='.repeat(80)}\r\n`);
            run.appendOutput(`Error: ${error}\r\n`);
            run.failed(test, new vscode.TestMessage(`Error: ${error}`));
        }
    }

    private executeCommand(
        command: string,
        env: NodeJS.ProcessEnv,
        cwd: string,
        run: vscode.TestRun
    ): Promise<number> {
        return new Promise((resolve, reject) => {
            const process = cp.spawn(command, [], {
                cwd,
                env,
                shell: true
            });

            process.stdout.on('data', (data: Buffer) => {
                // Convert LF to CRLF for terminal output
                const text = data.toString().replace(/\n/g, '\r\n');
                run.appendOutput(text);
            });

            process.stderr.on('data', (data: Buffer) => {
                // Convert LF to CRLF for terminal output
                const text = data.toString().replace(/\n/g, '\r\n');
                run.appendOutput(text);
            });

            process.on('error', (error: Error) => {
                reject(error);
            });

            process.on('close', (code: number) => {
                resolve(code || 0);
            });
        });
    }

    private getFileId(filePath: string): string {
        return `file:${filePath}`;
    }

    private getTestId(filePath: string, subtestPath: string): string {
        return `test:${filePath}:${subtestPath}`;
    }

    /**
     * Discover all test files in workspace
     */
    private async discoverAllTests(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return;
        }

        for (const folder of workspaceFolders) {
            const pattern = new vscode.RelativePattern(folder, '**/*.t');
            const files = await vscode.workspace.findFiles(pattern);

            for (const file of files) {
                await this.discoverTestFile(file);
            }
        }
    }

    /**
     * Discover tests in a specific file
     */
    private async discoverTestFile(uri: vscode.Uri): Promise<void> {
        const filePath = uri.fsPath;
        const fileId = this.getFileId(filePath);

        // Create or get file-level test item
        let fileItem = this.controller.items.get(fileId);
        if (!fileItem) {
            fileItem = this.controller.createTestItem(
                fileId,
                path.basename(filePath),
                uri
            );
            fileItem.canResolveChildren = true;
            this.controller.items.add(fileItem);
        }
    }

    /**
     * Resolve children for a test file
     */
    private async resolveTestFile(item: vscode.TestItem): Promise<void> {
        if (!item.uri) {
            return;
        }

        const document = await vscode.workspace.openTextDocument(item.uri);
        const subtests = this.findSubtests(document);

        // Clear existing children
        item.children.replace([]);

        // Build a set of Test::Class method names for quick lookup
        const testClassMethods = new Set(
            subtests
                .filter(s => s.isTestClassMethod)
                .map(s => s.name)
        );

        // Add subtests as children
        for (const subtest of subtests) {
            const fullPath = [...subtest.path, subtest.name];
            const displayPath = fullPath.join(' ');
            const testId = this.getTestId(item.uri.fsPath, displayPath);
            const range = new vscode.Range(subtest.line, 0, subtest.line, 0);

            const testItem = this.controller.createTestItem(
                testId,
                displayPath,
                item.uri
            );
            testItem.range = range;

            // Determine TEST_METHOD and SUBTEST_FILTER based on the path
            let testMethod: string | undefined;
            let subtestFilter: string | undefined;

            if (subtest.isTestClassMethod) {
                // This is a Test::Class method itself
                testMethod = subtest.name;
            } else if (subtest.path.length > 0) {
                // This is a subtest, check if first element is a Test::Class method
                const firstPath = subtest.path[0];

                if (testClassMethods.has(firstPath)) {
                    // Subtest inside a Test::Class method
                    testMethod = firstPath;
                    const subtestParts = [...subtest.path.slice(1), subtest.name];
                    subtestFilter = subtestParts.join(' ');
                } else {
                    // Regular nested subtest (not inside Test::Class)
                    subtestFilter = displayPath;
                }
            } else {
                // Top-level subtest (not inside Test::Class)
                subtestFilter = subtest.name;
            }

            // Store test data
            this.testData.set(testItem, {
                filePath: item.uri.fsPath,
                testMethod,
                subtestFilter
            });

            item.children.add(testItem);
        }
    }

    /**
     * Resolve tests when a document is opened
     */
    private async resolveTestsForOpenDocument(document: vscode.TextDocument): Promise<void> {
        const fileId = this.getFileId(document.uri.fsPath);

        // Ensure the file item exists
        let fileItem = this.controller.items.get(fileId);
        if (!fileItem) {
            await this.discoverTestFile(document.uri);
            fileItem = this.controller.items.get(fileId);
        }

        // Resolve the test file to show subtests
        if (fileItem) {
            await this.resolveTestFile(fileItem);
        }
    }

    /**
     * Refresh a test file when it changes
     */
    private async refreshTestFile(uri: vscode.Uri): Promise<void> {
        const fileId = this.getFileId(uri.fsPath);
        const fileItem = this.controller.items.get(fileId);

        if (fileItem) {
            await this.resolveTestFile(fileItem);
        }
    }

    /**
     * Remove a test file when deleted
     */
    private removeTestFile(uri: vscode.Uri): void {
        const fileId = this.getFileId(uri.fsPath);
        this.controller.items.delete(fileId);
    }

    /**
     * Find subtests and Test::Class test methods in a document
     */
    private findSubtests(document: vscode.TextDocument): SubtestInfo[] {
        const subtests: SubtestInfo[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        // Track nesting level using improved scope tracking
        const nestingStack: Array<{info: SubtestInfo, braceLevel: number}> = [];
        let totalBraceCount = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Count braces in this line first
            const openBraces = (line.match(/\{/g) || []).length;
            const closeBraces = (line.match(/\}/g) || []).length;
            const netBraces = openBraces - closeBraces;

            // Match Test::Class test methods: sub test_xxx : Test { ... }
            const testClassMatch = line.match(/^\s*sub\s+(test_\w+)\s*:\s*Tests?\b/);

            if (testClassMatch) {
                const name = testClassMatch[1];

                const testClassInfo: SubtestInfo = {
                    name: name,
                    line: i,
                    path: [],  // Test::Class methods are not nested
                    isTestClassMethod: true
                };

                subtests.push(testClassInfo);

                // Push Test::Class method to stack so subtests inside it can be tracked
                nestingStack.push({
                    info: testClassInfo,
                    braceLevel: totalBraceCount + netBraces
                });
            }

            // Match subtest declarations with various quote styles
            const subtestMatch = line.match(/^\s*subtest\s+['"](.+?)['"]\s*=>\s*sub\s*\{/);

            if (subtestMatch) {
                const name = subtestMatch[1];
                const currentPath = nestingStack.map(item => item.info.name);

                const subtestInfo: SubtestInfo = {
                    name: name,
                    line: i,
                    path: currentPath,
                    isTestClassMethod: false
                };

                subtests.push(subtestInfo);

                // Push to stack with current brace level
                nestingStack.push({
                    info: subtestInfo,
                    braceLevel: totalBraceCount + netBraces
                });
            }

            // Update total brace count
            totalBraceCount += netBraces;

            // Pop from stack when we exit blocks
            while (nestingStack.length > 0) {
                const lastItem = nestingStack[nestingStack.length - 1];
                if (totalBraceCount <= lastItem.braceLevel - 1) {
                    nestingStack.pop();
                } else {
                    break;
                }
            }
        }

        return subtests;
    }
}
