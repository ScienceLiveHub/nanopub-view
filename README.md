# @sciencelivehub/nanopub-view

> A JavaScript/React library for viewing and rendering nanopublications with beautiful, interactive displays.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Pages Demo](https://img.shields.io/badge/demo-live-success)](https://sciencelive4all.org/nanopub-view/)
[![Status](https://img.shields.io/badge/status-under%20development-orange)](https://github.com/ScienceLiveHub/nanopub-view)

> ⚠️ **Note:** This library is currently under active development as part of the [Science Live Platform](https://github.com/ScienceLiveHub/science-live-platform) project. The API may change. Not yet published to npm.

## ✨ Features

- 🎨 **Beautiful Rendering** - Clean, readable display of nanopublications
- 🔄 **Automatic Template Fetching** - Automatically retrieves and applies nanopub templates
- ⚛️ **React Support** - Ready-to-use React component with TypeScript support
- 📦 **Zero Dependencies** - Lightweight library with no runtime dependencies
- 🎯 **Vanilla JS** - Works in any JavaScript project
- 💅 **Scoped Styling** - CSS won't conflict with your existing styles
- 🔗 **Interactive Features** - Share, copy, download, and cite nanopublications
- 📱 **Responsive** - Works on desktop and mobile devices

## 📦 Installation

> **Currently not published to npm.** Install directly from GitHub:
> 
> **Requirements:** Node.js 20+ (due to Vite 5 requirement)

### For Use in Your Project

```bash
# Install from GitHub
npm install git+https://github.com/ScienceLiveHub/nanopub-view.git

# Or install a specific branch/tag
npm install git+https://github.com/ScienceLiveHub/nanopub-view.git#main
```

### For Local Development

```bash
# Clone the repository
git clone https://github.com/ScienceLiveHub/nanopub-view.git
cd nanopub-view

# Install dependencies
npm install

# Build the library
npm run build

# Link for local testing in other projects
npm link

# In your other project (e.g., science-live-platform)
cd ../your-project
npm link @sciencelivehub/nanopub-view
```

## 🚀 Quick Start

### React Component

```tsx
import { NanopubViewer } from '@sciencelivehub/nanopub-view/react';
import '@sciencelivehub/nanopub-view/dist/nanopub-viewer.css';

function App() {
  return (
    <NanopubViewer 
      uri="https://w3id.org/np/RA6Cz33icPZrBAummwxw6MwdS-RepX-sUjW_fZz905Rvc"
      onLoad={(data) => console.log('Loaded:', data)}
      onError={(err) => console.error('Error:', err)}
    />
  );
}
```

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Install from GitHub first: npm install git+https://github.com/ScienceLiveHub/nanopub-view.git -->
  <link rel="stylesheet" href="node_modules/@sciencelivehub/nanopub-view/dist/nanopub-viewer.css">
  <!-- Required for icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
  <div id="viewer-container"></div>

  <script type="module">
    import { NanopubViewer } from './node_modules/@sciencelivehub/nanopub-view/dist/nanopub-viewer.esm.js';

    const viewer = new NanopubViewer({
      theme: 'default',
      showMetadata: true
    });

    await viewer.renderFromUri(
      document.getElementById('viewer-container'),
      'https://w3id.org/np/RA6Cz33icPZrBAummwxw6MwdS-RepX-sUjW_fZz905Rvc'
    );
  </script>
</body>
</html>
```

## 📖 API Documentation

### React Component Props

```tsx
interface NanopubViewerProps {
  /** Nanopublication URI to fetch and display */
  uri?: string;
  
  /** Nanopublication content (TriG format) to display directly */
  content?: string;
  
  /** Viewer options */
  options?: {
    apiEndpoint?: string;      // Default: 'https://np.petapico.org/'
    theme?: string;             // Default: 'default'
    showMetadata?: boolean;     // Default: true
    fetchTimeout?: number;      // Default: 30000
  };
  
  /** Callback when nanopub is successfully loaded */
  onLoad?: (data: any) => void;
  
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  
  /** Additional CSS class names */
  className?: string;
  
  /** Inline styles */
  style?: React.CSSProperties;
}
```

### JavaScript Class API

#### Constructor

```javascript
const viewer = new NanopubViewer(options);
```

**Options:**
- `apiEndpoint` (string): API endpoint for fetching nanopubs. Default: `'https://np.petapico.org/'`
- `theme` (string): Visual theme. Default: `'default'`
- `showMetadata` (boolean): Show metadata section. Default: `true`
- `fetchTimeout` (number): Request timeout in milliseconds. Default: `30000`

#### Methods

**`renderFromUri(container, uri)`**

Fetch and render a nanopublication from a URI.

```javascript
await viewer.renderFromUri(
  document.getElementById('container'),
  'https://w3id.org/np/RA...'
);
```

**Parameters:**
- `container` (HTMLElement | string): Container element or CSS selector
- `uri` (string): Nanopublication URI

**Returns:** Promise<ParsedNanopub>

---

**`render(container, content)`**

Render nanopublication from content string (TriG format).

```javascript
await viewer.render(
  document.getElementById('container'),
  trigContent
);
```

**Parameters:**
- `container` (HTMLElement | string): Container element or CSS selector
- `content` (string): Nanopublication content in TriG format

**Returns:** Promise<ParsedNanopub>

## 🎨 Styling

The library uses scoped CSS with the `.nanopub-viewer` class. All styles are contained and won't conflict with your application.

### Custom Styling

You can override styles by targeting the scoped classes:

```css
/* Override assertion background */
.nanopub-viewer .assertion-box {
  background: #f0f9ff !important;
}

/* Override title color */
.nanopub-viewer .pub-title {
  color: #1e40af !important;
}
```

### Font Awesome Requirement

The library uses Font Awesome for icons. Include it in your HTML:

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
```

## 🌟 Examples

### Display from URI

```tsx
<NanopubViewer uri="https://w3id.org/np/RA..." />
```

### Display from Content

```tsx
const trigContent = `
@prefix : <http://purl.org/nanopub/temp/mynanopub#> .
@prefix np: <http://www.nanopub.org/nschema#> .
...
`;

<NanopubViewer content={trigContent} />
```

### With Callbacks

```tsx
<NanopubViewer 
  uri="https://w3id.org/np/RA..."
  onLoad={(data) => {
    console.log('Title:', data.title);
    console.log('Author:', data.authorName);
  }}
  onError={(err) => {
    alert(`Failed to load: ${err.message}`);
  }}
/>
```

### Custom Options

```tsx
<NanopubViewer 
  uri="https://w3id.org/np/RA..."
  options={{
    apiEndpoint: 'https://custom-api.example.com/',
    fetchTimeout: 60000,
    showMetadata: false
  }}
/>
```

### Multiple Viewers

```tsx
function Gallery() {
  const nanopubUris = [
    'https://w3id.org/np/RA...',
    'https://w3id.org/np/RB...',
    'https://w3id.org/np/RC...'
  ];

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {nanopubUris.map(uri => (
        <NanopubViewer key={uri} uri={uri} />
      ))}
    </div>
  );
}
```

## 🚧 Development Status

This library is under active development for the [Science Live Platform](https://github.com/ScienceLiveHub/science-live-platform). 

**Current Status:**
- ✅ Core rendering functionality
- ✅ React component wrapper
- ✅ Automatic template fetching
- ✅ Interactive features (share, copy, cite)
- ✅ GitHub Pages demo
- 🚧 Additional visualization modes (planned)
- 🚧 Theming system (planned)
- 🚧 Comprehensive test suite (planned)
- 📅 npm publication (planned after stabilization)

**Roadmap:**
1. Complete integration with Science Live Platform
2. Add multiple display modes (compact, card, inline)
3. Implement theming system
4. Add comprehensive documentation
5. Write tests
6. Stabilize API
7. Publish to npm

**Feedback and contributions are welcome!** Please open an issue if you encounter problems or have suggestions.

## 🔧 Development

### Prerequisites

- Node.js 20+ (required by Vite 5)
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/ScienceLiveHub/nanopub-view.git
cd nanopub-view

# Install dependencies
npm install

# Start demo server
npm run dev
```

The demo will open at http://localhost:3000

### Build

```bash
# Build library for distribution
npm run build

# Output: dist/nanopub-viewer.js, dist/nanopub-viewer.esm.js, dist/nanopub-viewer.css
```

```bash
# Build demo for GitHub Pages
npm run build:demo

# Output: demo-dist/ (deployed automatically via GitHub Actions)
```

```bash
# Preview demo locally
npm run preview
```

**Build System:**

- **Vite** - Fast build tool and dev server
- **Multiple outputs:**
  - `dist/nanopub-viewer.js` - UMD format (for `<script>` tags)
  - `dist/nanopub-viewer.esm.js` - ES module (for `import` statements)
  - `dist/nanopub-viewer.css` - Compiled and scoped styles
- **Automatic deployment:** Pushing to `main` triggers GitHub Actions to rebuild and deploy the demo

### Project Structure

```
nanopub-view/
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Actions: Auto-deploy demo to GitHub Pages
├── src/
│   ├── core/
│   │   ├── parser.js          # RDF/TriG parsing & template processing
│   │   ├── renderer.js        # HTML generation & display logic
│   │   └── fetcher.js         # Fetch nanopubs from URIs
│   ├── styles/
│   │   └── viewer.css         # Scoped CSS (prefixed with .nanopub-viewer)
│   ├── react/
│   │   └── NanopubViewer.tsx  # React wrapper component with TypeScript
│   ├── index.js               # Main entry point (vanilla JS)
│   └── react.js               # React-specific exports
├── demo/
│   └── index.html             # Interactive demo page
├── dist/                      # Built files (generated, not committed)
│   ├── nanopub-viewer.js      # UMD bundle for <script> tags
│   ├── nanopub-viewer.esm.js  # ES module for import statements
│   └── nanopub-viewer.css     # Compiled styles
├── .gitignore                 # Git ignore rules
├── LICENSE                    # MIT license
├── README.md                  # This file
├── package.json               # Package configuration & scripts
└── vite.config.js             # Build configuration for Vite
```

**Key Files Explained:**

- **`src/core/`** - Core library logic (parsing, rendering, fetching)
- **`src/react/`** - React-specific wrapper for easy integration
- **`demo/`** - Live demo hosted on GitHub Pages
- **`dist/`** - Built files for distribution (generated by `npm run build`)
- **`.github/workflows/deploy.yml`** - Automates demo deployment on push to main
- **`vite.config.js`** - Configures builds for both library and demo
- **`package.json`** - Defines library metadata, scripts, and dependencies

## 🤝 Contributing

Contributions are welcome! This library is part of the Science Live Platform project and is under active development.

**How to contribute:**

1. **Report Issues:** Found a bug or have a feature request? [Open an issue](https://github.com/ScienceLiveHub/nanopub-view/issues)
2. **Discuss:** Have ideas for new features? Start a discussion
3. **Code:** Want to contribute code?
   - Fork the repository
   - Create your feature branch (`git checkout -b feature/amazing-feature`)
   - Commit your changes (`git commit -m 'Add amazing feature'`)
   - Push to the branch (`git push origin feature/amazing-feature`)
   - Open a Pull Request

**Development Guidelines:**
- Keep the library lightweight (zero runtime dependencies)
- Maintain backward compatibility when possible
- Add examples for new features
- Update documentation
- Test in both vanilla JS and React contexts

## ⚠️ Breaking Changes

Since this library is under active development, breaking changes may occur. We'll document them in releases and aim to minimize disruption.

## 📝 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo:** https://sciencelive4all.org/nanopub-view/
- **GitHub Repository:** https://github.com/ScienceLiveHub/nanopub-view
- **Science Live Platform:** https://github.com/ScienceLiveHub/science-live-platform
- **Nanopublications:** http://nanopub.org/

## 🙏 Acknowledgments

- Built for the [Science Live Platform](https://github.com/ScienceLiveHub/science-live-platform)
- Inspired by the [nanopublication ecosystem](http://nanopub.org/)
- Supports RDF/TriG format parsing and rendering

## 📧 Support

- **Issues:** [GitHub Issues](https://github.com/ScienceLiveHub/nanopub-view/issues)
- **Discussions:** [GitHub Discussions](https://github.com/ScienceLiveHub/nanopub-view/discussions)
- **Science Live Platform:** For broader questions about the platform

## 📅 Version History

### Current Development (v1.0.0-dev)
- Initial implementation
- Core parsing and rendering
- React component wrapper
- Template auto-fetching
- Interactive features

### Planned (v1.0.0)
- Stabilized API
- Complete documentation
- Test coverage
- npm publication

---

**Built with ❤️ for the Science Live Platform**

*This library enables beautiful, interactive display of nanopublications for the scientific community.*
