import type { MindMapNode } from '../types';

/**
 * Parses markdown text into a hierarchical tree structure for mind mapping.
 * Only parses headings (#) and bullet lists.
 * Preserves the original line index of each element to support two-way editing.
 */
export function parseMarkdownToTree(title: string, markdown: string): MindMapNode {
  const root: MindMapNode = {
    id: 'root',
    name: title || '未命名心智圖',
    children: [],
    type: 'root',
    lineIndex: -1
  };

  if (!markdown) {
    return root;
  }

  const lines = markdown.split('\n');
  let inCodeBlock = false;

  // Keep track of active nodes at different heading and indentation levels.
  // Level 0: root
  // Level 1-6: headings
  // Level 7+: list items nested by indentation depth
  const activeNodes: { [level: number]: MindMapNode } = { 0: root };
  
  let lastHeadingLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    const trimmedLine = originalLine.trim();

    // Toggle code block state
    if (trimmedLine.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // 1. Check if it's a heading line
    const headingMatch = originalLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const name = headingMatch[2].trim();

      const newNode: MindMapNode = {
        id: `node-${i}`,
        name,
        children: [],
        type: 'heading',
        headingLevel: level,
        lineIndex: i
      };

      // Find the closest parent heading level (must be < level)
      let parentLevel = level - 1;
      while (parentLevel > 0 && !activeNodes[parentLevel]) {
        parentLevel--;
      }

      const parent = activeNodes[parentLevel] || root;
      parent.children.push(newNode);

      // Save this node as active for its level and clear deeper levels
      activeNodes[level] = newNode;
      lastHeadingLevel = level;

      // Clear any active child headings or list items
      for (const key in activeNodes) {
        const keyNum = parseInt(key, 10);
        if (keyNum > level) {
          delete activeNodes[keyNum];
        }
      }
      continue;
    }

    // 2. Check if it's a list item line
    // Matches: spaces followed by -, *, +, or numbers like 1.
    const listMatch = originalLine.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const indent = listMatch[1].length;
      const listSymbol = listMatch[2];
      const name = listMatch[3].trim();

      // We map list items to level = lastHeadingLevel + 1 + Math.floor(indent / 2)
      // Standard markdown indentation is 2 or 4 spaces
      const listLevel = lastHeadingLevel + 1 + Math.floor(indent / 2);

      const newNode: MindMapNode = {
        id: `node-${i}`,
        name,
        children: [],
        type: 'list',
        indentLevel: indent,
        listSymbol,
        lineIndex: i
      };

      // Find parent (must be < listLevel)
      let parentLevel = listLevel - 1;
      while (parentLevel > 0 && !activeNodes[parentLevel]) {
        parentLevel--;
      }

      const parent = activeNodes[parentLevel] || root;
      parent.children.push(newNode);

      activeNodes[listLevel] = newNode;

      // Clear any active list items deeper than this level
      for (const key in activeNodes) {
        const keyNum = parseInt(key, 10);
        if (keyNum > listLevel) {
          delete activeNodes[keyNum];
        }
      }
    }
  }

  // Fallback: If no headings or list items are found, add a prompt node
  if (root.children.length === 0) {
    root.children.push({
      id: 'no-content',
      name: '尚無大綱（請在編輯器中使用標題或清單列表）',
      children: [],
      type: 'list',
      lineIndex: -1
    });
  }

  return root;
}

/**
 * Updates a specific node name in the markdown text using its line index.
 */
export function updateMarkdownNodeName(
  markdown: string,
  lineIndex: number,
  newName: string,
  node: MindMapNode
): string {
  if (lineIndex < 0) return markdown;

  const lines = markdown.split('\n');
  if (lineIndex >= lines.length) return markdown;

  if (node.type === 'heading' && node.headingLevel) {
    lines[lineIndex] = `${'#'.repeat(node.headingLevel)} ${newName}`;
  } else if (node.type === 'list') {
    const indentStr = ' '.repeat(node.indentLevel || 0);
    const symbol = node.listSymbol || '-';
    lines[lineIndex] = `${indentStr}${symbol} ${newName}`;
  } else {
    // Fallback if type not recognized but index matches
    lines[lineIndex] = newName;
  }

  return lines.join('\n');
}
