# Perl Test - VSCode Extension

Run Perl tests with ease - directly from your editor with visual feedback!

<img width="512" height="496" alt="cover" src="https://github.com/user-attachments/assets/0381129c-301b-4463-b0dc-477e0145bdf6" />

## Features

- **Gutter Decorations**: Test status icons (✓/✗) appear in the editor gutter
- **Selective Test Execution**: Run individual subtests or Test::Class methods

## Selective Test Execution

This extension enables selective test execution when using the following test modules:

- [Test2::Plugin::SubtestFilter](https://metacpan.org/pod/Test2::Plugin::SubtestFilter)
  - Filters subtests by name using the SUBTEST_FILTER environment variable
- [Test::Class](https://metacpan.org/pod/Test::Class)
  - Filters test methods using the TEST_METHOD environment variable
  
Both can be used together for fine-grained test selection.

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
  "test2SubtestFilter.proveCommand": "T2_FORMATTER=Cute perl -Ilib"
}
```

## License

MIT

## Credits

Supports [Test2::Plugin::SubtestFilter](https://metacpan.org/pod/Test2::Plugin::SubtestFilter) and Test::Class for selective test execution.
