import { describe, it, expect, beforeEach } from 'vitest';
import { buildTestCommand, TestExecutionContext } from './commandBuilder';

describe('buildTestCommand', () => {
    let baseContext: TestExecutionContext;

    beforeEach(() => {
        baseContext = {
            filePath: '/path/to/test.t',
            relativeFilePath: 't/test.t',
            proveCommand: 'prove -lv',
        };
    });

    describe('simple prove command', () => {
        it('should build command without filters', () => {
            const result = buildTestCommand(baseContext);

            expect(result.command).toBe('prove -lv t/test.t');
            expect(result.displayCommand).toBe('prove -lv t/test.t');
            expect(result.env.TEST_METHOD).toBeUndefined();
            expect(result.env.SUBTEST_FILTER).toBeUndefined();
        });

        it('should build command with SUBTEST_FILTER', () => {
            const context: TestExecutionContext = {
                ...baseContext,
                subtestFilter: 'my subtest',
            };

            const result = buildTestCommand(context);

            expect(result.command).toBe('prove -lv t/test.t');
            expect(result.displayCommand).toBe("SUBTEST_FILTER='my subtest' prove -lv t/test.t");
            expect(result.env.SUBTEST_FILTER).toBe('my subtest');
            expect(result.env.TEST_METHOD).toBeUndefined();
        });

        it('should build command with TEST_METHOD', () => {
            const context: TestExecutionContext = {
                ...baseContext,
                testMethod: 'test_foo',
            };

            const result = buildTestCommand(context);

            expect(result.command).toBe('prove -lv t/test.t');
            expect(result.displayCommand).toBe("TEST_METHOD='test_foo' prove -lv t/test.t");
            expect(result.env.TEST_METHOD).toBe('test_foo');
            expect(result.env.SUBTEST_FILTER).toBeUndefined();
        });

        it('should build command with both TEST_METHOD and SUBTEST_FILTER', () => {
            const context: TestExecutionContext = {
                ...baseContext,
                testMethod: 'test_foo',
                subtestFilter: 'nested subtest',
            };

            const result = buildTestCommand(context);

            expect(result.command).toBe('prove -lv t/test.t');
            expect(result.displayCommand).toBe("TEST_METHOD='test_foo' SUBTEST_FILTER='nested subtest' prove -lv t/test.t");
            expect(result.env.TEST_METHOD).toBe('test_foo');
            expect(result.env.SUBTEST_FILTER).toBe('nested subtest');
        });

        it('should handle nested subtest paths', () => {
            const context: TestExecutionContext = {
                ...baseContext,
                subtestFilter: 'outer inner deep',
            };

            const result = buildTestCommand(context);

            expect(result.command).toBe('prove -lv t/test.t');
            expect(result.displayCommand).toBe("SUBTEST_FILTER='outer inner deep' prove -lv t/test.t");
            expect(result.env.SUBTEST_FILTER).toBe('outer inner deep');
        });

        it('should handle non-ASCII characters in test names', () => {
            const context: TestExecutionContext = {
                ...baseContext,
                testMethod: 'テストメソッド',
            };

            const result = buildTestCommand(context);

            expect(result.command).toBe('prove -lv t/test.t');
            expect(result.displayCommand).toBe("TEST_METHOD='テストメソッド' prove -lv t/test.t");
            expect(result.env.TEST_METHOD).toBe('テストメソッド');
        });
    });

    describe('carton command', () => {
        beforeEach(() => {
            baseContext.proveCommand = 'carton exec -- prove -lv';
        });

        it('should build carton command with SUBTEST_FILTER', () => {
            const context: TestExecutionContext = {
                ...baseContext,
                subtestFilter: 'my test',
            };

            const result = buildTestCommand(context);

            expect(result.command).toBe('carton exec -- prove -lv t/test.t');
            expect(result.displayCommand).toBe("SUBTEST_FILTER='my test' carton exec -- prove -lv t/test.t");
            expect(result.env.SUBTEST_FILTER).toBe('my test');
        });

        it('should build carton command with TEST_METHOD', () => {
            const context: TestExecutionContext = {
                ...baseContext,
                testMethod: 'test_bar',
            };

            const result = buildTestCommand(context);

            expect(result.command).toBe('carton exec -- prove -lv t/test.t');
            expect(result.displayCommand).toBe("TEST_METHOD='test_bar' carton exec -- prove -lv t/test.t");
            expect(result.env.TEST_METHOD).toBe('test_bar');
        });
    });

    describe('docker exec command', () => {
        beforeEach(() => {
            baseContext.proveCommand = 'docker exec app prove -lv';
        });

        it('should build docker exec command without filters', () => {
            const result = buildTestCommand(baseContext);

            expect(result.command).toBe('docker exec app env  prove -lv t/test.t');
            expect(result.displayCommand).toBe('docker exec app env  prove -lv t/test.t');
        });

        it('should build docker exec command with SUBTEST_FILTER', () => {
            const context: TestExecutionContext = {
                ...baseContext,
                subtestFilter: 'my test',
            };

            const result = buildTestCommand(context);

            expect(result.command).toBe("docker exec app env SUBTEST_FILTER='my test' prove -lv t/test.t");
            expect(result.displayCommand).toBe("docker exec app env SUBTEST_FILTER='my test' prove -lv t/test.t");
            expect(result.env.SUBTEST_FILTER).toBe('my test');
        });

        it('should build docker exec command with TEST_METHOD', () => {
            const context: TestExecutionContext = {
                ...baseContext,
                testMethod: 'test_method',
            };

            const result = buildTestCommand(context);

            expect(result.command).toBe("docker exec app env TEST_METHOD='test_method' prove -lv t/test.t");
            expect(result.displayCommand).toBe("docker exec app env TEST_METHOD='test_method' prove -lv t/test.t");
            expect(result.env.TEST_METHOD).toBe('test_method');
        });

        it('should build docker exec command with both TEST_METHOD and SUBTEST_FILTER', () => {
            const context: TestExecutionContext = {
                ...baseContext,
                testMethod: 'test_foo',
                subtestFilter: 'inner test',
            };

            const result = buildTestCommand(context);

            expect(result.command).toBe("docker exec app env TEST_METHOD='test_foo' SUBTEST_FILTER='inner test' prove -lv t/test.t");
            expect(result.displayCommand).toBe("docker exec app env TEST_METHOD='test_foo' SUBTEST_FILTER='inner test' prove -lv t/test.t");
            expect(result.env.TEST_METHOD).toBe('test_foo');
            expect(result.env.SUBTEST_FILTER).toBe('inner test');
        });
    });

    describe('docker compose exec command', () => {
        beforeEach(() => {
            baseContext.proveCommand = 'docker compose exec app prove -lv';
        });

        it('should build docker compose exec command with SUBTEST_FILTER', () => {
            const context: TestExecutionContext = {
                ...baseContext,
                subtestFilter: 'test name',
            };

            const result = buildTestCommand(context);

            expect(result.command).toBe("docker compose exec app env SUBTEST_FILTER='test name' prove -lv t/test.t");
            expect(result.displayCommand).toBe("docker compose exec app env SUBTEST_FILTER='test name' prove -lv t/test.t");
            expect(result.env.SUBTEST_FILTER).toBe('test name');
        });

        it('should build docker compose exec command with TEST_METHOD', () => {
            const context: TestExecutionContext = {
                ...baseContext,
                testMethod: 'my_test',
            };

            const result = buildTestCommand(context);

            expect(result.command).toBe("docker compose exec app env TEST_METHOD='my_test' prove -lv t/test.t");
            expect(result.displayCommand).toBe("docker compose exec app env TEST_METHOD='my_test' prove -lv t/test.t");
            expect(result.env.TEST_METHOD).toBe('my_test');
        });
    });

    describe('docker-compose exec command (with hyphen)', () => {
        beforeEach(() => {
            baseContext.proveCommand = 'docker-compose exec app carton exec -- prove -lv';
        });

        it('should build docker-compose exec command with SUBTEST_FILTER', () => {
            const context: TestExecutionContext = {
                ...baseContext,
                subtestFilter: 'some test',
            };

            const result = buildTestCommand(context);

            expect(result.command).toBe("docker-compose exec app env SUBTEST_FILTER='some test' carton exec -- prove -lv t/test.t");
            expect(result.displayCommand).toBe("docker-compose exec app env SUBTEST_FILTER='some test' carton exec -- prove -lv t/test.t");
            expect(result.env.SUBTEST_FILTER).toBe('some test');
        });

        it('should build docker-compose exec command with TEST_METHOD', () => {
            const context: TestExecutionContext = {
                ...baseContext,
                testMethod: 'test_something',
            };

            const result = buildTestCommand(context);

            expect(result.command).toBe("docker-compose exec app env TEST_METHOD='test_something' carton exec -- prove -lv t/test.t");
            expect(result.displayCommand).toBe("docker-compose exec app env TEST_METHOD='test_something' carton exec -- prove -lv t/test.t");
            expect(result.env.TEST_METHOD).toBe('test_something');
        });

        it('should build docker-compose exec with carton and both filters', () => {
            const context: TestExecutionContext = {
                ...baseContext,
                testMethod: 'test_bar',
                subtestFilter: 'nested',
            };

            const result = buildTestCommand(context);

            expect(result.command).toBe("docker-compose exec app env TEST_METHOD='test_bar' SUBTEST_FILTER='nested' carton exec -- prove -lv t/test.t");
            expect(result.displayCommand).toBe("docker-compose exec app env TEST_METHOD='test_bar' SUBTEST_FILTER='nested' carton exec -- prove -lv t/test.t");
            expect(result.env.TEST_METHOD).toBe('test_bar');
            expect(result.env.SUBTEST_FILTER).toBe('nested');
        });
    });

    describe('edge cases', () => {
        it('should handle quotes in test names', () => {
            const context: TestExecutionContext = {
                ...baseContext,
                subtestFilter: "test with 'quotes'",
            };

            const result = buildTestCommand(context);

            expect(result.env.SUBTEST_FILTER).toBe("test with 'quotes'");
        });

        it('should handle special characters in test names', () => {
            const context: TestExecutionContext = {
                ...baseContext,
                testMethod: 'test_with_$pecial_chars',
            };

            const result = buildTestCommand(context);

            expect(result.env.TEST_METHOD).toBe('test_with_$pecial_chars');
        });
    });
});
