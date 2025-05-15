import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
// import fetch from 'node-fetch'; // Ensure node-fetch is installed: npm install node-fetch

// Material Icon categories based on Google Material Design
const MATERIAL_CATEGORIES = [
  "action",
  "alert",
  "av",
  "communication",
  "content",
  "device",
  "editor",
  "file",
  "hardware",
  "home",
  "image",
  "maps",
  "navigation",
  "notification",
  "places",
  "search",
  "social",
  "toggle",
];

// Icon variants supported by Material Symbols
const ICON_VARIANTS = [""];
// const ICON_VARIANTS = ['filled', 'outlined', 'rounded', 'sharp', 'two-tone'];

interface MaterialIcon {
  name: string;
  category: string;
  tags?: string[];
  description?: string;
  svgContent?: string; // Embedded SVG content
  variant?: string; // Icon variant (filled, outlined, etc.)
}

// Load icons from local storage or fetch from Google Fonts
async function loadIcons(): Promise<MaterialIcon[]> {
  try {
    // Check for custom icons path in configuration
    const config = vscode.workspace.getConfiguration("materialIcons");
    const customPath = config.get<string>("customIconsPath");

    if (customPath && fs.existsSync(customPath)) {
      const iconData = fs.readFileSync(customPath, "utf8");
      return JSON.parse(iconData);
    }

    // Check for workspace icons
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (workspacePath) {
      const userIconsPath = path.join(workspacePath, "material-icons.json");
      if (fs.existsSync(userIconsPath)) {
        const iconData = fs.readFileSync(userIconsPath, "utf8");
        return JSON.parse(iconData);
      }
    }

    // Load cached icons from extension resources
    const extensionPath = vscode.extensions.getExtension(
      "EMK.material-icons-autocomplete"
    )?.extensionPath;
    if (extensionPath) {
      const cachePath = path.join(
        extensionPath,
        "resources",
        "material-icons-cache.json"
      );
      if (fs.existsSync(cachePath)) {
        const iconData = fs.readFileSync(cachePath, "utf8");
        const icons = JSON.parse(iconData);
        // Embed SVG content for cached icons
        for (const icon of icons) {
          const svgPath = path.join(
            extensionPath,
            "resources",
            "icons",
            `${icon.name}_${icon.variant || "filled"}.svg`
          );
          if (fs.existsSync(svgPath)) {
            icon.svgContent = fs.readFileSync(svgPath, "utf8");
          }
        }
        return icons;
      }
    }

    // Fetch full icon list from Google Fonts if no local cache
    const icons = await fetchMaterialIcons();
    if (extensionPath && icons.length) {
      // Cache icons locally
      const cachePath = path.join(
        extensionPath,
        "resources",
        "material-icons-cache.json"
      );
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(cachePath, JSON.stringify(icons, null, 2));

      // Optionally cache a subset of SVG files
      const iconDir = path.join(extensionPath, "resources", "icons");
      fs.mkdirSync(iconDir, { recursive: true });
      // Example: Cache first 100 icons (adjust based on needs)
      for (const icon of icons.slice(0, 100)) {
        try {
          const svgUrl = `https://fonts.gstatic.com/s/i/materialicons${""}/${
            icon.name
          }/v1/24px.svg`;
          const response = await fetch(svgUrl);
          if (response.ok) {
            const svgContent = await response.text();
            fs.writeFileSync(
              path.join(
                iconDir,
                `${icon.name}_${icon.variant || "filled"}.svg`
              ),
              svgContent
            );
            icon.svgContent = svgContent;
          }
        } catch (error) {
          console.warn(`Failed to fetch SVG for ${icon.name}:`, error);
        }
      }
    }

    return icons;
  } catch (error) {
    console.error("Error loading icons:", error);
    return [];
  }
}

// Fetch complete Material Icons list from Google Fonts or GitHub
async function fetchMaterialIcons(): Promise<MaterialIcon[]> {
  try {
    // Use Google Fonts API or GitHub codepoints file
    const codepointsUrl =
      "https://raw.githubusercontent.com/google/material-design-icons/master/font/MaterialIcons-Regular.codepoints";
    const response = await fetch(codepointsUrl);
    if (!response.ok) throw new Error("Failed to fetch codepoints");

    const text = await response.text();
    const icons: MaterialIcon[] = [];
    const lines = text.split("\n").filter((line: string) => line.trim());

    for (const line of lines) {
      const [name, _codepoint] = line.split(" ");
      // Assign a category (simplified; ideally map from metadata)
      const category =
        MATERIAL_CATEGORIES.find((cat) => name.includes(cat)) || "other";
      // Add all variants
      // for (const variant of ['filled', ...ICON_VARIANTS.slice(1)]) {
      icons.push({
        name,
        category,
        tags: [name, category],
        // variant,
        description: `Material Icon: ${name}`,
      });
      // }
    }

    return icons;
  } catch (error) {
    console.error("Error fetching Material Icons:", error);
    // Fallback to minimal set
    return MATERIAL_CATEGORIES.flatMap((category) => [
      { name: `${category}_icon`, category, tags: [category] },
    ]);
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log("Material Icons Autocomplete extension is now active");

  let materialIcons: MaterialIcon[] = [];
  loadIcons().then((icons) => {
    materialIcons = icons;
    if (!materialIcons.length) {
      vscode.window.showWarningMessage(
        "No material icons found. Please add material-icons.json to your workspace or ensure network connectivity."
      );
    }
  });

  // Completion provider for Angular Material supported languages
  const provider = vscode.languages.registerCompletionItemProvider(
    ["html", "typescript", "javascript", "typescriptreact", "javascriptreact"],
    {
      provideCompletionItems(document, position) {
        const linePrefix = document
          .lineAt(position)
          .text.substring(0, position.character);
        if (!/<mat-icon[^>]*?>.*$/i.test(linePrefix)) return undefined;

        return materialIcons.map((icon) => {
          const item = new vscode.CompletionItem(
            `${icon.name}`,
            vscode.CompletionItemKind.Value
          );
          item.detail = `${icon.category} icon `;
          item.insertText = icon.name;

          const doc = new vscode.MarkdownString(undefined, true);
          doc.isTrusted = true;

          doc.appendMarkdown(`## ${icon.name} \n\n`);
          doc.appendMarkdown(`**Category:** ${icon.category}\n\n`);
          if (icon.tags?.length) {
            doc.appendMarkdown(`**Tags:** ${icon.tags.join(", ")}\n\n`);
          }
          if (icon.description) {
            doc.appendMarkdown(`**Description:** ${icon.description}\n\n`);
          }
          if (icon.svgContent) {
            doc.appendMarkdown(
              `![Icon](data:image/svg+xml;base64,${Buffer.from(
                icon.svgContent
              ).toString("base64")})\n\n`
            );
          } else {
            doc.appendMarkdown(
              `![Icon](https://fonts.gstatic.com/s/i/materialicons${
                icon.variant ? icon.variant : ""
              }/${icon.name}/v1/24px.svg)\n\n`
            );
          }

          doc.appendMarkdown("**Usage:**\n```html\n");
          if (icon.variant && icon.variant !== "filled") {
            doc.appendMarkdown(
              `<mat-icon fontSet="material-icons-${icon.variant}">${icon.name}</mat-icon>\n`
            );
          } else {
            doc.appendMarkdown(`<mat-icon>${icon.name}</mat-icon>\n`);
          }
          doc.appendMarkdown("```");

          item.documentation = doc;

          return item;
        });
      },
    },
    ...">abcdefghijklmnopqrstuvwxyz".split("")
  );

  const iconPickerCommand = vscode.commands.registerCommand(
    "materialIcons.showIconPicker",
    async () => {
      let targetEditor = vscode.window.activeTextEditor;
      if (!targetEditor) {
        // Check if there are any visible editors
        const visibleEditors = vscode.window.visibleTextEditors;
        if (visibleEditors.length === 0) {
          vscode.window.showErrorMessage(
            "No active text editor found. Please open a file to use the icon picker."
          );
          return;
        }
        targetEditor = visibleEditors[0]; // Use the first visible editor as fallback
      }

      const panel = vscode.window.createWebviewPanel(
        "materialIconPicker",
        "Material Icon Picker",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );
      const targetDocumentUri = targetEditor.document.uri;

      const html = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      padding: 20px;
      background: var(--vscode-editor-background, #fff);
      color: var(--vscode-foreground, #000);
    }
    .controls { margin-bottom: 20px; display: flex; gap: 10px; align-items: center; }
    input, select {
      padding: 8px;
      background: var(--vscode-input-background, #fff);
      color: var(--vscode-input-foreground, #000);
      border: 1px solid var(--vscode-input-border, #ccc);
      border-radius: 4px;
      width: 200px;
    }
    .icon-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 15px;
    }
    .icon {
      text-align: center;
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .icon:hover {
      background: var(--vscode-list-hoverBackground, #f0f0f0);
    }
    .icon img {
      width: 24px;
      height: 24px;
      filter: var(--vscode-icon-filter, none);
    }
    .icon span {
      font-size: 11px;
      display: block;
      margin-top: 6px;
      word-break: break-all;
    }
    @media (prefers-color-scheme: dark) {
      body { background: var(--vscode-editor-background, #1e1e1e); }
      input, select { background: var(--vscode-input-background, #3c3c3c); }
      .icon:hover { background: var(--vscode-list-hoverBackground, #2a2d2e); }
    }
  </style>
</head>
<body>
  <div class="controls">
    <input type="text" id="searchInput" placeholder="Search icons...">
    <select id="categoryFilter">
      <option value="">All Categories</option>
      ${MATERIAL_CATEGORIES.map(
        (cat) => `<option value="${cat}">${cat}</option>`
      ).join("")}
      <option value="other">Other</option>
    </select>
    <select id="variantFilter">
      <option value="">All Variants</option>
      ${ICON_VARIANTS.map(
        (variant) => `<option value="${variant}">${variant}</option>`
      ).join("")}
    </select>
  </div>
  <div class="icon-grid" id="iconGrid"></div>
  <script>
    const vscode = acquireVsCodeApi();
    const icons = ${JSON.stringify(materialIcons)};
    const grid = document.getElementById('iconGrid');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const variantFilter = document.getElementById('variantFilter');

    function renderIcons(filteredIcons) {
      grid.innerHTML = '';
      filteredIcons.forEach(icon => {
        const div = document.createElement('div');
        div.className = 'icon';
        const img = document.createElement('img');
        img.src = icon.svgContent
          ? 'data:image/svg+xml;base64,' + btoa(icon.svgContent)
          : 'https://fonts.gstatic.com/s/i/materialicons' + (icon.variant ? icon.variant : '') + '/' + icon.name + '/v1/24px.svg';
        img.alt = icon.name;

        const label = document.createElement('span');
        label.textContent = icon.name;

        div.appendChild(img);
        div.appendChild(label);

        div.addEventListener('click', () => {
          vscode.postMessage({ command: 'insertIcon', icon: icon.name, variant: icon.variant });
        });

        grid.appendChild(div);
      });
    }

    function filterIcons() {
      const search = searchInput.value.toLowerCase();
      const category = categoryFilter.value;
      const variant = variantFilter.value;
      const filtered = icons.filter(icon => 
        (!search || icon.name.toLowerCase().includes(search) || icon.tags?.some(tag => tag.toLowerCase().includes(search))) &&
        (!category || icon.category === category) &&
        (!variant || icon.variant === variant)
      );
      renderIcons(filtered);
    }

    searchInput.addEventListener('input', filterIcons);
    categoryFilter.addEventListener('change', filterIcons);
    variantFilter.addEventListener('change', filterIcons);
    renderIcons(icons);
  </script>
</body>
</html>`;

      panel.webview.html = html;

      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === "insertIcon") {
          // Find the editor with the matching document URI
          let editor: vscode.TextEditor | undefined =
            vscode.window.activeTextEditor;
          if (
            !editor ||
            editor.document.uri.toString() !== targetDocumentUri.toString()
          ) {
            // Search visible editors for the target document
            editor = vscode.window.visibleTextEditors.find(
              (ed) =>
                ed.document.uri.toString() === targetDocumentUri.toString()
            );
          }

          if (!editor) {
            // Attempt to open the document and create an editor
            try {
              const document = await vscode.workspace.openTextDocument(
                targetDocumentUri
              );
              editor = await vscode.window.showTextDocument(document, {
                viewColumn: targetEditor!.viewColumn,
                preserveFocus: true,
              });
            } catch (error) {
              vscode.window.showErrorMessage(
                "Failed to restore the target editor. Please open the file and try again."
              );
              console.error("Error restoring editor:", error);
              panel.dispose();
              return;
            }
          }

          // Insert the appropriate snippet
          const iconName = message.icon;
          const variant = message.variant;
          let snippet;
          if (variant && variant !== "filled") {
            snippet = new vscode.SnippetString(
              `<mat-icon fontSet="material-icons-${variant}">${iconName}</mat-icon>`
            );
          } else {
            snippet = new vscode.SnippetString(
              `<mat-icon>${iconName}</mat-icon>`
            );
          }

          await editor.insertSnippet(snippet);
          panel.dispose();

          // Restore focus to the editor
          await vscode.window.showTextDocument(editor.document, {
            viewColumn: editor.viewColumn,
            preserveFocus: false,
          });
        }
      });
    }
  );

  const saveIconCommand = vscode.commands.registerCommand(
    "materialIcons.saveCustomIcon",
    async () => {
      const iconName = await vscode.window.showInputBox({
        prompt: "Enter the icon name",
      });
      if (!iconName) return;

      const category = await vscode.window.showInputBox({
        prompt: "Enter the icon category",
        placeHolder: MATERIAL_CATEGORIES.join(", ") + ", other",
      });
      if (!category) return;

      const tags = await vscode.window.showInputBox({
        prompt: "Enter tags (comma separated)",
      });
      const svgContent = await vscode.window.showInputBox({
        prompt: "Enter SVG content (optional)",
      });
      const variant = await vscode.window.showQuickPick(ICON_VARIANTS, {
        placeHolder: "Select icon variant (optional)",
      });

      const newIcon: MaterialIcon = {
        name: iconName,
        category,
        tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
        svgContent,
        variant: variant || "filled",
        description: `Custom icon: ${iconName}`,
      };

      materialIcons.push(newIcon);

      try {
        const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (workspacePath) {
          const userIconsPath = path.join(workspacePath, "material-icons.json");
          fs.writeFileSync(
            userIconsPath,
            JSON.stringify(materialIcons, null, 2)
          );
          vscode.window.showInformationMessage(
            `Icon "${iconName}" has been saved.`
          );
        } else {
          vscode.window.showErrorMessage(
            "No workspace folder found to save icon."
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage("Failed to save the custom icon.");
        console.error(error);
      }
    }
  );

  context.subscriptions.push(provider, iconPickerCommand, saveIconCommand);
}

export function deactivate() {}
