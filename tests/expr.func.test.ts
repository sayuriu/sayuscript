import { Operations } from "../operators.ts";
import { FnKind } from "../statements.ts";
import { lit, dec, varStmt, exprStmt, ident, testCase, call, testValidCasesForExprParser, tuple, binary, op, unary, fn, block } from "./util.ts";

const validCases = [
    testCase(
        "action(a, b) -> { c }",
        fn(
            [0, 10],
            FnKind.Action,
            null,
            [
                ident("a", 7, 2),
                ident("b", 10, 4)
            ],
            block(
                [ident("c", 16, 8)],
                [7, 10],
                true
            ),

        )
    ),
    testCase(
        "compute(a) -> compute(b) -> compute(c) -> print(a + b + c)",
        fn(
            [0, 23],
            FnKind.Compute,
            null,
            [
                ident("a", 8, 2)
            ],
            fn(
                [5, 23],
                FnKind.Compute,
                null,
                [
                    ident("b", 24, 7)
                ],
                fn(
                    [10, 23],
                    FnKind.Compute,
                    null,
                    [
                        ident("c", 40, 12)
                    ],
                    call(
                        [15, 23],
                        ident("print", 47, 15),
                        [
                            binary(
                                binary(
                                    ident("a", 53, 17),
                                    op(Operations.Add, [55, 56], 18),
                                    ident("b", 59, 19)
                                ),
                                op(Operations.Add, [61, 62], 20),
                                ident("c", 65, 21)
                            )
                        ]
                    ),
                ),

            ),
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
            [0, 34],
            FnKind.Action,
            null,
            [
                ident("m", 7, 2)
            ],
            block(
                [
                    varStmt(
                        [6, 13],
                        false,
                        ident("multiplier", 22, 7),
                        call(
                            [9, 13],
                            ident("extern", 31, 9),
                            [ident("PI", 39, 11)]
                        ),
                    ),
                    exprStmt(
                        call(
                            [14, 18],
                            ident("sideEffect", 48, 14),
                            [ident("multiplier", 59, 16)]
                        )
                    ),
                    fn(
                        [19, 33],
                        FnKind.Action,
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
                            [26, 33]
                        ),

                    )
                ],
                [5, 34],
            ),
        )
    ),
    testCase(
        "fn()",
        call(
            [0, 3],
            ident("fn", 0, 0),
            []
        )
    ),
    testCase(
        "fn(1, 2, 3)",
        call(
            [0, 8],
            ident("fn", 0, 0),
            [
                lit(dec("1", 3, 2)),
                lit(dec("2", 6, 4)),
                lit(dec("3", 9, 6))
            ]
        )
    ),
    testCase(
        "fnWithTuple((1, 2, 3))",
        call(
            [0, 10],
            ident("fnWithTuple", 0, 0),
            [
                tuple(
                    [2, 9],
                    [
                        lit(dec("1", 13, 3)),
                        lit(dec("2", 16, 5)),
                        lit(dec("3", 19, 7))
                    ]
                )
            ]
        )
    ),
    testCase(
        "fn(otherFn())",
        call(
            [0, 6],
            ident("fn", 0, 0),
            [
                call(
                    [2, 5],
                    ident("otherFn", 3, 2),
                    []
                )
            ]
        )
    ),
    testCase(
        "fn(1, (-2 + 3) * -4, -(1, 2))",
        call(
            [0, 21],
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
                        [15, 20],
                        [
                            lit(dec("1", 25, 16)),
                            lit(dec("2", 28, 18))
                        ]
                    )
                )
            ]
        )
    )
];

testValidCasesForExprParser(validCases);