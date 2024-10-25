import type { Visitor } from "./visitor.ts";

/** Represents a node in the abstract syntax tree.
 * This is the base class for all AST nodes.
*/
export abstract class AstNode {
    constructor(
        /** The token span of this node.
         * This span is represented as `[startTokenPos, endTokenPos)`.
        */
        public readonly tokenSpan: readonly [number, number]
    ) {}

	/** Returns whether this node is an instance of the given type. */
	// deno-lint-ignore no-explicit-any
	isOfKind<T extends AstNode>(other: new(...args: any[]) => T): this is T {
		return this instanceof other;
	}

    /** Accepts a visitor to traverse this node. */
    abstract accept<T>(visitor: Visitor<T>): T;
}