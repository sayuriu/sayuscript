import { inspect } from "node:util";
import { Tokenizer } from "./tokenizer.ts";
import { Parser } from "./parser.ts";
import { SimpleAstPrinter } from "./astSimplePrinter.ts";
import type { Token } from "./token.ts";
import type { Program } from "./astNodes.ts";


function printHelp() {
    const help = [
        "Usage: deno run main.ts [subcommand] [options] <file>",
        "",
        "Subcommands:",
        "  parse              Parses the given file",
        "                     (unassumes --json)",
        "  tokens             Prints the lexer output",
        "  ast                Prints the AST",
        "  reconstruct        Reconstructs the source code from the AST",
        "                     (unassumes --json)",
        "  help               Prints this help message",
        "",
        "Options:",
        "  --verbose -v       Enables verbose mode (prints additional information)",
        "  --json             Outputs JSON format (-v is ignored)",
    ];
    console.log(help.join("\n"));
}

let args = Deno.args;
if (args.length === 0) {
    printHelp();
    Deno.exit(0);
}

const options = {
    verbose: false,
    json: false,
};

const rest: string[] = [];
for (const arg of args) {
    if (arg.startsWith("-")) {
        switch (arg) {
            case "--verbose":
            case "-v":
                options.verbose = true;
                break;
            case "--json":
                options.json = true;
                break;
            default:
                console.error(`Unknown option: ${arg}`);
                Deno.exit(1);
        }
    }
    else {
        rest.push(arg);
    }
}

args = rest;

function file() {
    const fileName = args.shift();
    if (!fileName) {
        console.error("Missing file argument");
        Deno.exit(1);
    }
    return Deno.readTextFileSync(fileName);
}

const subcommands = ["parse", "tokens", "ast", "reconstruct", "help"];

let subcommand = args.shift();
if (!subcommand)
{
    subcommand = "help";
}
else if (!subcommands.includes(subcommand)) {
    args.unshift(subcommand);
}

const source = file();
console.log(`Parsing tokens`);
const tokenizer = new Tokenizer(source);
const tokens = [...tokenizer];

function printTokens(tokens: Token[]) {
    if (options.json) {
        console.log(JSON.stringify(tokens, null, 4));
    } else {
        for (const token of tokens) {
            if (options.verbose) {
                console.log(token.fullString());
            }
            else {
                console.log(token.toString());
            }
        }
    }
}

function parseAst(tokens: Token[])
{
    console.log(`Parsing AST`);
    const parser = new Parser(tokens);
    return parser.parse();
}

function printAst(ast: Program)
{
    if (options.json) {
        console.log(JSON.stringify(ast, null, 4));
    } else {
        console.log(inspect(ast, false, null, options.verbose));
    }
    return ast;
}

switch (subcommand) {
    case "parse": {
        if (options.verbose)
            printTokens(tokens);
        const ast = parseAst(tokens);
        if (options.verbose)
            printAst(ast);
        const output = ast.accept(new SimpleAstPrinter());
        const targetFileName = args.shift();
        if (!targetFileName) {
            console.log(output);
        } else {
            console.log(`Writing to ${targetFileName}`);
            Deno.writeTextFileSync(targetFileName, output);
        }
        break;
    }
    case "ast": {
        printAst(parseAst(tokens));
        break;
    }
    case "tokens":
        printTokens(tokens);
        break;

    case "reconstruct": {
        const ast = parseAst(tokens);
        console.log(ast.accept(new SimpleAstPrinter()));
        break;
    }
    case "help": {
        printHelp();
        break;
    }
    default: {
        console.error(`Unknown subcommand: ${subcommand}`);
        Deno.exit(1);
    }
}
