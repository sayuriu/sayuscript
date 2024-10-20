import { Keywords } from "./keywords.ts";
import { TokenKind } from "./tokens.ts";
import { PREC_UNAMBIGUOUS } from "./expression.ts";
import { Nullable } from "./util.ts";

export enum Operators {
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
	constructor(public kind: Operators) {
		this.type = Operators[kind];
	}
}
export class UnaryOperator extends Operator {}
export class BinaryOperator extends Operator {}

export const resolveOperator = (op: TokenKind | Keywords): Operators => {
	switch (op) {
		case TokenKind.Plus: return Operators.Add;
		case TokenKind.Minus: return Operators.Subtract;
		case TokenKind.Star: return Operators.Multiply;
		case TokenKind.Slash: return Operators.Divide;
		case TokenKind.Percent: return Operators.Modulus;
		case TokenKind.Lt: return Operators.Less;
		case TokenKind.Le: return Operators.LessEqual;
		case TokenKind.Gt: return Operators.Greater;
		case TokenKind.Ge: return Operators.GreaterEqual;
		case TokenKind.And: return Operators.BitAnd;
		case TokenKind.Caret: return Operators.BitXor;
		case TokenKind.Or: return Operators.BitOr;
		case TokenKind.LtLt: return Operators.ShiftLeft;
		case TokenKind.GtGt: return Operators.ShiftRight;
		case TokenKind.AndAnd: return Operators.LAnd;
		case TokenKind.OrOr: return Operators.LOr;
		case TokenKind.EqEq: return Operators.LEqual;
		case TokenKind.BangEq: return Operators.LNotEqual;
		case TokenKind.Eq: return Operators.Assign;
		case TokenKind.Bang: return Operators.Not;
		default: throw new Error(`Unknown operator ${op}`);
	}
}

export const resolveOperatorMaybe = (op: TokenKind | Keywords): Nullable<Operators> => {
	try {
		return resolveOperator(op);
	}
	catch {
		return null;
	}
}

export const OperatorPrecedence = (op: Operators): Nullable<number> => {
	switch (op) {
		// case Operators.As:
		// 	return 14;
		case Operators.Multiply:
		case Operators.Divide:
		case Operators.Modulus:
			return 13;
		case Operators.Add:
		case Operators.Subtract:
			return 12;
		case Operators.ShiftLeft:
		case Operators.ShiftRight:
			return 11;
		case Operators.BitAnd:
			return 10;
		case Operators.BitXor:
			return 9;
		case Operators.BitOr:
			return 8;
		case Operators.Less:
		case Operators.Greater:
		case Operators.LessEqual:
		case Operators.GreaterEqual:
		case Operators.LEqual:
		case Operators.LNotEqual:
			return 7;
		case Operators.LAnd:
			return 6;
		case Operators.LOr:
			return 5;
		case Operators.Assign:
			return 2;
		default:
	}
	return null
}

export const OperatorPrecedenceEx = (op: Operators) => {
	switch (op) {
		case Operators.Paren:
			return PREC_UNAMBIGUOUS;
		case Operators.Separator:
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