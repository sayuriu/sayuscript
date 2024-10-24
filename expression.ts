import { Identifier, Statement } from "./astNodes.ts";
import { AstNode } from "./astNode.ts";
import { Operations, Operator } from "./operators.ts";
import { TokenKind, Token, LiteralTokenTypes } from "./token.ts";
import { Nullable } from './util.ts';

/** Represents an expression in the language. */
export class Expression extends AstNode {}

export class Literal extends Expression {
    /** The literal kind. */
    public readonly kind: TokenKind;
    /** Raw content of the literal. */
    public readonly value: string;
    public readonly tokenPos: number;
    constructor(token: Token) {
        if (!LiteralTokenTypes.includes(token.type)) {
            throw new Error(`Expected a literal token, got \`${TokenKind[token.type]}\``);
        }
        super([token.tokenPos, token.tokenPos + 1]);
        this.kind = token.type;
        this.value = token.content;
        this.tokenPos = token.tokenPos;
    }

    override toString() {
        return `${TokenKind[this.kind]}(${this.value})`;
    }
}

/** Represents a binary expression (as `a <op> b`). */
export class BinaryExpr extends Expression {
	constructor(public left: Expression, public operator: Operator, public right: Expression) {
		super([left.tokenSpan[0], right.tokenSpan[1]]);
	}
}

/** Represents a unary expression (as `<op> a`). */
export class UnaryExpr extends Expression {
	constructor(public operator: Operator, public expr: Expression) {
		super([operator.tokenSpan[0], expr.tokenSpan[1]]);
	}
}

/** Represents a block expression. */
export class BlockExpr extends Expression {
	/** Whether the block has a trailing expression. */
	hasTailingExpr = false;
	constructor(public body: (Statement | Expression)[]) {
		if (!body.length) {
			throw new Error('BlockExpr must have at least one expression');
		}
		const firstStmt = body[0];
		const lastStmt = body.at(-1)!;
		super([firstStmt.tokenSpan[0], lastStmt.tokenSpan[1]]);
		this.hasTailingExpr = lastStmt instanceof Expression;
	}
}

/** Represents a function declaration expression.
 *
 * ```sayu
 * action add(a, b) -> {
 * 	   a + b
 * }
 * ```
 *
 * It can also be used as a standalone expression.
 * ```sayu
 * let add = action(a, b) -> a + b;
 * let add2 = action(a) -> {
 *     let b = 2;
 *     add(a, b)
 * }
 * assert(add2(2) == add(2, 2));
 * ```
*/
export class FnExpr extends Expression {
	constructor(
		public ident: Nullable<Identifier> = null,
		public params: Identifier[],
		public body: BlockExpr | Expression,
        tokenSpan: readonly [number, number]
    ) {
		super(tokenSpan);
	}
}

/** Represents a function call expression. */
export class FnCallExpr extends Expression {
	constructor(
		public ident: Identifier,
		public args: Expression[],
        tokenSpan: readonly [number, number]
    ) {
		super(tokenSpan);
	}
}

/** Represents a tuple expression. */
export class TupleExpr extends Expression {
	constructor(
		public expressions: Expression[],
        tokenSpan: readonly [number, number]
	) {
		super(tokenSpan);
	}
}

export const PREC_PREFIX = 50;
export const PREC_UNAMBIGUOUS = 100;

export const exprPrecedence = (expr: Expression) => {
	if (expr instanceof FnCallExpr) {
		return PREC_UNAMBIGUOUS;
	}
	if (expr instanceof UnaryExpr) {
		return PREC_PREFIX;
	}
	if (expr instanceof BinaryExpr) {
		return expr.operator.precedence;
	}
}

/** Returns whether the expression can stand alone (can be used as a statement if it has a semi after it). */
export const exprCanStandalone = (expr: Expression) => {
	const isEitherFnOrBlock = (
		expr.isOfKind(FnCallExpr)
		|| expr.isOfKind(BlockExpr)
	);
	if (isEitherFnOrBlock) {
		return true;
	}
	if (expr instanceof BinaryExpr) {
		return expr.operator.operation === Operations.Assign;
	}
	return false;
}