import { tryWrapper } from "./util.ts";
import { BidirectionalMap } from "./util.ts";

export enum Keywords {
    Let = 0x100,
    Var,
    As,
    Action,
    Compute,
    Return
}

export const KeywordMapping = new BidirectionalMap<Keywords, string>([
    [Keywords.Let, "let"],
    [Keywords.Var, "var"],
    [Keywords.As, "as"],
    [Keywords.Action, "action"],
    [Keywords.Compute, "compute"],
    [Keywords.Return, "return"]
]);

export function resolveKeyword(kw: string): Keywords {
    const resolved = KeywordMapping.getReverse(kw);
    if (!resolved)
        throw new Error(`Unknown keyword: ${kw}`);
    return resolved;
}

export const tryResolveKeyword = tryWrapper(resolveKeyword);
