import type { Identifier, Program } from "./astNodes.ts";
import { BlockExpr, type BinaryExpr, type UnaryExpr, type FnCallExpr, type FnExpr, type Literal, type TupleExpr, type ImmediateCallExpr } from "./expression.ts";
import { Keywords, KeywordMapping } from "./keywords.ts";
import { OperationMapping, type Operator } from "./operators.ts";
import { type VariableDeclarationStatement, type ExpressionStatement, type FnDeclarationStatement, type ReturnStatement, FnKind } from "./statements.ts";
import type { Visitor } from "./visitor.ts";
import { specialCharsMapping, TokenKind } from "./token.ts";

/** A very crude AST printer that tries to reconstruct the source code from the AST.
 * One should consider breakable token-wise scanning for pretty-printing.
 */
export class SimpleAstPrinter implements Visitor<string> {
    private readonly paddingSpaces: number;
    private padLevel = 0;
    constructor(paddingSpaces = 2) {
        this.paddingSpaces = paddingSpaces;
    }
    private pad() {
        return " ".repeat(this.paddingSpaces * this.padLevel);
    }

    visitProgram(node: Program): string {
        return node.body.map((s) => s.accept(this)).join("\n");
    }
    visitVariableDeclaration(node: VariableDeclarationStatement): string {
        return `let ${node.mutable ? 'var ': ''}${node.ident.name} = ${node.value.accept(this)};`;
    }
    visitExpressionStmt(node: ExpressionStatement): string {
        return `${node.expr.accept(this)};`;
    }
    visitReturnStmt(node: ReturnStatement): string {
        return `return ${node.expr.accept(this)};`;
    }
    visitFnDeclaration(node: FnDeclarationStatement): string {
        return [
            `${node.kind === FnKind.Action ? 'action' : 'compute'}`,
            ` ${node.ident.accept(this)}`,
            `(${node.params.map((p) => p.name).join(", ")}) -> `,
            node.body.accept(this)
        ].join("");
    }
    visitBlock(node: BlockExpr): string {
        let out = `{\n`;
        this.padLevel++;
        out += `${node.body.map((s) => this.pad() + s.accept(this)).join("\n")}`;
        this.padLevel--;
        out += `\n${this.pad()}}`;
        return out;
    }
    visitBinary(node: BinaryExpr): string {
        return `(${node.left.accept(this)} ${node.operator.accept(this)} ${node.right.accept(this)})`;
    }
    visitUnary(node: UnaryExpr): string {
        return `(${node.operator.accept(this)}${node.expr.accept(this)})`;
    }
    visitFnCall(node: FnCallExpr): string {
        return `${node.ident.accept(this)}(${node.args.map((a) => a.accept(this)).join(", ")})`;
    }
    visitImmediateFnCall(node: ImmediateCallExpr): string {
        return `(${node.fnValue.accept(this)})(${node.args.map((a) => a.accept(this)).join(", ")})`;
    }
    visitFn(node: FnExpr): string {
        const body = node.body;
        return [
            `${node.kind === FnKind.Action ? 'action' : 'compute'}`,
            `${node.ident ? ' ' + node.ident.accept(this) : ''}`,
            `(${node.params.map((p) => p.name).join(", ")}) -> `,
            body instanceof BlockExpr ? body.accept(this) : `(${body.accept(this)})`
        ].join("");
    }
    visitTuple(node: TupleExpr): string {
        return `(${node.expressions.map((e) => e.accept(this)).join(", ")})`;
    }
    visitIdentifier(node: Identifier) {
        return node.name;
    }
    visitLiteral(node: Literal): string {
        if (node.kind === TokenKind.StrLiteral) {
            return `"${node.value}"`;
        } else if (node.kind === TokenKind.CharLiteral) {
            return `'${node.value}'`;
        } else if (node.kind === TokenKind.RawStrLiteral) {
            return `r"${node.value}"`;
        }
        return node.value;
    }

    visitOperator(node: Operator): string {
        const reversed = OperationMapping.get(node.operation);
        if (!reversed) {
            throw new Error(`Could not resolve operator ${node.operation}`);
        }
        return reversed in Keywords ?
            KeywordMapping.get(reversed as Keywords)!
            : specialCharsMapping.getReverse(reversed as TokenKind)!;
    }
}