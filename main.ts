import { inspect } from "node:util";
import { lexer } from "./tokenizer.ts";
import { Parser } from "./parser.ts";

const args = Deno.args;
while (args.length > 0) {
    const arg = args.shift();
    if (arg === "--test") {
        const sourceInput = Deno.readTextFileSync(args.shift());
        const tokens = lexer(sourceInput);
        console.log(tokens.map(t => t && t.toString()).join('\n'));

        const parser = new Parser(tokens)
        const ast = parser.parse()
        console.log(inspect(ast, { depth: null, colors: true }));
        console.log(JSON.parse(JSON.stringify(ast, null, 2)));
        break;
    }
    throw new Error(`Unknown argument: ${arg}`);
}