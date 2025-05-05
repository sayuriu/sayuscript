import { CompilerTokenizer } from "../tokenizer.ts";
import { DefaultParser } from "../defaultParser.ts";
import { SimpleAstPrinter } from "../astSimplePrinter.ts";
import { assertEquals } from "@std/assert";

const source = `
compute sumTriple(a, b, c) -> {
	let var expr = 1 + (
		-2
		+ 3
	) * -4;
	let result = otherFn(
		1,
		(-2
			+ 3)
			* -4,
		-4
	);
	let float = -.1 + 2. + 3.e3 + 3e+4 + 1.5e-6;
	let char = 'a' + 'b' + '\\x41' + '\\u0041' + '\\u{3173f}';
	let string = "silly" + "string" + r"
	concatenation
	";

	print(string);
	expr * (
		result,
		float
			)
}

action main() -> {
    let chained =
        compute(a) ->
        compute(b) ->
        compute(c) ->
        print(a + b + c);
    (compute(a) -> print(a))("ooga booga")(Stdout);
}
`

// deno-lint-ignore no-explicit-any
function recursivelyRemoveFields(obj: any, fields: string[]): object {
    if (typeof obj !== "object" || obj === null) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => recursivelyRemoveFields(item, fields));
    }
    for (const field of fields) {
        delete obj[field];
    }
    for (const key in obj) {
        obj[key] = recursivelyRemoveFields(obj[key], fields);
    }
    return obj;
}


Deno.test("AstPrinter reconstructs source code", () => {
    const parser = new DefaultParser(new CompilerTokenizer(source).tokenize());
    const ast1 = parser.parse();

    const reconstructed = ast1.accept(new SimpleAstPrinter());
    console.log(reconstructed);

    const parser2 = new DefaultParser(new CompilerTokenizer(reconstructed).tokenize());
    const ast2 = parser2.parse();

    // We will remove the token spans from the ASTs before comparing them,
    // since we only care about the structure of the AST.
    const ast1Json = JSON.parse(JSON.stringify(ast1));
    const ast2Json = JSON.parse(JSON.stringify(ast2));

    assertEquals(
        recursivelyRemoveFields(ast1Json, ["tokenSpan"]),
        recursivelyRemoveFields(ast2Json, ["tokenSpan"]),
        "Reconstructed AST does not match original AST"
    );
});
