import { Operations } from "../operators.ts";
import { lit, dec, varStmt, exprStmt, ident, testCase, call, testValidCasesForExprParser, tuple, binary, op, unary, fn, block } from "./util.ts";

const validCases = [
    testCase(
        "action(a, b) -> { c }",
        fn(
            null,
            [
                ident("a", 7, 2),
                ident("b", 10, 4)
            ],
            block(
                [ident("c", 16, 8)],
            ),
            [0, 10]
        )
    ),
    testCase(
        `action(m) -> {
            let multiplier = extern(PI);
            sideEffect(multiplier);
            action(a, b) -> {
                a * b * multiplier
            }
        }`,
        fn(
            null,
            [
                ident("m", 7, 2)
            ],
            block(
                [
                    varStmt(
                        false,
                        ident("multiplier", 22, 7),
                        call(
                            ident("extern", 31, 9),
                            [ident("PI", 39, 11)],
                            [9, 13],
                        ),
                        [6, 13]
                    ),
                    exprStmt(
                        call(
                            ident("sideEffect", 48, 14),
                            [ident("multiplier", 59, 16)],
                            [14, 18],
                        )
                    ),
                    fn(
                        null,
                        [
                            ident("a", 75, 21),
                            ident("b", 78, 23)
                        ],
                        block(
                            [
                                binary(
                                    binary(
                                        ident("a", 96, 27),
                                        op(Operations.Multiply, [98, 99], 28),
                                        ident("b", 102, 29)
                                    ),
                                    op(Operations.Multiply, [104, 105], 30),
                                    ident("multiplier", 108, 31)
                                )
                            ],
                        ),
                        [19, 33]
                    )
                ],
            ),
            [0, 34]
        )
    ),
    testCase(
        "fn()",
        call(
            ident("fn", 0, 0),
            [],
            [0, 3],
        )
    ),
    testCase(
        "fn(1, 2, 3)",
        call(
            ident("fn", 0, 0),
            [
                lit(dec("1", 3, 2)),
                lit(dec("2", 6, 4)),
                lit(dec("3", 9, 6))
            ],
            [0, 8],
        )
    ),
    testCase(
        "fnWithTuple((1, 2, 3))",
        call(
            ident("fnWithTuple", 0, 0),
            [
                tuple(
                    [
                        lit(dec("1", 13, 3)),
                        lit(dec("2", 16, 5)),
                        lit(dec("3", 19, 7))
                    ],
                    [2, 9],
                )
            ],
            [0, 10],
        )
    ),
    testCase(
        "fn(otherFn())",
        call(
            ident("fn", 0, 0),
            [
                call(
                    ident("otherFn", 3, 2),
                    [],
                    [2, 5],
                )
            ],
            [0, 6],
        )
    ),
    testCase(
        "fn(1, (-2 + 3) * -4, -(1, 2))",
        call(
            ident("fn", 0, 0),
            [
                lit(dec("1", 3, 2)),
                binary(
                    binary(
                        unary(
                            op(Operations.Subtract, [7, 8], 5),
                            lit(dec("2", 9, 6)),
                        ),
                        op(Operations.Add, [6, 7], 7),
                        lit(dec("3", 14, 8))
                    ),
                    op(Operations.Multiply, [15, 16], 10),
                    unary(
                        op(Operations.Subtract, [17, 18], 11),
                        lit(dec("4", 18, 12))
                    )
                ),
                unary(
                    op(Operations.Subtract, [21, 22], 14),
                    tuple(
                        [
                            lit(dec("1", 25, 16)),
                            lit(dec("2", 28, 18))
                        ],
                        [15, 20],
                    )
                )
            ],
            [0, 21],
        )
    )
];

testValidCasesForExprParser(validCases);