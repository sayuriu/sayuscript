import { inspect } from "node:util";
import { Tokenizer } from "./tokenizer.ts";
import { Parser } from "./parser.ts";

const args = Deno.args;
while (args.length > 0) {
    const arg = args.shift();
    if (arg === "--test") {
        const file = args.shift();
        if (!file) {
            throw new Error("Missing file argument");
        }
        const sourceInput = Deno.readTextFileSync(file);
        const tokens = new Tokenizer(sourceInput).tokenize();
        console.log(tokens);

        const parser = new Parser(tokens)
        const ast = parser.parse()
        console.log(inspect(Object.assign({}, ast), { depth: null, colors: true }));
        // console.log(JSON.parse(JSON.stringify(ast, null, 2)));
        break;
    }
    throw new Error(`Unknown argument: ${arg}`);
}