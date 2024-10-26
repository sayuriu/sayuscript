# pseudocode
I'm just tired of writing my notes without syntax highlighting.

As of now, only the generation of AST is available.
For current grammar structure, see `syntax.actual` file.

## Usage
```
deno run main.ts [subcommand] [options] <path/to/file>
```
To see help menu, run `main.ts` without any arguments.
eg.
```
deno run main.ts parse example.sayu
```

## Testing
```
deno test
```