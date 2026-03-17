export function renderStructuredContent(node: any): string {
  if (!node) return "";

  // plain string
  if (typeof node === "string") return node;

  // array
  if (Array.isArray(node)) {
    return node.map(renderStructuredContent).join("");
  }

  // element node
  if (node.tag) {
    const attrs: string[] = [];

    if (node.lang) attrs.push(`lang="${node.lang}"`);
    if (node.title) attrs.push(`title="${node.title}"`);
    if (node.href) attrs.push(`href="${node.href}"`);

    if (node.class) {
      attrs.push(`class="${node.class}"`);
    }

    if (node.style) {
      const styleString = Object.entries(node.style)
        .map(([k, v]) => `${k}:${v}`)
        .join(";");
      attrs.push(`style="${styleString}"`);
    }

    if (node.data) {
      for (const key in node.data) {
        attrs.push(`data-${key}="${node.data[key]}"`);
      }
    }

    const inner = renderStructuredContent(node.content);

    return `<${node.tag} ${attrs.join(" ")}>${inner}</${node.tag}>`;
  }

  // fallback
  if (node.content) return renderStructuredContent(node.content);

  return "";
}