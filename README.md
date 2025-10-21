# Test2 Subtest Filter - VSCode Extension

VSCode extension for running individual Perl subtests using [Test2::Plugin::SubtestFilter](https://metacpan.org/pod/Test2::Plugin::SubtestFilter).

## Features

- **CodeLens Integration**: Displays "▶ Run Subtest" buttons above each subtest in `.t` files
- **Individual Subtest Execution**: Run specific subtests by clicking the CodeLens button
- **Nested Subtest Support**: Handles nested subtests with proper path resolution
- **UTF-8 Support**: Works with Japanese text, emojis, and other Unicode characters in subtest names
- **Configurable Prove Command**: Customize how `prove` is executed

## Requirements

- Perl with [Test2::Plugin::SubtestFilter](https://metacpan.org/pod/Test2::Plugin::SubtestFilter) installed
- `prove` command available in your PATH

## Installation

### From Source

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to compile TypeScript
4. Press F5 in VSCode to launch the extension in development mode

### From VSIX

1. Package the extension: `vsce package`
2. Install: `code --install-extension test2-subtest-filter-0.0.1.vsix`

## Usage

1. Open a Perl test file (`.t` extension)
2. Look for "▶ Run Subtest" CodeLens above each `subtest` declaration
3. Click the button to run that specific subtest
4. View results in the "Test2 Subtest Filter" output channel

### Example Test File

```perl
use Test2::V0;
use Test2::Plugin::SubtestFilter;

subtest 'basic test' => sub {
    ok 1, 'simple test';
};

subtest 'parent' => sub {
    subtest 'child' => sub {
        ok 1, 'nested test';
    };
};

subtest 'ネストされた arithmetic' => sub {
    is 1 + 1, 2, 'addition works';
};

subtest '🎉 emoji test' => sub {
    ok 1, 'emoji in subtest name';
};

done_testing;
```

## Configuration

### Settings

- `test2SubtestFilter.proveCommand`: Command to run prove (default: `"prove"`)
  - For Carton projects: `"carton exec prove"`
  - For custom Perl: `"/path/to/perl -S prove"`

- `test2SubtestFilter.proveArgs`: Default arguments for prove (default: `["-lv"]`)
  - `-l`: Add `lib` to `@INC`
  - `-v`: Verbose output

### Example Settings

Add to your `.vscode/settings.json`:

```json
{
  "test2SubtestFilter.proveCommand": "carton exec prove",
  "test2SubtestFilter.proveArgs": ["-lv"]
}
```

## How It Works

When you click "▶ Run Subtest", the extension:

1. Determines the full subtest path (e.g., "parent child" for nested subtests)
2. Sets the `SUBTEST_FILTER` environment variable to the subtest path
3. Runs: `SUBTEST_FILTER='subtest path' prove -lv path/to/test.t`
4. Displays output in the "Test2 Subtest Filter" output channel

## Supported Subtest Patterns

The extension detects:

- Single quotes: `subtest 'name' => sub { ... }`
- Double quotes: `subtest "name" => sub { ... }`
- Unicode characters: Japanese text, emojis, etc.
- Nested subtests: Tracks parent-child relationships

## Known Limitations

- Brace counting for nested subtests is heuristic-based
- Very complex code structures might not be detected correctly
- Only works with `subtest 'name' => sub {` pattern (not other variations)

## Development

### Build

```bash
npm install
npm run compile
```

### Watch Mode

```bash
npm run watch
```

### Package

```bash
npm install -g @vscode/vsce
vsce package
```

## Contributing

Issues and pull requests are welcome!

## License

MIT

## Credits

Created for use with [Test2::Plugin::SubtestFilter](https://metacpan.org/pod/Test2::Plugin::SubtestFilter).
