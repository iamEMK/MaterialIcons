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
const ICON_VARIANTS = ["filled", "outlined", "rounded", "sharp", "two-tone"];

// Memory cache for icons
let materialIconsCache: MaterialIcon[] | null = null;

interface MaterialIcon {
  name: string;
  category: string;
  tags?: string[];
  description?: string;
  svgContent?: string; // Embedded SVG content
  variant?: string; // Icon variant (filled, outlined, etc.)
}

// Load icons from local storage or fetch from Google Fonts
async function loadIcons(): Promise<MaterialIcon[] | null> {
  // Return cached icons if available
  if (materialIconsCache) {
    return materialIconsCache;
  }

  try {
    // Check for custom icons path in configuration
    const config = vscode.workspace.getConfiguration("materialIcons");
    const customPath = config.get<string>("customIconsPath");

    if (customPath && fs.existsSync(customPath)) {
      const iconData = fs.readFileSync(customPath, "utf8");
      materialIconsCache = JSON.parse(iconData);
      return materialIconsCache;
    }

    // Check for workspace icons
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (workspacePath) {
      const userIconsPath = path.join(workspacePath, "material-icons.json");
      if (fs.existsSync(userIconsPath)) {
        const iconData = fs.readFileSync(userIconsPath, "utf8");
        materialIconsCache = JSON.parse(iconData);
        return materialIconsCache;
      }
    }

    // Load cached icons from extension resources
    const extensionPath = vscode.extensions.getExtension(
      "iamEMK.material-icons-autocomplete"
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
        
        // Lazy-load SVG content - only load when requested rather than all at once
        materialIconsCache = icons.map((icon:any) => ({
          ...icon,
          // Remove svgContent to avoid loading all SVGs immediately
          svgContent: undefined,
          // Add property to track SVG path for lazy loading
          _svgPath: path.join(
            extensionPath,
            "resources",
            "icons",
            `${icon.name}_${icon.variant || "filled"}.svg`
          )
        }));
        
        return materialIconsCache;
      }
    }

    // Fetch full icon list from Google Fonts if no local cache
    const icons = await fetchMaterialIcons();
    
    // Cache icons to file system
    if (extensionPath && icons.length) {
      // Create cache directory if it doesn't exist
      const resourcesDir = path.join(extensionPath, "resources");
      const iconDir = path.join(resourcesDir, "icons");
      fs.mkdirSync(resourcesDir, { recursive: true });
      fs.mkdirSync(iconDir, { recursive: true });
      
      // Cache the icon metadata
      const cachePath = path.join(resourcesDir, "material-icons-cache.json");
      fs.writeFileSync(cachePath, JSON.stringify(icons, null, 2));

      // Instead of caching all SVGs upfront, we'll fetch them on demand
      // This is handled when the icon is requested via the getSvgContent function
    }

    materialIconsCache = icons;
    return icons;
  } catch (error) {
    console.error("Error loading icons:", error);
    return [];
  }
}

// Function to get SVG content - lazy loads from disk or fetches from network
async function getSvgContent(icon: MaterialIcon | any): Promise<string | undefined> {
  // If already loaded, return it
  if (icon.svgContent) {
    return icon.svgContent;
  }
  
  try {
    // Check if we have a path to load from
    if ('_svgPath' in icon && fs.existsSync(icon._svgPath)) {
      icon.svgContent = fs.readFileSync(icon._svgPath, "utf8");
      return icon.svgContent;
    }
    
    // Otherwise fetch from network
    const variant = icon.variant || '';
    const svgUrl = `https://fonts.gstatic.com/s/i/materialicons${variant}/${icon.name}/v1/24px.svg`;
    const response = await fetch(svgUrl);
    
    if (response.ok) {
      const svgContent = await response.text();
      icon.svgContent = svgContent;
      
      // Save to disk for future use if we can
      const extensionPath = vscode.extensions.getExtension(
        "iamEMK.material-icons-autocomplete"
      )?.extensionPath;
      
      if (extensionPath) {
        const iconDir = path.join(extensionPath, "resources", "icons");
        fs.mkdirSync(iconDir, { recursive: true });
        const filePath = path.join(
          iconDir,
          `${icon.name}_${icon.variant || "filled"}.svg`
        );
        fs.writeFileSync(filePath, svgContent);
      }
      
      return svgContent;
    }
  } catch (error) {
    console.warn(`Failed to get SVG for ${icon.name}:`, error);
  }
  
  return undefined;
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

    // Use a Set to track unique icon names
    const iconNames = new Set<string>();

    for (const line of lines) {
      const [name, _codepoint] = line.split(" ");
      
      // Skip if we've already added this icon name
      if (iconNames.has(name)) continue;
      iconNames.add(name);
      
      // Assign a category (simplified; ideally map from metadata)
      const category =
        MATERIAL_CATEGORIES.find((cat) => name.includes(cat)) || "other";
      
      // Add icon with default variant
      icons.push({
        name,
        category,
        tags: [name, category],
        variant: "filled", // Default variant
        description: `Material Icon: ${name}`,
      });
    }

    return icons;
  } catch (error) {
    console.error("Error fetching Material Icons:", error);
    // Fallback to minimal set
    return MATERIAL_CATEGORIES.flatMap((category) => [
      { name: `${category}_icon`, category, tags: [category], variant: "filled" },
    ]);
  }
}

// Debounce function to prevent excessive processing
function debounce<F extends (...args: any[]) => any>(func: F, wait: number): (...args: Parameters<F>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<F>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}

// Filter icons with debouncing
const filterIconsDebounced = debounce((
  search: string, 
  category: string, 
  variant: string,
  callback: (icons: MaterialIcon[]) => void,
  allIcons: MaterialIcon[]
) => {
  const filtered = allIcons.filter(icon => 
    (!search || 
      icon.name.toLowerCase().includes(search.toLowerCase()) || 
      icon.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))) &&
    (!category || icon.category === category) &&
    (!variant || icon.variant === variant)
  );
  
  callback(filtered);
}, 250); // 250ms debounce

export function activate(context: vscode.ExtensionContext) {
  console.log("Material Icons Autocomplete extension is now active");

  let materialIcons: MaterialIcon[] | any = [];
  
  // Load icons asynchronously
  const iconsPromise = loadIcons().then((icons) => {
    materialIcons = icons;
    if (!materialIcons.length) {
      vscode.window.showWarningMessage(
        "No material icons found. Please add material-icons.json to your workspace or ensure network connectivity."
      );
    }
    return icons;
  });

  // Completion provider for Angular Material supported languages
  // const provider = vscode.languages.registerCompletionItemProvider(
  //   ["html", "typescript", "javascript", "typescriptreact", "javascriptreact"],
  //   {
  //     async provideCompletionItems(document, position) {
  //       const linePrefix = document
  //         .lineAt(position)
  //         .text.substring(0, position.character);
        
  //       // Only activate inside <mat-icon> tags
  //       if (!/<mat-icon[^>]*?>.*$/i.test(linePrefix)) return undefined;

  //       // Ensure icons are loaded
  //       if (!materialIcons.length) {
  //         materialIcons = await iconsPromise;
  //       }

  //       // Get the current word being typed to limit results
  //       // const currentWord = document.getText(
  //       //   new vscode.Range(
  //       //     position.line, 
  //       //     Math.max(0, linePrefix.lastIndexOf(" ") + 1), 
  //       //     position.line, 
  //       //     position.character
  //       //   )
  //       // ).toLowerCase();
  //       // Find the opening tag and get only the text after it
  //       const openTagIndex = linePrefix.lastIndexOf("<mat-icon");
  //       const closeBracketIndex = linePrefix.indexOf(">", openTagIndex);
  //       const startPosition = closeBracketIndex !== -1 ? closeBracketIndex + 1 : position.character;
  //       const currentWord = document.getText(
  //         new vscode.Range(
  //           position.line,
  //           startPosition,
  //           position.line,
  //           position.character
  //         )
  //       ).toLowerCase().trim();
        
  //       // Filter by current word to improve performance
  //       const filteredIcons = materialIcons.filter((icon:any) => 
  //         icon.name.toLowerCase().includes(currentWord) ||
  //         icon.tags?.some((tag:any) => tag.toLowerCase().includes(currentWord))
  //       );

  //       // Limit results for better performance
  //       const limitedIcons = filteredIcons.slice(0, 100);

  //       return limitedIcons.map((icon:any) => {
  //         const item = new vscode.CompletionItem(
  //           `${icon.name}`,
  //           vscode.CompletionItemKind.Value
  //         );
  //         item.detail = `${icon.category} icon`;
  //         item.filterText = icon.name + ' ' + (icon.tags?.join(' ') || '');
  //         item.insertText = icon.name;
  //         item.sortText = icon.name; // For proper sorting

  //         const doc = new vscode.MarkdownString(undefined, true);
  //         doc.isTrusted = true;

  //         doc.appendMarkdown(`## ${icon.name} \n\n`);
  //         doc.appendMarkdown(`**Category:** ${icon.category}\n\n`);
  //         if (icon.tags?.length) {
  //           doc.appendMarkdown(`**Tags:** ${icon.tags.join(", ")}\n\n`);
  //         }
  //         if (icon.description) {
  //           doc.appendMarkdown(`**Description:** ${icon.description}\n\n`);
  //         }
          
  //         // Use placeholder SVG URL - actual SVG will be fetched when needed
  //         doc.appendMarkdown(
  //           `![Icon](https://fonts.gstatic.com/s/i/materialicons${
  //             icon.variant ? icon.variant : ""
  //           }/${icon.name}/v1/24px.svg)\n\n`
  //         );

  //         doc.appendMarkdown("**Usage:**\n```html\n");
  //         if (icon.variant && icon.variant !== "filled") {
  //           doc.appendMarkdown(
  //             `<mat-icon fontSet="material-icons-${icon.variant}">${icon.name}</mat-icon>\n`
  //           );
  //         } else {
  //           doc.appendMarkdown(`<mat-icon>${icon.name}</mat-icon>\n`);
  //         }
  //         doc.appendMarkdown("```");

  //         item.documentation = doc;

  //         return item;
  //       });
  //     },
  //   },
  //   ...">abcdefghijklmnopqrstuvwxyz".split("")
  // );

  const provider = vscode.languages.registerCompletionItemProvider(
    ["html", "typescript", "javascript", "typescriptreact", "javascriptreact"],
    {
      provideCompletionItems(document, position) {
        const linePrefix = document
          .lineAt(position)
          .text.substring(0, position.character);
        if (!/<mat-icon[^>]*?>.*$/i.test(linePrefix)) return undefined;

        return materialIcons.map((icon:any) => {
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

      // Ensure icons are loaded
      if (!materialIcons.length) {
        materialIcons = await iconsPromise;
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

      // Create a smaller payload for the webview by removing svgContent
      const webviewIcons = materialIcons.map(({ name, category, tags, variant } :any) => ({
        name, category, tags, variant 
      }));

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
    .controls { margin-bottom: 20px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
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
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 70px;
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
      max-height: 28px;
      overflow: hidden;
    }
    .loading {
      text-align: center;
      padding: 20px;
      font-style: italic;
      color: var(--vscode-descriptionForeground);
    }
    .pagination {
      margin-top: 20px;
      text-align: center;
    }
    .pagination button {
      padding: 5px 10px;
      margin: 0 5px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 3px;
      cursor: pointer;
    }
    .pagination button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .pagination span {
      margin: 0 10px;
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
  <div id="loading" class="loading">Loading icons...</div>
  <div class="icon-grid" id="iconGrid" style="display: none;"></div>
  <div class="pagination" id="pagination" style="display: none;">
    <button id="prevPage" disabled>Previous</button>
    <span id="pageInfo">Page 1 of 1</span>
    <button id="nextPage">Next</button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const icons = ${JSON.stringify(webviewIcons)};
    const grid = document.getElementById('iconGrid');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const variantFilter = document.getElementById('variantFilter');
    const loadingElement = document.getElementById('loading');
    const paginationElement = document.getElementById('pagination');
    const prevPageButton = document.getElementById('prevPage');
    const nextPageButton = document.getElementById('nextPage');
    const pageInfoElement = document.getElementById('pageInfo');
    
    // Pagination state
    let currentPage = 1;
    let itemsPerPage = 100; // Number of icons per page
    let filteredIcons = [...icons];
    
    // Show loading initially
    function showLoading(show) {
      loadingElement.style.display = show ? 'block' : 'none';
      grid.style.display = show ? 'none' : 'grid';
      paginationElement.style.display = show ? 'none' : 'block';
    }
    
    function updatePagination() {
      const totalPages = Math.ceil(filteredIcons.length / itemsPerPage);
      pageInfoElement.textContent = 'Page '+ currentPage + 'of ' + (totalPages || 1);
      prevPageButton.disabled = currentPage <= 1;
      nextPageButton.disabled = currentPage >= totalPages;
    }
    
    function renderCurrentPage() {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, filteredIcons.length);
      const currentIcons = filteredIcons.slice(startIndex, endIndex);
      
      grid.innerHTML = '';
      if (currentIcons.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px;">No icons match your search criteria.</div>';
        return;
      }
      
      currentIcons.forEach(icon => {
        const div = document.createElement('div');
        div.className = 'icon';
        
        const img = document.createElement('img');
        img.src = 'https://fonts.gstatic.com/s/i/materialicons' + (icon.variant ? icon.variant : '') + '/' + icon.name + '/v1/24px.svg';
        img.alt = icon.name;
        img.loading = 'lazy'; // Lazy load images
        
        const label = document.createElement('span');
        label.textContent = icon.name;

        div.appendChild(img);
        div.appendChild(label);

        div.addEventListener('click', () => {
          vscode.postMessage({ command: 'insertIcon', icon: icon.name, variant: icon.variant });
        });

        grid.appendChild(div);
      });
      
      updatePagination();
    }

    function filterIcons() {
      showLoading(true);
      
      // Use setTimeout to ensure UI updates before filtering starts
      setTimeout(() => {
        const search = searchInput.value.toLowerCase();
        const category = categoryFilter.value;
        const variant = variantFilter.value;
        
        filteredIcons = icons.filter(icon => 
          (!search || icon.name.toLowerCase().includes(search) || icon.tags?.some(tag => tag.toLowerCase().includes(search))) &&
          (!category || icon.category === category) &&
          (!variant || icon.variant === variant)
        );
        
        // Reset to first page when filter changes
        currentPage = 1;
        renderCurrentPage();
        showLoading(false);
      }, 10);
    }
    
    // Event handlers
    searchInput.addEventListener('input', filterIcons);
    categoryFilter.addEventListener('change', filterIcons);
    variantFilter.addEventListener('change', filterIcons);
    
    prevPageButton.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderCurrentPage();
      }
    });
    
    nextPageButton.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredIcons.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderCurrentPage();
      }
    });
    
    // Initial render
    filterIcons();
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

      // Check for duplicates before adding
      const existingIconIndex = materialIcons.findIndex((icon:any) => 
        icon.name === iconName && icon.variant === (variant || "filled")
      );

      if (existingIconIndex !== -1) {
        // Update existing icon
        materialIcons[existingIconIndex] = {
          name: iconName,
          category,
          tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
          svgContent,
          variant: variant || "filled",
          description: `Custom icon: ${iconName}`,
        };
      } else {
        // Add new icon
        materialIcons.push({
          name: iconName,
          category,
          tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
          svgContent,
          variant: variant || "filled",
          description: `Custom icon: ${iconName}`,
        });
      }

      // Update cache
      materialIconsCache = materialIcons;

      try {
        const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (workspacePath) {
          const userIconsPath = path.join(workspacePath, "material-icons.json");
          fs.writeFileSync(
            userIconsPath,
            JSON.stringify(materialIcons, null, 2)
          );
          
          vscode.window.showInformationMessage(
            existingIconIndex !== -1
              ? `Icon "${iconName}" has been updated.`
              : `Icon "${iconName}" has been saved.`
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

export function deactivate() {
  // Clear the cache when deactivating
  materialIconsCache = null;
}