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
        token: vscode.CancellationToken
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

        // Track nesting level using brace counting
        const nestingStack: SubtestInfo[] = [];
        let braceCount = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Match subtest declarations with various quote styles
            // Supports: subtest 'name' => sub { ... }
            //          subtest "name" => sub { ... }
            //          subtest q{name} => sub { ... }
            const subtestMatch = line.match(/^\s*subtest\s+['"](.+?)['"]\s*=>\s*sub\s*\{/);

            if (subtestMatch) {
                const name = subtestMatch[1];
                const currentPath = nestingStack.map(s => s.name);

                const subtestInfo: SubtestInfo = {
                    name: name,
                    line: i,
                    path: currentPath
                };

                subtests.push(subtestInfo);
                nestingStack.push(subtestInfo);
            }

            // Count braces to track nesting
            const openBraces = (line.match(/\{/g) || []).length;
            const closeBraces = (line.match(/\}/g) || []).length;
            braceCount += openBraces - closeBraces;

            // Pop from stack when we exit a subtest block
            // We need to track when the subtest's sub block closes
            if (nestingStack.length > 0 && closeBraces > 0) {
                // Simple heuristic: if we see closing braces and the brace count
                // has decreased significantly, we may have exited a subtest
                while (nestingStack.length > 0 && braceCount <= 0) {
                    nestingStack.pop();
                    if (nestingStack.length > 0) {
                        // Recalculate brace count relative to parent
                        braceCount = 1; // Reset for next level
                    }
                }
            }
        }

        return subtests;
    }

    public refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }
}
