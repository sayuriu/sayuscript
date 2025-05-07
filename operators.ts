import { Keywords } from "./keywords.ts";
import { Token, TokenKind } from "./token.ts";
import { BidirectionalMap, NODE_INSPECT_SYMBOL, Nullable, tryWrapper } from "./util.ts";
import { resolveKeyword } from './keywords.ts';
import { AstNode } from "./astNode.ts";
import type { Visitor } from "./visitor.ts";

export enum Operations {
    Cast         , // Type cast operator (`a as b`)
    Add          , // `a + b`
    Subtract     , // `a - b`
    Multiply     , // `a * b`
    Divide       , // `a / b`
    Modulus      , // `a % b`
    Less         , // `a < b`
    LessEqual    , // `a <= b`
    Greater      , // `a > b`
    GreaterEqual , // `a >= b`
    BitAnd       , // `a & b`
    BitXor       , // `a ^ b`
    BitOr        , // `a | b`
    ShiftLeft    , // `a << b`
    ShiftRight   , // `a >> b`
    LAnd         , // `a && b`
    LOr          , // `a || b`
    LEqual       , // `a == b`
    LNotEqual    , // `a != b`
    Assign       , // `a = b`
    Not          , // `!a`
}

export const OperationMapping = new BidirectionalMap<Operations, TokenKind | Keywords>([
    [Operations.Cast          , Keywords.As],
    [Operations.Assign        , TokenKind.Eq],
    [Operations.Add           , TokenKind.Plus],
    [Operations.Subtract      , TokenKind.Minus],
    [Operations.Multiply      , TokenKind.Star],
    [Operations.Divide        , TokenKind.Slash],
    [Operations.Modulus       , TokenKind.Percent],
    [Operations.Less          , TokenKind.Lt],
    [Operations.LessEqual     , TokenKind.Le],
    [Operations.Greater       , TokenKind.Gt],
    [Operations.GreaterEqual  , TokenKind.Ge],
    [Operations.BitAnd        , TokenKind.And],
    [Operations.BitXor        , TokenKind.Caret],
    [Operations.BitOr         , TokenKind.Or],
    [Operations.ShiftLeft     , TokenKind.LtLt],
    [Operations.ShiftRight    , TokenKind.GtGt],
    [Operations.LAnd          , TokenKind.AndAnd],
    [Operations.LOr           , TokenKind.OrOr],
    [Operations.LEqual        , TokenKind.EqEq],
    [Operations.LNotEqual     , TokenKind.BangEq],
    [Operations.Assign        , TokenKind.Eq],
    [Operations.Not           , TokenKind.Bang],
]);

/** Represents an operator in the language. */
export class Operator extends AstNode {
    public readonly operation: Operations;
    constructor(token: Token) {
        super([token.tokenPos, token.tokenPos + 1]);
        this.operation = resolveOperation(
            token.type === TokenKind.Ident ?
                resolveKeyword(token.content) :
                token.type
        );
    }
    public get operationName() {
        return Operations[this.operation];
    }
    public get precedence() {
        return operatorPrecedence(this.operation);
    }

    override accept<T>(visitor: Visitor<T>): T {
        return visitor.visitOperator(this);
    }

    [NODE_INSPECT_SYMBOL]() {
        return `Operator { op: ${Operations[this.operation]}, tokenSpan: [${this.tokenSpan.join(' -> ')}) }`;
    }
}

export const constructOperator = (token: Token): Operator => {
   return new Operator(token);
}

export const tryConstructOperator = tryWrapper(constructOperator);

export const resolveOperation = (op: TokenKind | Keywords): Operations => {
    const resolved = OperationMapping.getReverse(op);
    if (typeof resolved === 'undefined') {
        throw new Error(`Could not resolve operator ${TokenKind[op]}`);
    }
    return resolved;
}

export const tryResolveOperation = tryWrapper(resolveOperation)


export const operatorPrecedence = (op: Operations): Nullable<number> => {
    switch (op) {
        case Operations.Cast:
        	return 14;
        case Operations.Multiply:
        case Operations.Divide:
        case Operations.Modulus:
            return 13;
        case Operations.Add:
        case Operations.Subtract:
            return 12;
        case Operations.ShiftLeft:
        case Operations.ShiftRight:
            return 11;
        case Operations.BitAnd:
            return 10;
        case Operations.BitXor:
            return 9;
        case Operations.BitOr:
            return 8;
        case Operations.Less:
        case Operations.Greater:
        case Operations.LessEqual:
        case Operations.GreaterEqual:
        case Operations.LEqual:
        case Operations.LNotEqual:
            return 7;
        case Operations.LAnd:
            return 6;
        case Operations.LOr:
            return 5;
        case Operations.Assign:
            return 2;
    }
    return null;
}

export const UnaryOperators = [
    TokenKind.Plus,
    TokenKind.Minus,
]


export const BinaryKeywordOperators = [
    Keywords.As,
]

export const BinaryOperators = [
    TokenKind.Plus,
    TokenKind.Minus,
    TokenKind.Star,
    TokenKind.Slash,
    TokenKind.Percent,
    TokenKind.Eq,
    TokenKind.EqEq,
    TokenKind.BangEq,
    TokenKind.Lt,
    TokenKind.Le,
    TokenKind.Gt,
    TokenKind.Ge,
    TokenKind.And,
    TokenKind.AndAnd,
    TokenKind.Or,
    TokenKind.OrOr,
    TokenKind.Caret,
    TokenKind.Tilde,
    TokenKind.Question,
    TokenKind.At,
    TokenKind.Dot,
]

/** Represents the associativity of an operator.
 * (i.e. the order in which operators of the same precedence are evaluated)
 */
export enum Associativity {
    /** Left to right */
    Left,
    /** Right to left */
    Right,
    /** Can't be chained */
    None,
}

export const operatorAssociativity = (op: Operations): Associativity => {
    switch (op) {
        case Operations.Cast:
            return Associativity.Right;
        case Operations.Multiply:
        case Operations.Divide:
        case Operations.Modulus:
        case Operations.Add:
        case Operations.Subtract:
        case Operations.ShiftLeft:
        case Operations.ShiftRight:
        case Operations.BitAnd:
        case Operations.BitXor:
        case Operations.BitOr:
        case Operations.Less:
        case Operations.Greater:
        case Operations.LessEqual:
        case Operations.GreaterEqual:
        case Operations.LEqual:
        case Operations.LNotEqual:
        case Operations.LAnd:
        case Operations.LOr:
        case Operations.Assign:
            return Associativity.Left;
        case Operations.Not:
            return Associativity.Right;
    }
    return Associativity.None;
}
