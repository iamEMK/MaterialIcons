import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Interface for Material icon metadata
interface MaterialIcon {
  name: string;
  category: string;
  tags?: string[];
  description?: string;
}

// Load icons from possible locations
function loadIcons(): MaterialIcon[] {
  try {
    const config = vscode.workspace.getConfiguration('materialIcons');
    const customPath = config.get<string>('customIconsPath');

    if (customPath && fs.existsSync(customPath)) {
      const iconData = fs.readFileSync(customPath, 'utf8');
      return JSON.parse(iconData);
    }

    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (workspacePath) {
      const userIconsPath = path.join(workspacePath, 'material-icons.json');
      if (fs.existsSync(userIconsPath)) {
        const iconData = fs.readFileSync(userIconsPath, 'utf8');
        return JSON.parse(iconData);
      }
    }

    const extensionPath = vscode.extensions.getExtension('EMK.material-icons-autocomplete')?.extensionPath;
    if (extensionPath) {
      const iconsPath = path.join(extensionPath, 'resources', 'material-icons.json');
      if (fs.existsSync(iconsPath)) {
        const iconData = fs.readFileSync(iconsPath, 'utf8');
        return JSON.parse(iconData);
      }
    }
  } catch (error) {
    console.error('Error loading icons:', error);
  }

  return [];
}

// Custom completion item with markdown preview
class MaterialIconCompletionItem extends vscode.CompletionItem {
  constructor(icon: MaterialIcon) {
    super(icon.name, vscode.CompletionItemKind.Value);

    this.detail = `${icon.category} icon`;
    this.documentation = new vscode.MarkdownString();
    this.documentation.isTrusted = true;

    this.documentation.appendMarkdown(`## ${icon.name}\n\n`);
    this.documentation.appendMarkdown(`**Category:** ${icon.category}\n\n`);

    if (icon.tags && icon.tags.length > 0) {
      this.documentation.appendMarkdown(`**Tags:** ${icon.tags.join(', ')}\n\n`);
    }

    if (icon.description) {
      this.documentation.appendMarkdown(`**Description:** ${icon.description}\n\n`);
    }
    
    this.documentation.appendMarkdown(`![${icon.name}](https://fonts.gstatic.com/s/i/materialicons/${icon.name}/v1/24px.svg)\n\n`);

    this.documentation.appendMarkdown('**Usage:**\n```html\n<mat-icon>' + icon.name + '</mat-icon>\n```');

    this.insertText = icon.name;
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Material Icons Autocomplete extension is now active');

  let materialIcons = loadIcons();
  if (!materialIcons.length) {
    vscode.window.showWarningMessage('No material icons found. Please add material-icons.json to your workspace.');
  }

  const provider = vscode.languages.registerCompletionItemProvider(
    ['html', 'typescript', 'javascript'],
    {
      provideCompletionItems(document, position) {
        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        if (!/<mat-icon[^>]*?>.*$/i.test(linePrefix)) return undefined;

        return materialIcons.map(icon => new MaterialIconCompletionItem(icon));
      }
    },
    ...'>abcdefghijklmnopqrstuvwxyz'.split('')
  );

  const iconPickerCommand = vscode.commands.registerCommand('materialIcons.showIconPicker', async () => {
    const icons = materialIcons.map(icon => ({
      label: icon.name,
      description: icon.category,
      detail: icon.tags?.join(', ') || ''
    }));

    const selectedIcon = await vscode.window.showQuickPick(icons, {
      placeHolder: 'Search for a Material icon...',
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (selectedIcon) {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        editor.insertSnippet(new vscode.SnippetString(`<mat-icon>${selectedIcon.label}</mat-icon>`));
      }
    }
  });

  const saveIconCommand = vscode.commands.registerCommand('materialIcons.saveCustomIcon', async () => {
    const iconName = await vscode.window.showInputBox({ prompt: 'Enter the icon name' });
    if (!iconName) return;

    const category = await vscode.window.showInputBox({ prompt: 'Enter the icon category' });
    if (!category) return;

    const tags = await vscode.window.showInputBox({ prompt: 'Enter tags (comma separated)' });

    const newIcon: MaterialIcon = {
      name: iconName,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    };

    materialIcons.push(newIcon);

    try {
      const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
      if (workspacePath) {
        const userIconsPath = path.join(workspacePath, 'material-icons.json');
        fs.writeFileSync(userIconsPath, JSON.stringify(materialIcons, null, 2));
        vscode.window.showInformationMessage(`Icon "${iconName}" has been saved.`);
      } else {
        vscode.window.showErrorMessage('No workspace folder found to save icon.');
      }
    } catch (error) {
      vscode.window.showErrorMessage('Failed to save the custom icon.');
      console.error(error);
    }
  });

  context.subscriptions.push(provider, iconPickerCommand, saveIconCommand);
}

export function deactivate() {}
