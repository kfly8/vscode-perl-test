# Test2 Subtest Filter - VSCode Extension

VSCode extension for running individual Perl subtests using [Test2::Plugin::SubtestFilter](https://metacpan.org/pod/Test2::Plugin::SubtestFilter).

## Requirements

- **Perl** (5.16 or later recommended)
- **prove** command available in your PATH (usually comes with Perl)
- **Test2::Plugin::SubtestFilter** - using this plugin

## Configuration

### Settings

- `test2SubtestFilter.proveCommand`: Command to run prove (default: `"prove"`)
  - For Carton projects: `"carton exec prove"`
  - For custom Perl: `"/path/to/perl -S prove"`

- `test2SubtestFilter.proveArgs`: Default arguments for prove (default: `["-lv"]`)
  - `-l`: Add `lib` to `@INC`
  - `-v`: Verbose output

### Example Settings

Add to your workspace or user `.vscode/settings.json`:

```json
{
  "test2SubtestFilter.proveCommand": "carton exec prove",
  "test2SubtestFilter.proveArgs": ["-lv", "--merge"]
}
```

## License

MIT

## Credits

Created for use with [Test2::Plugin::SubtestFilter](https://metacpan.org/pod/Test2::Plugin::SubtestFilter).
