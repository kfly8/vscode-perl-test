import * as vscode from 'vscode';

interface SubtestInfo {
    name: string;
    line: number;
    path: string[];
}

export class SubtestCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    public provideCodeLenses(
        document: vscode.TextDocument,
        _token: vscode.CancellationToken
    ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];
        const subtests = this.findSubtests(document);

        for (const subtest of subtests) {
            const range = new vscode.Range(subtest.line, 0, subtest.line, 0);
            const subtestPath = [...subtest.path, subtest.name].join(' ');

            codeLenses.push(
                new vscode.CodeLens(range, {
                    title: '▶ Run Subtest',
                    command: 'test2-subtest-filter.runSubtest',
                    arguments: [document.uri.fsPath, subtestPath]
                })
            );
        }

        return codeLenses;
    }

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

            // Match subtest declarations with various quote styles
            // Supports: subtest 'name' => sub { ... }
            //          subtest "name" => sub { ... }
            //          subtest q{name} => sub { ... }
            const subtestMatch = line.match(/^\s*subtest\s+['"](.+?)['"]\s*=>\s*sub\s*\{/);

            if (subtestMatch) {
                const name = subtestMatch[1];
                const currentPath = nestingStack.map(item => item.info.name);

                const subtestInfo: SubtestInfo = {
                    name: name,
                    line: i,
                    path: currentPath
                };

                subtests.push(subtestInfo);

                // Push to stack with current brace level
                // The subtest's own opening brace is included in openBraces
                nestingStack.push({
                    info: subtestInfo,
                    braceLevel: totalBraceCount + netBraces
                });
            }

            // Update total brace count
            totalBraceCount += netBraces;

            // Pop from stack when we exit subtest blocks
            while (nestingStack.length > 0) {
                const lastItem = nestingStack[nestingStack.length - 1];
                // If current brace level is less than or equal to the subtest's level,
                // we've exited that subtest
                if (totalBraceCount <= lastItem.braceLevel - 1) {
                    nestingStack.pop();
                } else {
                    break;
                }
            }
        }

        return subtests;
    }

    public refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }
}
