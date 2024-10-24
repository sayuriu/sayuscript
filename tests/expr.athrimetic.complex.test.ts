import { Operations } from "../operators.ts";
import { testCase, binary, lit, dec, op, unary, bin, hex, oct, testValidCasesForExprParser } from "./util.ts";

const validCases = [
    testCase(
        "(12 > -3) && (-12 >= 0) || (0 == 0)",
        binary(
            binary(
                binary(
                    lit(dec("12", 1, 1)),
                    op(Operations.Greater, [4, 5], 2),
                    unary(
                        op(Operations.Subtract, [6, 7], 3),
                        lit(dec("3", 7, 4))
                    )
                ),
                op(Operations.LAnd, [10, 12], 6),
                binary(
                    unary(
                        op(Operations.Subtract, [13, 14], 8),
                        lit(dec("12", 14, 9))
                    ),
                    op(Operations.GreaterEqual, [18, 20], 10),
                    lit(dec("0", 22, 11))
                )
            ),
            op(Operations.LOr, [24, 26], 13),
            binary(
                lit(dec("0", 28, 15)),
                op(Operations.LEqual, [30, 31], 16),
                lit(dec("0", 33, 17))
            )
        )
    ),
    testCase(
        "(12 + -3) / -12 & (0b1 | 0x2 ^ 0o3)",
        binary(
            binary(
                binary(
                    lit(dec("12", 1, 1)),
                    op(Operations.Add, [4, 5], 2),
                    unary(
                        op(Operations.Subtract, [6, 7], 3),
                        lit(dec("3", 7, 4))
                    )
                ),
                op(Operations.Divide, [10, 11], 6),
                unary(
                    op(Operations.Subtract, [12, 13], 7),
                    lit(dec("12", 14, 8))
                )
            ),
            op(Operations.BitAnd, [16, 17], 9),
            binary(
                lit(bin("0b1", 19, 11)),
                op(Operations.BitOr, [23, 24], 12),
                binary(
                    lit(hex("0x2", 26, 13)),
                    op(Operations.BitXor, [30, 31], 14),
                    lit(oct("0o3", 33, 15))
                )
            )
        )
    ),
]

testValidCasesForExprParser(validCases);