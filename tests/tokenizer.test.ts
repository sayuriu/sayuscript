import { assertEquals } from "@std/assert/equals";
import { assertThrows } from "@std/assert/throws";
import { TokenKind } from "../token.ts";
import { LexerError, Tokenizer } from "../tokenizer.ts";
import { dec, float, hex, testCase, token } from "./util.ts";

const generalCases = [
    testCase(
        `(-1, \n2., \n\t\t-.3)`,
        [
            token(TokenKind.LParen, "(", [0, 1], 0),
            token(TokenKind.Minus, "-", [1, 2], 1),
            dec("1", 2, 2),
            token(TokenKind.Comma, ",", [3, 4], 3),
            float("2.", 6, 4),
            token(TokenKind.Comma, ",", [8, 9], 5),
            token(TokenKind.Minus, "-", [13, 14], 6),
            float(".3", 14, 7),
            token(TokenKind.RParen, ")", [16, 17], 8),
            token(TokenKind.Eof, "", [17, 17], 9),
        ]
    ),
    testCase(
        `let float = .1 + 2. * 3.e3 - 3e+4 + 1.5e-6 / 0x1;`,
        [
            token(TokenKind.Ident, "let", [0, 3], 0),
            token(TokenKind.Ident, "float", [4, 9], 1),
            token(TokenKind.Eq, "=", [10, 11], 2),
            float(".1", 12, 3),
            token(TokenKind.Plus, "+", [15, 16], 4),
            float("2.", 17, 5),
            token(TokenKind.Star, "*", [20, 21], 6),
            float("3.e3", 22, 7),
            token(TokenKind.Minus, "-", [27, 28], 8),
            float("3e+4", 29, 9),
            token(TokenKind.Plus, "+", [34, 35], 10),
            float("1.5e-6", 36, 11),
            token(TokenKind.Slash, "/", [43, 44], 12),
            hex("0x1", 45, 13),
            token(TokenKind.Semi, ";", [48, 49], 14),
            token(TokenKind.Eof, "", [49, 49], 15),
        ]
    ),
    testCase(`'a'`, [
        token(TokenKind.CharLiteral, "a", [0, 3], 0),
        token(TokenKind.Eof, "", [3, 3], 1)
    ]),
    testCase(`'\\t'`, [
        token(TokenKind.CharLiteral, "\\t", [0, 4], 0),
        token(TokenKind.Eof, "", [4, 4], 1)
    ]),
    testCase(`'\\x1f'`, [
        token(TokenKind.CharLiteral, "\\x1f", [0, 6], 0),
        token(TokenKind.Eof, "", [6, 6], 1)
    ]),
    testCase(`'\\u231f'`, [
        token(TokenKind.CharLiteral, "\\u231f", [0, 8], 0),
        token(TokenKind.Eof, "", [8, 8], 1)
    ]),
    testCase(`'\\u{1F}'`, [
        token(TokenKind.CharLiteral, "\\u{1F}", [0, 8], 0),
        token(TokenKind.Eof, "", [8, 8], 1)
    ]),
    testCase(`'\\u{1310F}'`, [
        token(TokenKind.CharLiteral, "\\u{1310F}", [0, 11], 0),
        token(TokenKind.Eof, "", [11, 11], 1)
    ]),
    testCase(`"sayuri"`, [
        token(TokenKind.StrLiteral, "sayuri", [0, 8], 0),
        token(TokenKind.Eof, "", [8, 8], 1)
    ]),
    testCase(`"\t\ta"`, [
        token(TokenKind.StrLiteral, `\t\ta`, [0, 5], 0),
        token(TokenKind.Eof, "", [5, 5], 1)
    ]),
    testCase(`r"\n\t\ta"`, [
        token(TokenKind.RawStrLiteral, `\n\t\ta`, [0, 7], 0),
        token(TokenKind.Eof, "", [7, 7], 1)
    ]),
];

for (const { input, expected } of generalCases) {
    const tokens = new Tokenizer(input).tokenize();
    Deno.test(`Tokenizer.tokenize() parses '${input}' correctly`, () => {
        for (let i = 0; i < expected.length; i++) {
            const token = tokens[i];
            const expectedToken = expected[i];
            assertEquals(token, expectedToken, `Token ${i} mismatch against expected token`);
        }
    });
}

const invalidCharCases = [
    testCase(`'`, "Unterminated char literal"),
    testCase(`'a`, "Unterminated char literal"),
    testCase(`'\\`, "Unterminated char literal"),
    testCase(`'\\x`, "Invalid hex escape sequence \`\\x\`"),
    testCase(`'\\u`, "Invalid unicode escape sequence \`\\u\`"),
    testCase(`'\\u'`, "Invalid unicode escape sequence \`\\u'\`"),
    testCase(`'\\u1g`, "Invalid unicode escape sequence \`\\u1g\`"),
    testCase(`'\\u{`, "Invalid extended unicode escape sequence \`\\u{\`"),
    testCase(`'\\u{1'`, "Invalid extended unicode escape sequence \`\\u{1'\`"),
    testCase(`'\\u{1g`, "Invalid extended unicode escape sequence \`\\u{1g\`"),
]
for (const { input, expected } of invalidCharCases) {
    Deno.test(`Tokenizer.tokenize() throws error for invalid char literal \`${input}\``, () => {
        assertThrows(() => {
            new Tokenizer(input).tokenize();
        }, LexerError, expected);
    });
}

const invalidFloatCases = [
    "1e",
    "1e+",
    "1e-",
    "1.5e",
    "1.5e+",
    "1.5e-",
]
for (const input of invalidFloatCases) {
    Deno.test(`Tokenizer.tokenize() throws error for invalid exponent '${input}'`, () => {
        assertThrows(() => {
            new Tokenizer(input).tokenize();
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
const prefix: Record<string, string> = {
    "0x": "hex",
    "0b": "binary",
    "0o": "octal",
}
for (const input of invalidPrefixCases) {
    Deno.test(`Tokenizer.tokenize() throws error for invalid prefix '${input}'`, () => {
        assertThrows(() => {
            new Tokenizer(input).tokenize();
        }, LexerError, `Invalid ${prefix[input.substring(0, 2)]} literal \`${input}\``);
    });
}