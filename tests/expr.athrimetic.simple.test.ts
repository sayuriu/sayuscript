import { assertThrows } from "@std/assert/throws";
import { Operations } from "../operators.ts";
import { Parser, ParserError } from "../parser.ts";
import { Tokenizer } from "../tokenizer.ts";
import { testCase, testValidCasesForExprParser, binary, lit, dec, op, float, unary } from "./util.ts";

const validCases = [
    testCase(
        "3 + 4",
        binary(
            lit(dec("3", 0, 0)),
            op(Operations.Add, [2, 3], 1),
            lit(dec("4", 0, 2))
        )
    ),
    testCase(
        "10 -2.",
        binary(
            lit(dec("10", 0, 0)),
            op(Operations.Subtract, [3, 4], 1),
            lit(float("2.", 0, 2))
        )
    ),
    testCase(
        "   3 * -4.",
        binary(
            lit(dec("3", 0, 0)),
            op(Operations.Multiply, [5, 6], 1),
            unary(
                op(Operations.Subtract, [7, 8], 2),
                lit(float("4.", 0, 3))
            )
        )
    ),
    testCase(
        "-.3 / 4",
        binary(
            unary(
                op(Operations.Subtract, [0, 1], 0),
                lit(float(".3", 1, 1))
            ),
            op(Operations.Divide, [5, 6], 2),
            lit(dec("4", 3, 3))
        )
    )
]

testValidCasesForExprParser(validCases);

const invalidCases = [
    ["3 +", "Expected an expression right-hand side of binary expression, got `Eof`"],
];

for (const [input, expectedErrorMessage] of invalidCases) {
    const tokens = new Tokenizer(input).tokenize();
    const parser = new Parser(tokens);
    Deno.test(`parser.Expression() throws error for invalid expression '${input}'`, () => {
        assertThrows(() => {
            parser.Expression();
        }, ParserError, expectedErrorMessage);
    });
}