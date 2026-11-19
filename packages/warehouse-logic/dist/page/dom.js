// Small DOM builders for the test page (plan WP6). Text is always set as text, never as HTML, so a
// value typed into the page can't turn into markup. Tailwind compiles the classes written here, so a
// class must appear whole in this file or in src/index.html.
/** An element with optional classes and children; a string child becomes a text node. */
export function element(tag, className = "", children = []) {
    const node = document.createElement(tag);
    if (className !== "") {
        node.className = className;
    }
    node.append(...children);
    return node;
}
/** Code, such as a function call, set in the page's monospaced style. */
export function code(text) {
    return element("code", "rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-slate-800 wrap-anywhere", [text]);
}
/** The calls a panel made, one per line, as a list. */
export function callList(calls) {
    if (calls.length === 0) {
        return element("p", "text-sm text-slate-700", ["No function called: every entry, in its order."]);
    }
    return element("ul", "space-y-1", calls.map((call) => element("li", "", [code(call)])));
}
/** A line of text in the page's small style. */
export function note(text) {
    return element("p", "text-sm text-slate-700", [text]);
}
/** A label and its value, as a row of a definition list. */
export function definitionList(entries) {
    return element("dl", "grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]", entries.flatMap(([term, value]) => [
        element("dt", "font-semibold text-slate-900", [term]),
        element("dd", "mb-2 text-slate-800 sm:mb-0", [value]),
    ]));
}
/**
 * A table in a region that scrolls sideways on a narrow screen, so the page itself never does. The
 * region can take focus, so it can be scrolled from the keyboard, and is named by the caption.
 */
export function table(caption, headers, rows) {
    const head = element("thead", "bg-slate-100", [
        element("tr", "", headers.map((header) => {
            const cell = element("th", "px-3 py-2 text-left font-semibold whitespace-nowrap text-slate-900", [header]);
            cell.scope = "col";
            return cell;
        })),
    ]);
    const body = element("tbody", "", rows.map((row) => element("tr", "border-t border-slate-200", row.map((value) => element("td", "px-3 py-2 align-top whitespace-nowrap text-slate-800", [value])))));
    const tableNode = element("table", "min-w-full text-sm", [
        element("caption", "px-3 py-2 text-left text-sm font-semibold text-slate-900", [caption]),
        head,
        body,
    ]);
    const region = element("div", "overflow-x-auto rounded-lg border border-slate-200 bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700", [tableNode]);
    region.tabIndex = 0;
    region.setAttribute("role", "region");
    region.setAttribute("aria-label", caption);
    return region;
}
/** A short label in colour, for a result such as "Valid" or "Not suitable". */
export function badge(text, tone) {
    const toneClass = {
        good: "bg-emerald-100 text-emerald-900",
        bad: "bg-rose-100 text-rose-900",
        neutral: "bg-slate-200 text-slate-900",
    }[tone];
    return element("span", `inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneClass}`, [text]);
}
/** Replaces what an output region shows. */
export function show(output, children) {
    output.replaceChildren(...children);
}
/** The element with this id, which the page must have. */
export function byId(id) {
    const found = document.getElementById(id);
    if (found === null) {
        throw new Error(`The page has no element with id "${id}"`);
    }
    return found;
}
