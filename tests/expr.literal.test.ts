import { testCase, lit, dec, hex, bin, oct } from "./util.ts";
import { testValidCasesForExprParser } from "./util.ts";

const validCases = [
    testCase("1", lit(dec("1", 0, 0))),
    testCase("0x1", lit(hex("0x1", 0, 0))),
    testCase("0b1", lit(bin("0b1", 0, 0))),
    testCase("0o1", lit(oct("0o1", 0, 0))),
    testCase("1_000", lit(dec("1_000", 0, 0))),
    testCase("0xff_ee_dd_cc_bb_aa_99_88", lit(hex("0xff_ee_dd_cc_bb_aa_99_88", 0, 0))),
    testCase("0b1111_0000", lit(bin("0b1111_0000", 0, 0))),
    testCase("0o7_6_5_4_3_2_1_0", lit(oct("0o7_6_5_4_3_2_1_0", 0, 0))),
]

testValidCasesForExprParser(validCases);
