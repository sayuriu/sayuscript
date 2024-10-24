export class AstNode {
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
}