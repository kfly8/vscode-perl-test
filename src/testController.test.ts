import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { Test2SubtestController } from './testController';

// Mock vscode module
vi.mock('vscode', () => {
    const createMockTestController = () => ({
        items: new Map(),
        createTestItem: vi.fn(),
        createRunProfile: vi.fn(),
        dispose: vi.fn(),
    });

    return {
        tests: {
            createTestController: vi.fn(() => createMockTestController()),
        },
        workspace: {
            createFileSystemWatcher: vi.fn(() => ({
                onDidCreate: vi.fn(),
                onDidChange: vi.fn(),
                onDidDelete: vi.fn(),
            })),
            onDidOpenTextDocument: vi.fn(),
            textDocuments: [],
        },
        TestRunProfileKind: {
            Run: 1,
        },
        Uri: {
            file: (path: string) => ({ fsPath: path }),
        },
    };
});

describe('Test2SubtestController', () => {
    describe('findSubtests', () => {
        let controller: Test2SubtestController;
        let mockContext: vscode.ExtensionContext;

        beforeEach(() => {
            mockContext = {
                subscriptions: [],
            } as unknown as vscode.ExtensionContext;
            controller = new Test2SubtestController(mockContext);
        });

        it('should find simple subtest declaration', () => {
            const document = createMockDocument(`
use Test2::V0;

subtest 'basic test' => sub {
    ok 1;
};

done_testing;
`);

            const subtests = (controller as any).findSubtests(document);

            expect(subtests).toHaveLength(1);
            expect(subtests[0]).toEqual({
                name: 'basic test',
                line: 3,
                path: [],
                isTestClassMethod: false,
            });
        });

        it('should find subtest with bare word', () => {
            const document = createMockDocument(`
use Test2::V0;

subtest foo => sub {
    ok 1;
};

done_testing;
`);

            const subtests = (controller as any).findSubtests(document);

            expect(subtests).toHaveLength(1);
            expect(subtests[0]).toEqual({
                name: 'foo',
                line: 3,
                path: [],
                isTestClassMethod: false,
            });
        });

        it('should find nested subtests', () => {
            const document = createMockDocument(`
use Test2::V0;

subtest 'outer' => sub {
    subtest 'inner' => sub {
        ok 1;
    };
};

done_testing;
`);

            const subtests = (controller as any).findSubtests(document);

            expect(subtests).toHaveLength(2);
            expect(subtests[0]).toEqual({
                name: 'outer',
                line: 3,
                path: [],
                isTestClassMethod: false,
            });
            expect(subtests[1]).toEqual({
                name: 'inner',
                line: 4,
                path: ['outer'],
                isTestClassMethod: false,
            });
        });

        it('should find Test::Class method', () => {
            const document = createMockDocument(`
package MyTest;
use Test::Class::Most;

sub test_method : Tests {
    ok 1;
}

1;
`);

            const subtests = (controller as any).findSubtests(document);

            expect(subtests).toHaveLength(1);
            expect(subtests[0]).toEqual({
                name: 'test_method',
                line: 4,
                path: [],
                isTestClassMethod: true,
            });
        });

        it('should find Test::Class method with non-ASCII characters', () => {
            const document = createMockDocument(`
package MyTest;
use Test::Class::Most;

sub テストメソッド : Tests {
    ok 1;
}

1;
`);

            const subtests = (controller as any).findSubtests(document);

            expect(subtests).toHaveLength(1);
            expect(subtests[0]).toEqual({
                name: 'テストメソッド',
                line: 4,
                path: [],
                isTestClassMethod: true,
            });
        });

        it('should find Test::Class method with single "Test" attribute', () => {
            const document = createMockDocument(`
package MyTest;
use Test::Class::Most;

sub single_test : Test {
    ok 1;
}

1;
`);

            const subtests = (controller as any).findSubtests(document);

            expect(subtests).toHaveLength(1);
            expect(subtests[0]).toEqual({
                name: 'single_test',
                line: 4,
                path: [],
                isTestClassMethod: true,
            });
        });

        it('should find subtest inside Test::Class method', () => {
            const document = createMockDocument(`
package MyTest;
use Test::Class::Most;

sub test_method : Tests {
    subtest 'nested' => sub {
        ok 1;
    };
}

1;
`);

            const subtests = (controller as any).findSubtests(document);

            expect(subtests).toHaveLength(2);
            expect(subtests[0]).toEqual({
                name: 'test_method',
                line: 4,
                path: [],
                isTestClassMethod: true,
            });
            expect(subtests[1]).toEqual({
                name: 'nested',
                line: 5,
                path: ['test_method'],
                isTestClassMethod: false,
            });
        });

        it('should handle deeply nested subtests', () => {
            const document = createMockDocument(`
use Test2::V0;

subtest 'level1' => sub {
    subtest 'level2' => sub {
        subtest 'level3' => sub {
            ok 1;
        };
    };
};

done_testing;
`);

            const subtests = (controller as any).findSubtests(document);

            expect(subtests).toHaveLength(3);
            expect(subtests[0]).toEqual({
                name: 'level1',
                line: 3,
                path: [],
                isTestClassMethod: false,
            });
            expect(subtests[1]).toEqual({
                name: 'level2',
                line: 4,
                path: ['level1'],
                isTestClassMethod: false,
            });
            expect(subtests[2]).toEqual({
                name: 'level3',
                line: 5,
                path: ['level1', 'level2'],
                isTestClassMethod: false,
            });
        });

        it('should handle multiple Test::Class methods', () => {
            const document = createMockDocument(`
package MyTest;
use Test::Class::Most;

sub test_one : Tests {
    ok 1;
}

sub test_two : Tests {
    ok 1;
}

1;
`);

            const subtests = (controller as any).findSubtests(document);

            expect(subtests).toHaveLength(2);
            expect(subtests[0]).toEqual({
                name: 'test_one',
                line: 4,
                path: [],
                isTestClassMethod: true,
            });
            expect(subtests[1]).toEqual({
                name: 'test_two',
                line: 8,
                path: [],
                isTestClassMethod: true,
            });
        });
    });
});

// Helper function to create a mock document
function createMockDocument(text: string): vscode.TextDocument {
    return {
        getText: () => text,
        lineCount: text.split('\n').length,
        uri: { fsPath: '/test/file.t' } as vscode.Uri,
    } as vscode.TextDocument;
}
