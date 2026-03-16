export function renderStructuredContent(node: any): string {
  if (!node) return "";

  // plain string
  if (typeof node === "string") {
    return node;
  }

  // arrays
  if (Array.isArray(node)) {
    return node.map(renderStructuredContent).join("");
  }

  // nodes with tags
  if (node.tag) {
    const attrs = [];

    if (node.lang) attrs.push(`lang="${node.lang}"`);
    if (node.title) attrs.push(`title="${node.title}"`);
    if (node.href) attrs.push(`href="${node.href}"`);

    const inner = renderStructuredContent(node.content);

    return `<${node.tag} ${attrs.join(" ")}>${inner}</${node.tag}>`;
  }

  // nodes with content but no tag
  if (node.content) {
    return renderStructuredContent(node.content);
  }

  return "";
}