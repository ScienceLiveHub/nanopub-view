// src/templates/base/BaseTemplate.js
// Abstract base class for all nanopub template customizations

/**
 * BaseTemplate - Abstract base class for template customizations
 * 
 * Provides default implementations and hooks for customization.
 * Template-specific classes extend this to override behavior.
 * 
 * Design Philosophy:
 * - Everything has a sensible default
 * - Override only what you need
 * - Progressive enhancement
 */
export class BaseTemplate {
  constructor(templateMetadata = null) {
    this.template = templateMetadata;
    this.name = 'Generic Template';
    this.type = 'generic';
  }
  
  // ============================================
  // VISUAL CUSTOMIZATION
  // ============================================
  
  /**
   * Get color scheme for this template
   * Override to provide template-specific colors
   */
  getColors() {
    return {
      primary: '#be2e78',      // Science Live pink
      secondary: '#101e43',    // Science Live navy
      accent: '#f8deed',       // Science Live cream
      background: '#ffffff'
    };
  }
  
  /**
   * Get CSS class name for this template
   */
  getClassName() {
    return `template-${this.type}`;
  }
  
  /**
   * Get additional CSS to inject for this template
   * Return null for no additional CSS
   */
  getCustomCSS() {
    return null;
  }
  
  /**
   * Get template badge text/HTML
   */
  getTemplateBadge() {
    return this.name;
  }
  
  // ============================================
  // STRUCTURAL ORGANIZATION
  // ============================================
  
  /**
   * Detect semantic groups of related fields
   * Return array of group definitions
   * 
   * @returns {Array} Array of group objects with structure:
   *   {
   *     id: 'group-id',
   *     label: 'Group Label',
   *     fields: [field objects],
   *     collapsible: true/false,
   *     cssClass: 'custom-class'
   *   }
   */
  detectSemanticGroups(structuredData) {
    // Default: no grouping
    return [];
  }
  
  /**
   * Get custom field ordering
   * Return null to use default order
   */
  getFieldOrder() {
    return null;
  }
  
  /**
   * Should this field be highlighted/emphasized?
   */
  shouldHighlight(field) {
    // Default: don't highlight
    return false;
  }
  
  /**
   * Is this field optional?
   * Checks if field is marked as optional in template
   */
  isOptional(field) {
    if (!this.template || !this.template.statements) return false;
    
    const statement = this.template.statements.find(s => 
      s.predicateUri === field.predicate || 
      s.object === field.placeholderId
    );
    
    return statement ? statement.optional : false;
  }
  
  // ============================================
  // FIELD CUSTOMIZATION
  // ============================================
  
  /**
   * Customize rendering of a specific field
   * Return modified element or null to use default
   * 
   * @param {HTMLElement} fieldElement - The field container element
   * @param {Object} field - Field data
   * @returns {boolean} true if custom rendering was applied
   */
  customizeField(fieldElement, field) {
    // Default: no customization
    return false;
  }
  
  /**
   * Get a helpful hint for a field
   * Returns HTML string or null
   */
  getFieldHint(field) {
    return null;
  }
  
  /**
   * Get an icon for a field (emoji or HTML)
   */
  getFieldIcon(field) {
    return null;
  }
  
  /**
   * Format a field value for display
   */
  formatFieldValue(value, field) {
    // Default: return as-is
    return value;
  }
  
  /**
   * Get human-readable label for a field
   * Extracts from template metadata or falls back to predicate parsing
   */
  getFieldLabel(field) {
    // 1. Try template metadata
    if (this.template && this.template.placeholders) {
      const placeholder = this.template.placeholders.find(p => 
        p.id === field.placeholderId
      );
      if (placeholder && placeholder.label) {
        return placeholder.label;
      }
    }
    
    // 2. Try predicate label from template
    if (field.predicateLabel) {
      return field.predicateLabel;
    }
    
    // 3. Parse from predicate URI
    if (field.predicate) {
      return this.parsePredicateLabel(field.predicate);
    }
    
    // 4. Fallback
    return 'Value';
  }
  
  /**
   * Parse a predicate URI to get human-readable label
   */
  parsePredicateLabel(predicateUri) {
    if (!predicateUri) return 'Value';
    
    // Get the last part of the URI
    let label = predicateUri.split(/[/#]/).pop();
    
    // Convert camelCase or snake_case to Title Case
    label = label
      .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase
      .replace(/[_-]/g, ' ')                 // snake_case
      .replace(/^(has|is)\s+/i, '')         // Remove common prefixes
      .trim()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    
    return label;
  }
  
  // ============================================
  // AUTO-FILL LOGIC
  // ============================================
  
  /**
   * Get auto-fill rules for this template
   * Returns array of rules: { trigger, target, transform }
   */
  getAutofillRules() {
    return [];
  }
  
  // ============================================
  // DISPLAY ENHANCEMENTS
  // ============================================
  
  /**
   * Add visual badges or indicators to the container
   */
  addBadges(container, data) {
    // Default: no badges
  }
  
  /**
   * Enhance the title display
   */
  enhanceTitle(title, data) {
    // Default: return title as-is
    return title;
  }
  
  /**
   * Get additional metadata to display
   */
  getAdditionalMetadata(data) {
    return [];
  }
  
  // ============================================
  // UTILITY METHODS
  // ============================================
  
  /**
   * Check if a URI matches a pattern
   */
  uriMatches(uri, pattern) {
    if (!uri) return false;
    return uri.toLowerCase().includes(pattern.toLowerCase());
  }
  
  /**
   * Extract ID from a full URI
   */
  extractIdFromUri(uri) {
    return uri.split(/[/#]/).pop();
  }
  
  /**
   * Create a collapsible section
   */
  createCollapsibleSection(title, content, isOpen = false) {
    const section = document.createElement('div');
    section.className = 'collapsible-section';
    if (isOpen) section.classList.add('open');
    
    const header = document.createElement('div');
    header.className = 'collapsible-header';
    header.innerHTML = `
      <span class="collapsible-icon">${isOpen ? '▼' : '▶'}</span>
      <span class="collapsible-title">${title}</span>
    `;
    header.onclick = () => {
      section.classList.toggle('open');
      const icon = header.querySelector('.collapsible-icon');
      icon.textContent = section.classList.contains('open') ? '▼' : '▶';
    };
    
    const body = document.createElement('div');
    body.className = 'collapsible-body';
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else {
      body.appendChild(content);
    }
    
    section.appendChild(header);
    section.appendChild(body);
    
    return section;
  }
  
  /**
   * Create a badge element
   */
  createBadge(text, color = null) {
    const badge = document.createElement('span');
    badge.className = 'template-badge';
    badge.textContent = text;
    if (color) {
      badge.style.backgroundColor = color;
    }
    return badge;
  }
  
  /**
   * Create a hint element
   */
  createHint(text) {
    const hint = document.createElement('div');
    hint.className = 'field-hint';
    hint.innerHTML = text;
    return hint;
  }
  
  /**
   * Wrap content in a styled box
   */
  createStyledBox(content, cssClass = '') {
    const box = document.createElement('div');
    box.className = `styled-box ${cssClass}`;
    if (typeof content === 'string') {
      box.innerHTML = content;
    } else {
      box.appendChild(content);
    }
    return box;
  }
}
