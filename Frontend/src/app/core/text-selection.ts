export function getTextBounds(range: Range) {
  const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
  let bounds: { top: number; left: number; right: number } | undefined;

  for (let node = walker.currentNode; node; node = walker.nextNode()!) {
    if (node.nodeType !== Node.TEXT_NODE || !range.intersectsNode(node)) {
      continue;
    }

    const textRange = document.createRange();
    textRange.selectNodeContents(node);

    if (node === range.startContainer) {
      textRange.setStart(node, range.startOffset);
    }

    if (node === range.endContainer) {
      textRange.setEnd(node, range.endOffset);
    }

    if (!textRange.toString().trim()) {
      continue;
    }

    for (const rect of Array.from(textRange.getClientRects())) {
      if (!rect.width) {
        continue;
      }

      bounds = bounds
        ? {
            top: Math.min(bounds.top, rect.top),
            left: Math.min(bounds.left, rect.left),
            right: Math.max(bounds.right, rect.right),
          }
        : { top: rect.top, left: rect.left, right: rect.right };
    }
  }

  return bounds;
}
