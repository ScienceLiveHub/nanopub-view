// ============= THEME CONFIGURATION =============
// Define your organization themes here
const THEME_PRESETS = {
    default: {
        name: 'Default',
        primary: '#be2e78',
        primaryHover: '#a02463',
        secondary: '#101e43',
        accent: '#f8deed',
        textDark: '#333',
        textLight: '#666',
        bgLight: '#f5f5f5',
        border: '#ddd'
    },
    'org-blue': {
        name: 'Organization Blue',
        primary: '#0066cc',
        primaryHover: '#0052a3',
        secondary: '#003366',
        accent: '#e6f2ff',
        textDark: '#1a1a1a',
        textLight: '#666',
        bgLight: '#f0f7ff',
        border: '#b3d9ff'
    },
    dark: {
        name: 'Dark Mode',
        primary: '#7c3aed',
        primaryHover: '#6d28d9',
        secondary: '#1f2937',
        accent: '#f3f4f6',
        textDark: '#f9fafb',
        textLight: '#d1d5db',
        bgLight: '#111827',
        border: '#374151'
    },
    'org-green': {
        name: 'Organization Green',
        primary: '#059669',
        primaryHover: '#047857',
        secondary: '#064e3b',
        accent: '#ecfdf5',
        textDark: '#111827',
        textLight: '#6b7280',
        bgLight: '#f0fdf4',
        border: '#a7f3d0'
    }
};

// ============= THEME UTILITIES =============

/**
 * Apply a theme by name
 * @param {string} themeName - Name of theme from THEME_PRESETS
 */
function applyTheme(themeName) {
    const theme = THEME_PRESETS[themeName] || THEME_PRESETS.default;
    const root = document.documentElement;
    
    Object.entries(theme).forEach(([key, value]) => {
        // Skip the 'name' property
        if (key === 'name') return;
        
        const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        root.style.setProperty(cssVar, value);
    });
    
    console.log(`Theme applied: ${theme.name}`);
}

/**
 * Set custom colors
 * @param {object} colors - Object with color keys and hex values
 */
function setCustomColors(colors) {
    const root = document.documentElement;
    
    Object.entries(colors).forEach(([key, value]) => {
        const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        root.style.setProperty(cssVar, value);
    });
    
    console.log('Custom colors applied');
}

/**
 * Get current theme
 * @returns {object} Current theme object
 */
function getCurrentTheme() {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    
    return {
        primary: style.getPropertyValue('--primary').trim(),
        primaryHover: style.getPropertyValue('--primary-hover').trim(),
        secondary: style.getPropertyValue('--secondary').trim(),
        accent: style.getPropertyValue('--accent').trim(),
        textDark: style.getPropertyValue('--text-dark').trim(),
        textLight: style.getPropertyValue('--text-light').trim(),
        bgLight: style.getPropertyValue('--bg-light').trim(),
        border: style.getPropertyValue('--border').trim()
    };
}

// ============= AUTO-LOAD THEME FROM URL =============
// Check for ?theme=themeName in URL on page load
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const theme = urlParams.get('theme');
    
    if (theme && THEME_PRESETS[theme]) {
        applyTheme(theme);
    }
});
