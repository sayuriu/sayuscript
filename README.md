# pseudocode
I'm just tired of writing my notes without syntax highlighting.

As of now, only the generation of AST is available.
For current grammar structure, see `syntax.actual` file.

## Usage
To see help menu, run `main.ts` without any arguments.
```
deno run main.ts [options] <path/to/file>
```
eg.
```
deno run main.ts parse test.sayu
```

## Testing
```
deno test ./tests
```