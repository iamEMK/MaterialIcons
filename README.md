# Material Icons Autocomplete for VS Code (v0.0.3)

A powerful Visual Studio Code extension that enhances Angular Material development by providing intelligent autocompletion and a visual picker for Material Design Icons within `<mat-icon>` tags. With over 2,500 icons, fast virtual scrolling, and seamless VS Code integration, this extension streamlines icon selection for Angular developers.

## Features

- **Intelligent Autocomplete**: Suggests Material Icons as you type within `<mat-icon>` tags in HTML, TypeScript, JavaScript, TSX, or JSX files.
- **Visual Previews**: Displays icon previews in the autocomplete dropdown, complete with category, tags, and usage examples.
- **Categorized Icons**: Organizes icons into categories (e.g., action, navigation, other) for intuitive browsing.
- **Visual Icon Picker**: A webview-based picker with search, category filters, and virtual scrolling for fast navigation of thousands of icons.
- **Custom Icon Support**: Add your own icons with custom names, categories, tags, and SVG content, saved to your workspace.
- **Optimized Performance**: Virtual scrolling and local caching ensure quick load times, even with a large icon set.
- **Dark Mode Support**: Adapts to VS Code's light and dark themes using native CSS variables.
- **Robust Editor Integration**: Inserts icons into the correct editor, preserving focus and preventing unintended tab creation.

## Version


The version number corresponds to the extension's release, as defined in the package.json file. Check the Releases page for the latest updates and changelog.

## Installation

### Install from VS Code Marketplace (recommended):

1. Open VS Code, go to the Extensions view (Ctrl+Shift+X or Cmd+Shift+X on Mac).
2. Search for Material Icons Autocomplete.
3. Click Install.

## Usage

### Autocomplete

Trigger autocomplete for Material Icons within `<mat-icon>` tags in supported files (HTML, TypeScript, JavaScript, TSX, JSX):

1. Open a file (e.g., app.component.html).
2. Type `<mat-icon>` and place the cursor inside the tag:
   ```html
   <mat-icon><!-- Cursor here --></mat-icon>
   ```

3. Start typing an icon name (e.g., home) to see suggestions.
4. Select an icon from the dropdown to insert it:
   ```html
   <mat-icon>home</mat-icon>
   ```

5. Hover over a suggestion to view a preview, category, tags, and usage example.

### Icon Picker

Access the full icon set via a visual picker:

1. Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P).
2. Run `Material Icons: Show Icon Picker`.
3. Use the search bar to find icons by name or tags (e.g., search, navigation).
4. Filter by category using the dropdown (e.g., action, other).
5. Click an icon to insert it into the active editor:
   ```html
   <mat-icon>favorite</mat-icon>
   ```

### Save Custom Icons

Add your own icons to the autocomplete and picker:

1. Open the Command Palette and run `Material Icons: Save Custom Icon`.
2. Enter:
   - **Icon Name**: The unique name for your icon (e.g., custom_star).
   - **Category**: A category (e.g., action, or other).
   - **Tags**: Comma-separated tags for searching (e.g., star, favorite).
   - **SVG Content**: Optional SVG code for the icon's appearance.

3. The icon is saved to `material-icons.json` in your workspace root and becomes available immediately.

## Configuration

Customize the extension via VS Code settings:

### Custom Icons Path:
Specify a path to a custom material-icons.json file:
```json
{
  "materialIcons.customIconsPath": "/path/to/your/material-icons.json"
}
```

The file should follow this format:
```json
[
  {
    "name": "custom_icon",
    "category": "custom",
    "tags": ["custom", "example"],
    "description": "A custom icon",
    "svgContent": "<svg>...</svg>"
  }
]
```

## Requirements

- **VS Code**: Version 1.85.0 or higher.
- **Node.js**: Version 16.x or higher (for development/build).
- **Internet Connection**: Required for initial icon fetching; cached locally thereafter.
- **File Types**: Works in HTML, TypeScript, JavaScript, TSX, and JSX files.
- **Angular Material**: Recommended for `<mat-icon>` usage, but not required.

## Performance

- **Virtual Scrolling**: The icon picker renders only visible icons, reducing load times to under 1 second for 2,500+ icons.
- **Caching**: Icons are cached in resources/material-icons-cache.json, with up to 50 SVGs stored locally for fast previews.
- **Efficient Filtering**: Search and category filters update instantly, even with large datasets.

## Troubleshooting

- **Slow Initial Load**: Ensure an internet connection for the first load. Check that the resources folder is writable for caching.
- **Autocomplete Not Triggering**: Verify the cursor is inside `<mat-icon>` and the file type is supported. Example:
  ```html
  <mat-icon><!-- Cursor here --></mat-icon>
  ```
- **Icon Picker Fails**: Ensure an editor is open before running the picker command. If no editor is active, an error will prompt you to open a file.
- **Custom Icons Not Showing**: Confirm `material-icons.json` is in the workspace root or a valid customIconsPath is set.
- **Editor Focus Issues**: The extension preserves the active editor's context. If issues persist, report them with VS Code version and steps to reproduce.

## Contributing

1. Fork the repository: github.com/your-username/material-icons-autocomplete.
2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature
   ```
3. Commit changes:
   ```bash
   git commit -m "Add your feature"
   ```
4. Push to the branch:
   ```bash
   git push origin feature/your-feature
   ```
5. Open a Pull Request with a clear description and tests.

Please update the README and include tests for new features.

## License

MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Material Design Icons for the extensive icon library.
- Angular Material for `<mat-icon>` component inspiration.
- VS Code Extension API for enabling robust extension development.

### Manual Installation:

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/material-icons-autocomplete.git
   cd material-icons-autocomplete
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile the extension:
   ```bash
   npm run compile
   ```

4. Package the extension (if needed):
   ```bash
   npm run package
   ```

5. Install the .vsix file via VS Code's Install from VSIX option in the Extensions view.

### Development Setup:

1. Open the project in VS Code.
2. Press F5 to launch the extension in an Extension Development Host window.

## Contact

File issues or feature requests on the GitHub repository. For direct inquiries, reach out to [emkmohan007@gmail.com].

---

Built with ❤️ by MOHANKUMAR E (iamEMK)  
Last updated: May 15, 2025