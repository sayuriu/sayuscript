import { assertEquals, assertThrows } from "@std/assert";
import { Parser } from "./parser.ts";
import { lexer, LexerError } from "./tokenizer.ts";
import { Operator, OperatorKind } from './operators.ts';
import { BinaryExpr, UnaryExpr } from './expression.ts';
import { Literal } from './ast.ts';
import { Token, TokenKind } from './token.ts';
import { ParserError } from './ast.ts';

{
  const makeToken = (type: TokenKind, value: string) => new Token(type, value, [0, 0], [0, 0]);
  const input = `let float = .1 + 2. + 3.e3 + 3e+4 + 1.5e-6;`;
  const expected = [
    makeToken(TokenKind.Ident, "let"),
    makeToken(TokenKind.Ident, "float"),
    makeToken(TokenKind.Eq, "="),
    makeToken(TokenKind.IntLiteral, ".1"),
    makeToken(TokenKind.Plus, "+"),
    makeToken(TokenKind.FloatLiteral, "2."),
    makeToken(TokenKind.Plus, "+"),
    makeToken(TokenKind.FloatLiteral, "3.e3"),
    makeToken(TokenKind.Plus, "+"),
    makeToken(TokenKind.FloatLiteral, "3e+4"),
    makeToken(TokenKind.Plus, "+"),
    makeToken(TokenKind.FloatLiteral, "1.5e-6"),
    makeToken(TokenKind.Semi, ";"),
  ];
  const tokens = lexer(input);
  Deno.test(`lexer() parses '${input}' correctly`, () => {
    for (let i = 0; i < expected.length; i++) {
      assertEquals(tokens[i].type, expected[i].type);
      assertEquals(tokens[i].value, expected[i].value);
    }
  });

  const invalidFloatCases = [
    "1e",
    "1e+",
    "1e-",
    "1.5e",
    "1.5e+",
    "1.5e-",
  ]
  for (const input of invalidFloatCases) {
    Deno.test(`lexer() throws error for invalid exponent '${input}'`, () => {
      assertThrows(() => {
        lexer(input);
      }, LexerError, `Invalid exponent literal \`${input}\``);
    });
  }

  const invalidPrefixCases = [
    "0x",
    "0b",
    "0o",
    "0x1g",
    "0b2",
    "0o8",
    "0o7_",
  ]
  const prefix = {
    "0x": "hex",
    "0b": "binary",
    "0o": "octal",
  }
  for (const input of invalidPrefixCases) {
    Deno.test(`lexer() throws error for invalid prefix '${input}'`, () => {
      assertThrows(() => {
        lexer(input);
      }, LexerError, `Invalid ${prefix[input.substring(0, 2)]} literal \`${input}\``);
    });
  }
}

function mkNumLit(value: number, int = true) {
  return new Literal(int ? TokenKind.IntLiteral : TokenKind.FloatLiteral, value.toString());
}

// Parameterized test cases for valid expressions
const validCases = [
  { input: "3 + 4", expected: new BinaryExpr(mkNumLit(3), new Operator(OperatorKind.Add), mkNumLit(4)) },
  { input: "10 -2" , expected: new BinaryExpr(mkNumLit(10), new Operator(OperatorKind.Subtract), mkNumLit(2)) },
  { input: "  8 * 5", expected: new BinaryExpr(mkNumLit(8), new Operator(OperatorKind.Multiply), mkNumLit(5)) },
  {
    input: "(12 + -3) / -12",
    expected:
    new BinaryExpr(
      new BinaryExpr(
        mkNumLit(12),
        new Operator(OperatorKind.Add),
        new UnaryExpr(new Operator(OperatorKind.Subtract), mkNumLit(3)),
      ),
      new Operator(OperatorKind.Divide),
      new UnaryExpr(new Operator(OperatorKind.Subtract), mkNumLit(12))
    )
  },
];

for (const { input, expected } of validCases) {
  const tokens = lexer(input);
  const parser = new Parser(tokens);
  Deno.test(`parser.Expression() parses '${input}' correctly`, () => {
    assertEquals(parser.Expression(), expected);
  });
}

// Parameterized test cases for invalid expressions
const invalidCases = [
  ["3 +", "Expected an expression right-hand side of binary expression, got `Eof`"],
];

for (const [input, expectedErrorMessage] of invalidCases) {
  const tokens = lexer(input);
  const parser = new Parser(tokens);
  Deno.test(`parser.Expression() throws error for invalid expression '${input}'`, () => {
    assertThrows(() => {
      parser.Expression();
    }, ParserError, expectedErrorMessage);
  });
}