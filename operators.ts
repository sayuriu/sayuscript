import { Keywords } from "./keywords.ts";
import { TokenKind } from "./tokens.ts";
import { PREC_UNAMBIGUOUS } from './expression.ts';

export enum Operators {
	// As = Keywords.As,
	Add = TokenKind.Plus,
	Subtract = TokenKind.Minus,
	Multiply = TokenKind.Star,
	Divide = TokenKind.Slash,
	Modulus = TokenKind.Percent,
	Less = TokenKind.Lt,
	LessEqual = TokenKind.Le,
	Greater = TokenKind.Gt,
	GreaterEqual = TokenKind.Ge,
	BitAnd = TokenKind.And,
	BitXor = TokenKind.Caret,
	BitOr = TokenKind.Or,
	ShiftLeft = TokenKind.LtLt,
	ShiftRight = TokenKind.GtGt,
	LAnd = TokenKind.AndAnd,
	LOr = TokenKind.OrOr,
	LEqual = TokenKind.EqEq,
	LNotEqual = TokenKind.BangEq,
	Assign = TokenKind.Eq,
	Not = TokenKind.Bang,
	Paren = TokenKind.OpenParen,
	Separator = TokenKind.Comma,
}

export class Operator { constructor(public op: Operators) {} }
export class UnaryOperator extends Operator {}
export class BinaryOperator extends Operator {}

export const resolveOperator = (op: TokenKind | Keywords) => {
	if (op in Operators)
		return Operators[op];
	throw new Error(`Unknown operator ${op}`);
}

export const OperatorPrecedence = (op: Operators) => {
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
			throw new Error(`Unknown operator ${op}`);
	}
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
	TokenKind.Lt,
	TokenKind.Gt,
	TokenKind.And,
	TokenKind.Or,
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