import { TupleExpr } from "../expression.ts";
import { Operations } from "../operators.ts";
import { testValidCasesForExprParser, call, float, dec, ident, lit, testCase, tuple, unary, op } from "./util.ts";

const validCases = [
    testCase(
        "(1, a, 3)",
        new TupleExpr(
            [
                lit(dec("1", 1, 1)),
                ident("a", 4, 3),
                lit(dec("3", 7, 5))
            ],
            [0, 7],
        )
    ),
    testCase(
        "(1, fn(2), 3)",
        new TupleExpr(
            [
                lit(dec("1", 1, 1)),
                call(
                    ident("fn", 4, 3),
                    [
                        lit(dec("2", 7, 5))
                    ],
                    [3, 7],
                ),
                lit(dec("3", 11, 8))
            ],
            [0, 10],
        )
    ),
    testCase(
        `(-1, \n2., \n\t\t-.3)`,
        tuple(
            [
                unary(
                    op(Operations.Subtract, [1, 2], 1),
                    lit(dec("1", 2, 2))
                ),
                lit(float("2.", 6, 4)),
                unary(
                    op(Operations.Subtract, [13, 14], 6),
                    lit(float(".3", 14, 7))
                )
            ],
            [0, 9],
        )
    )
];

testValidCasesForExprParser(validCases);