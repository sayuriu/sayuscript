# pseudocode
I'm just tired of writing my notes without syntax highlighting.

As of now, only the generation of AST is available.
For current grammar structure, see `syntax.actual` file.

## Usage
```
deno run --allow-read main.ts --test <relative/path/to/script/file>
```
eg.
```
deno run --allow-read main.ts --test test.sayu>
```

## Testing
```
deno test
```