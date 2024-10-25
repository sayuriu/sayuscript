import { Token, TokenKind } from "./token.ts";
import { Nullable } from "./util.ts";
import { Keywords, tryResolveKeyword } from './keywords.ts';
import { AstNode } from "./astNode.ts";
import type { Statement } from "./statements.ts";
import type { Visitor } from "./visitor.ts";

export class Program extends AstNode {
    constructor(public body: Statement[]) {
        if (!body.length) {
            super([0, 0]);
            return this;
        }
        const firstExpr = body[0];
        const lastExpr = body.at(-1)!;
        super([
            firstExpr.tokenSpan[0],
            lastExpr.tokenSpan[1]
        ]);
    }

    override accept<T>(visitor: Visitor<T>): T {
        return visitor.visitProgram(this);
    }
}

export class Identifier extends AstNode {
    /** The keyword that the identifier represents. */
    public readonly keyword: Nullable<Keywords>;
    /** The name of the identifier. */
    public readonly name: string;
    constructor(token: Token) {
        if (token.type !== TokenKind.Ident) {
            throw new Error(`Expected an identifier token, got \`${TokenKind[token.type]}\``);
        }
        super([token.tokenPos, token.tokenPos + 1]);
        this.name = token.content;
        this.keyword = tryResolveKeyword(token.content);
    }
    isKeyword(): this is Keyword {
        return this.keyword !== null;
    }

    override accept<T>(visitor: Visitor<T>): T {
        return visitor.visitIdentifier(this);
    }
}

export type Keyword = Identifier & { keyword: Keywords };

