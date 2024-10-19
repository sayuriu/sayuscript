import { Identifier } from "./ast";
import { Operator, OperatorPrecedence } from "./operators";

export class Expression {}
export class BinaryExpr extends Expression {
	constructor(public left: Expression, public operator: Operator, public right: Expression) {
		super();
	}
}
export class UnaryExpr extends Expression {
	constructor(public operator: Operator, public expr: Expression) {
		super();
	}
}
export class FnCallExpr extends Expression {
	constructor(public ident: Identifier, public args: Expression[]) {
		super();
	}
}
export class GroupedExpr extends Expression {
	constructor(public expressions: Expression[]) {
		super();
	}
}

export const PREC_PREFIX = 50;
export const PREC_UNAMBIGUOUS = 100;

export const ExprPrecedence = (expr: Expression) => {
	if (expr instanceof FnCallExpr) {
		return PREC_UNAMBIGUOUS;
	}
	if (expr instanceof UnaryExpr) {
		return PREC_PREFIX;
	}
	if (expr instanceof BinaryExpr) {
		return OperatorPrecedence(expr.operator.kind);
	}
}