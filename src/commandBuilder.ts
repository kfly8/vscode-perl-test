/**
 * Build command to execute a Perl test with proper environment variables
 */
export interface TestExecutionContext {
    filePath: string;
    relativeFilePath: string;
    testMethod?: string;
    subtestFilter?: string;
    proveCommand: string;
}

export interface CommandResult {
    command: string;
    displayCommand: string;
    env: NodeJS.ProcessEnv;
}

export function buildTestCommand(context: TestExecutionContext): CommandResult {
    const { relativeFilePath, testMethod, subtestFilter, proveCommand } = context;

    // Build environment variables for both TEST_METHOD and SUBTEST_FILTER
    const envVars: string[] = [];
    const env = { ...process.env };

    if (testMethod) {
        env.TEST_METHOD = testMethod;
        envVars.push(`TEST_METHOD='${testMethod}'`);
    }
    if (subtestFilter) {
        env.SUBTEST_FILTER = subtestFilter;
        envVars.push(`SUBTEST_FILTER='${subtestFilter}'`);
    }

    // Check if this is a docker command
    const dockerExecMatch = proveCommand.match(/^(docker[\s-]compose\s+exec|docker\s+exec)\s+(\S+)\s+(.*)$/i);

    let finalCommand: string;
    let displayCommand: string;

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
        displayCommand = finalCommand;
    } else {
        finalCommand = `${proveCommand} ${relativeFilePath}`;
        const envPrefix = envVars.length > 0 ? envVars.join(' ') + ' ' : '';
        displayCommand = `${envPrefix}${finalCommand}`;
    }

    return {
        command: finalCommand,
        displayCommand,
        env,
    };
}
