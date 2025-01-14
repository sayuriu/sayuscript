import { assertEquals } from "@std/assert";
import { Identifier } from "../astNodes.ts";
import { Expression, BinaryExpr, UnaryExpr, Literal, FnCallExpr, TupleExpr, FnExpr, BlockExpr, ImmediateCallExpr } from "../expression.ts";
import { Keywords, KeywordMapping } from "../keywords.ts";
import { Operator, Operations, OperationMapping } from "../operators.ts";
import { Parser } from "../parser.ts";
import { TokenKind, Token, NumberLiteralKind, NumberToken } from "../token.ts";
import { Tokenizer } from "../tokenizer.ts";
import type { CharSpan, Nullable, TokenSpan } from "../util.ts";
import { VariableDeclarationStatement, ExpressionStatement, Statement, FnKind } from "../statements.ts";

export function token(
    kind: TokenKind,
    content: string,
    span: CharSpan,
    tokenPos: number
) {
    return new Token(kind, content, span, tokenPos);
}

export function number(
    kind: TokenKind.IntLiteral | TokenKind.FloatLiteral,
    mode: NumberLiteralKind,
    value: string,
    startPos = 0,
    tokenPos = 0,
) {
    return new NumberToken(kind, mode, value, [startPos, startPos + value.length], tokenPos);
}

export const int = number.bind(null, TokenKind.IntLiteral);
export const float = number.bind(null, TokenKind.FloatLiteral, NumberLiteralKind.Decimal);

export type NumberTokenCtorFn = (value: string, startPos: number, tokenPos: number) => NumberToken;
export const dec: NumberTokenCtorFn = int.bind(null, NumberLiteralKind.Decimal);
export const hex: NumberTokenCtorFn = int.bind(null, NumberLiteralKind.Hex);
export const oct: NumberTokenCtorFn = int.bind(null, NumberLiteralKind.Octal);
export const bin: NumberTokenCtorFn = int.bind(null, NumberLiteralKind.Binary);

export function ident(name: string, startPos = 0, tokenPos = 0) {
    return new Identifier(token(TokenKind.Ident, name, [startPos, startPos + name.length], tokenPos));
}

export function op(operator: Operations, tokenSpan: TokenSpan, tokenPos = 0) {
    const reversed = OperationMapping.get(operator);
    if (!reversed) {
        throw new Error(`Could not resolve operator ${Operations[operator]}`);
    }
    return new Operator(
        reversed in Keywords ?
            token(TokenKind.Ident, KeywordMapping.get(reversed as Keywords)!, tokenSpan, tokenPos)
            : token(reversed as TokenKind, TokenKind[reversed], tokenSpan, tokenPos)
    )
}

export const lit = (token: Token) => new Literal(token);
export const tuple =
    (tokenSpan: TokenSpan, exprs: Expression[]) =>
    new TupleExpr(exprs, tokenSpan);
export const unary = (operator: Operator, expr: Expression) => new UnaryExpr(operator, expr);
export const binary =
    (left: Expression, operator: Operator, right: Expression) =>
    new BinaryExpr(left, operator, right)

export const fn =
    (tokenSpan: TokenSpan, kind: FnKind, ident: Nullable<Identifier>, params: Identifier[], body: BlockExpr | Expression) =>
    new FnExpr(ident, params, body, tokenSpan, kind);
export const call =
    (tokenSpan: TokenSpan, ident: Identifier, args: Expression[]) =>
    new FnCallExpr(ident, args, tokenSpan);
export const immCall =
    (tokenSpan: TokenSpan, fnValue: Expression, args: Expression[]) =>
    new ImmediateCallExpr(fnValue, args, tokenSpan);

export const varStmt = (tokenSpan: TokenSpan, mutable: boolean, ident: Identifier, value: Expression) =>
    new VariableDeclarationStatement(mutable, ident, value, tokenSpan);

export const exprStmt = (expr: Expression) => new ExpressionStatement(expr);

export const block = (body: (Statement | Expression)[], span: TokenSpan, nonEmpty = false) => new BlockExpr(body, span, nonEmpty);


export interface TestCase<T> {
    input: string;
    expected: T;
}

export function testCase<T>(input: string, expected: T): TestCase<T> {
    return { input, expected };
}

export function testValidCasesForExprParser(cases: TestCase<Expression>[])
{
    for (const { input, expected } of cases)
    {
        const tokens = [...new Tokenizer(input)];
        const parser = new Parser(tokens);
        Deno.test(`parser.Expression() parses '${input}' correctly`, () => {
            assertEquals(parser.Expression(), expected);
        });
    }
}