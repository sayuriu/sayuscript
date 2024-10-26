import { tryWrapper } from "./util.ts";
import { BidirectionalMap } from "./util.ts";

export enum Keywords {
    Let = 0x100,
    Var,
    As,
    Action,
}

export const KeywordMapping = new BidirectionalMap<Keywords, string>([
    [Keywords.Let, "let"],
    [Keywords.Var, "var"],
    [Keywords.As, "as"],
    [Keywords.Action, "action"],
]);

export function resolveKeyword(kw: string): Keywords {
    const resolved = KeywordMapping.getReverse(kw);
    if (!resolved)
        throw new Error(`Unknown keyword: ${kw}`);
    return resolved;
}

export const tryResolveKeyword = tryWrapper(resolveKeyword);

