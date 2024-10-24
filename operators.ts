import { Keywords } from "./keywords.ts";
import { TokenKind } from "./token.ts";
import { PREC_UNAMBIGUOUS } from "./expression.ts";
import { Nullable } from "./util.ts";

export enum OperatorKind {
	// As = Keywords.As,
	Add,
	Subtract,
	Multiply,
	Divide,
	Modulus,
	Less,
	LessEqual,
	Greater,
	GreaterEqual,
	BitAnd,
	BitXor,
	BitOr,
	ShiftLeft,
	ShiftRight,
	LAnd,
	LOr,
	LEqual,
	LNotEqual,
	Assign,
	Not,
	Paren,
	Separator,
}

export class Operator {
	type: string;
	constructor(public kind: OperatorKind) {
		this.type = OperatorKind[kind];
	}
	public get precedence() {
		return OperatorPrecedence(this.kind);
	}
}
export class UnaryOperator extends Operator {}
export class BinaryOperator extends Operator {}

export const resolveOperatorKind = (op: TokenKind | Keywords): OperatorKind => {
	switch (op) {
		case TokenKind.Plus: return OperatorKind.Add;
		case TokenKind.Minus: return OperatorKind.Subtract;
		case TokenKind.Star: return OperatorKind.Multiply;
		case TokenKind.Slash: return OperatorKind.Divide;
		case TokenKind.Percent: return OperatorKind.Modulus;
		case TokenKind.Lt: return OperatorKind.Less;
		case TokenKind.Le: return OperatorKind.LessEqual;
		case TokenKind.Gt: return OperatorKind.Greater;
		case TokenKind.Ge: return OperatorKind.GreaterEqual;
		case TokenKind.And: return OperatorKind.BitAnd;
		case TokenKind.Caret: return OperatorKind.BitXor;
		case TokenKind.Or: return OperatorKind.BitOr;
		case TokenKind.LtLt: return OperatorKind.ShiftLeft;
		case TokenKind.GtGt: return OperatorKind.ShiftRight;
		case TokenKind.AndAnd: return OperatorKind.LAnd;
		case TokenKind.OrOr: return OperatorKind.LOr;
		case TokenKind.EqEq: return OperatorKind.LEqual;
		case TokenKind.BangEq: return OperatorKind.LNotEqual;
		case TokenKind.Eq: return OperatorKind.Assign;
		case TokenKind.Bang: return OperatorKind.Not;
		default: throw new Error(`Unknown operator ${op}`);
	}
}

export const resolveOperatorMaybe = (op: TokenKind | Keywords): Nullable<Operator> => {
	try {
		return resolveOperator(op);
	}
	catch {
		return null;
	}
}

export const resolveOperator = (op: TokenKind | Keywords): Operator => {
	return new Operator(resolveOperatorKind(op));
}

export const OperatorPrecedence = (op: OperatorKind): Nullable<number> => {
	switch (op) {
		// case Operators.As:
		// 	return 14;
		case OperatorKind.Multiply:
		case OperatorKind.Divide:
		case OperatorKind.Modulus:
			return 13;
		case OperatorKind.Add:
		case OperatorKind.Subtract:
			return 12;
		case OperatorKind.ShiftLeft:
		case OperatorKind.ShiftRight:
			return 11;
		case OperatorKind.BitAnd:
			return 10;
		case OperatorKind.BitXor:
			return 9;
		case OperatorKind.BitOr:
			return 8;
		case OperatorKind.Less:
		case OperatorKind.Greater:
		case OperatorKind.LessEqual:
		case OperatorKind.GreaterEqual:
		case OperatorKind.LEqual:
		case OperatorKind.LNotEqual:
			return 7;
		case OperatorKind.LAnd:
			return 6;
		case OperatorKind.LOr:
			return 5;
		case OperatorKind.Assign:
			return 2;
		default:
	}
	return null
}

export const OperatorPrecedenceEx = (op: OperatorKind) => {
	switch (op) {
		case OperatorKind.Paren:
			return PREC_UNAMBIGUOUS;
		case OperatorKind.Separator:
			return PREC_UNAMBIGUOUS - 1;
		default:
			return OperatorPrecedence(op);
	}
}

export const UnaryOperators = [
	TokenKind.Plus,
	TokenKind.Minus,
]

export const BinaryOperators = [
	TokenKind.Plus,
	TokenKind.Minus,
	TokenKind.Star,
	TokenKind.Slash,
	TokenKind.Percent,
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

export const LiteralTypes = [
	TokenKind.IntLiteral,
	TokenKind.CharLiteral,
	TokenKind.FloatLiteral,
	TokenKind.StrLiteral,
	TokenKind.RawStrLiteral,
]
// add more