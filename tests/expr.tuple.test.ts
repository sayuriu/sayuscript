import { Operations } from "../operators.ts";
import { FnKind } from "../statements.ts";
import { testValidCasesForExprParser, call, float, dec, ident, lit, testCase, tuple, unary, op, immCall, fn, block, exprStmt, binary } from "./util.ts";

const validCases = [
    testCase(
        "(1, a, 3)",
        tuple(
            [0, 7],
            [
                lit(dec("1", 1, 1)),
                ident("a", 4, 3),
                lit(dec("3", 7, 5))
            ]
        )
    ),
    testCase(
        "(1, fn(2), 3)",
        tuple(
            [0, 10],
            [
                lit(dec("1", 1, 1)),
                call(
                    [3, 7],
                    ident("fn", 4, 3),
                    [
                        lit(dec("2", 7, 5))
                    ]
                ),
                lit(dec("3", 11, 8))
            ]
        )
    ),
    testCase(
        `(-1, \n2., \n\t\t-.3)`,
        tuple(
            [0, 9],
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
            ]
        )
    ),
    testCase(
        `
            (
                action(a) -> { broadcast(a); },
                compute(b) -> transform(b),
                compute(c) -> compute(_) -> transform(c, _),
                1,
                A(B)(C) + D
            )
        `,
        tuple(
            [0, 53],
            [
                fn(
                    [1, 13],
                    FnKind.Action,
                    null,
                    [ident("a", 16, 3)],
                    block(
                        [
                            exprStmt(
                                call(
                                    [7, 11],
                                    ident("broadcast", 21, 7),
                                    [ident("a", 30, 9)]
                                )
                            )
                        ],
                        [6, 13],
                    )
                ),
                fn(
                    [14, 23],
                    FnKind.Compute,
                    null,
                    [ident("b", 21, 16)],
                    call(
                        [19, 23],
                        ident("transform", 19, 19),
                        [ident("b", 30, 21)]
                    )
                ),
                fn(
                    [24, 40],
                    FnKind.Compute,
                    null,
                    [ident("c", 26, 26)],
                    fn(
                        [29, 40],
                        FnKind.Compute,
                        null,
                        [ident("_", 31, 31)],
                        call(
                            [34, 40],
                            ident("transform", 34, 34),
                            [
                                ident("c", 36, 36),
                                ident("_", 38, 38)
                            ]
                        )
                    )
                ),
                lit(dec("1", 41, 41)),
                binary(
                    immCall(
                        [43, 50],
                        call(
                            [43, 47],
                            ident("A", 43, 43),
                            [ident("B", 45, 45)]
                        ),
                        [ident("C", 48, 48)]
                    ),
                    op(Operations.Add, [50, 51], 50),
                    ident("D", 51, 51)
                )
            ]
        )
    )
];

testValidCasesForExprParser(validCases);