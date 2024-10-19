import { inspect } from "node:util";
import { lexer } from "./lexer";
import { GrammarParser2 } from './grammarAst2';
import { readFileSync } from "node:fs";
import { ASTGrammarParser } from "./grammarAst";

const sourceInput = readFileSync('./test.sayu', 'utf-8');

function run(sourceInput: string) {
    const tokens = lexer(sourceInput);
    console.log(tokens.map(t => t && t.toString()))

    // const ast = new ASTGrammarParser(tokens)
    const ast2 = new GrammarParser2(tokens)
    // console.log(inspect(ast.parse(), { depth: null, colors: true }));
    console.log(inspect(ast2.parse(), { depth: null, colors: true }));
}

run(sourceInput);