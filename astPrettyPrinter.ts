// This is an AST printer that follows
// http://i.stanford.edu/pub/cstr/reports/cs/tr/79/770/CS-TR-79-770.pdf

import { ident } from "./tests/util.ts";
import { TokenKind, type Token } from "./token.ts";
import type { CompilerTokenizer } from "./tokenizer.ts";
import { todo, type Nullable } from "./util.ts";
import type { Visitor } from "./visitor.ts";

enum PPTokenKind {
    String,
    Break,
    Start,
    End
}

type PPToken = {
    inner: Token,
    kind: PPTokenKind,
    size: number
}

const MIN_SPACE = 60;

export class PrettyAstPrinter {
    private spaces = 0;
    private leftTotal = 0;
    private rightTotal = 0;
    private indentLevel = 0;
    private pendingIndent = 0;
    private scanStack: PPToken[] = [];
    private printStack: PPToken[] = [];
    private buffer: PPToken[] = [];
    private lastToken: Nullable<PPToken> = null;

    constructor(
        private paddingSpaces = 2,
        private readonly lineWidth = 80,
        private outputStream: Nullable<WritableStream> = null
    ) {
        this.spaces = lineWidth;
    }
    transform(tokenStream: Token[]): PPToken[]
    {
        return todo!("PrettyAstPrinter.transform");
//         return tokenStream.map((token) => {
//             let kind: PPTokenKind;
//
//             //! Problem: This does not encode blanks
//             //? We could preprocess the token stream before pretty printing
//             //? It requires its own tokenizer?
//             switch (token.type) {
//
//             }
//         });
    }
    scan(tokenizer: CompilerTokenizer) {
        let token: Nullable<Token>;
        while (true) {
            token = tokenizer.nextToken();
            switch (token.type) {
                case TokenKind.Eof: return;

            }
        }
    }
    print(token: PPToken) {
        switch (token.kind) {
            case PPTokenKind.String: {
                this.output(token.inner.content);
                this.spaces -= token.size;
                break;
            }
            case PPTokenKind.Break: {
                if (token.size > this.spaces) {
                    this.spaces = this.printStack.at(-1)?.size ?? 0;
                    this.indent(this.lineWidth - this.spaces);
                }
                else {
                    this.output(token.inner.content);
                    this.spaces -= 1;
                }
                break;
            }
            case PPTokenKind.Start: {
                this.scanStack.push(token);
                break;
            }
            case PPTokenKind.End: {
                this.scanStack.pop();
                break;
            }
        }
    }
    output(str: string) {
    }
    indent(offset: number) {
    }
}