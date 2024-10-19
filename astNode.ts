export abstract class ASTNode {
	constructor(public line: number, public startPos: number, public endPos: number) {}
	abstract accept(visitor: ASTVisitor): void;
	abstract repr(): string;
}

