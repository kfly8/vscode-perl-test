# Test2 Subtest Filter - VSCode Extension

VSCode extension for running individual Perl subtests using [Test2::Plugin::SubtestFilter](https://metacpan.org/pod/Test2::Plugin::SubtestFilter).

Run subtests directly from your editor with visual feedback!

<img width="600" alt="image" src="https://github.com/user-attachments/assets/7fa62c56-8430-4b26-a067-23a02ca5afb8" />

## Features

- **Gutter Decorations**: Test status icons (✓/✗/⚪) appear in the editor gutter
- **Inline Run Buttons**: Hover over any subtest line to see a ▶ button for instant test execution
- **ANSI Color Support**: Full color output with Test2::Formatter::Cute and other formatters
- **Automatic Discovery**: Tests are automatically detected when you open `.t` files
- **Real-time Updates**: File watcher keeps test list synchronized
- **No Extra UI**: Run tests directly from the editor without opening Test Explorer

## Requirements

- **Perl** (5.16 or later recommended)
- **prove** command available in your PATH (usually comes with Perl)
- **Test2::Plugin::SubtestFilter** - Install this plugin in your project

```bash
cpanm Test2::Plugin::SubtestFilter
# or
carton install Test2::Plugin::SubtestFilter
```

## Configuration

### Settings

- `test2SubtestFilter.proveCommand`: Full command to run prove with arguments (default: `"prove -lv"`)

### Example Settings

Add to your workspace or user `.vscode/settings.json`:

**Simple:**
```json
{
  "test2SubtestFilter.proveCommand": "prove -lv"
}
```

**With Carton:**
```json
{
  "test2SubtestFilter.proveCommand": "carton exec -- prove -lv"
}
```

**With Docker Compose:**
```json
{
  "test2SubtestFilter.proveCommand": "docker compose exec app carton exec -- prove -lv"
}
```

**With Custom Formatter:**
```json
{
  "test2SubtestFilter.proveCommand": "T2_FORMATTER=Cute prove -lv"
}
```

## Usage

1. Open any Perl test file (`.t`)
2. Subtest status icons appear in the gutter (left of line numbers)
3. Hover over a subtest line to see the ▶ run button
4. Click to run that specific subtest
5. View colored output in the Test Results panel

## License

MIT

## Credits

Created for use with [Test2::Plugin::SubtestFilter](https://metacpan.org/pod/Test2::Plugin::SubtestFilter).
