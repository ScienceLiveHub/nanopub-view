// src/templates/base/baseTemplate.js
// Base class for template customizations (like nanopub-create)

/**
 * Base Template Customization Class
 * 
 * Extend this class to customize how a specific nanopub template is displayed
 */
export class BaseTemplate {
  constructor() {
    this.templateId = null;
    this.name = 'Base Template';
    this.type = 'default';
    this.colors = {
      primary: '#BE2E78',
      secondary: '#101E43'
    };
  }

  /**
   * Get template CSS class name
   */
  getClassName() {
    return `template-${this.type}`;
  }

  /**
   * Get template colors
   */
  getColors() {
    return this.colors;
  }

  /**
   * Customize the header rendering
   * Override to add custom header elements
   * 
   * @param {HTMLElement} header - The header element
   * @param {Object} data - The nanopub data
   */
  customizeHeader(header, data) {
    // Default: no customization
    // Override in subclass to add custom elements
  }

  /**
   * Customize field rendering
   * Override to add special rendering for specific fields
   * 
   * @param {HTMLElement} fieldElement - The field container
   * @param {Object} field - The field data
   * @returns {boolean} - Return true if field was customized, false to use default
   */
  customizeField(fieldElement, field) {
    // Default: no customization
    // Override in subclass
    return false;
  }

  /**
   * Detect and group related fields
   * Override to create semantic groupings
   * 
   * @param {Array} assertions - All assertion data
   * @returns {Array} - Array of group definitions
   */
  detectSemanticGroups(assertions) {
    // Default: no grouping
    // Override in subclass
    return [];
  }

  /**
   * Add template-specific badges or indicators
   * 
   * @param {HTMLElement} container - The container element
   * @param {Object} data - The nanopub data
   */
  addBadges(container, data) {
    // Default: no badges
    // Override in subclass
  }

  /**
   * Format specific field types
   * 
   * @param {string} fieldType - The type of field
   * @param {any} value - The field value
   * @returns {string} - Formatted HTML string
   */
  formatField(fieldType, value) {
    // Default: return value as-is
    // Override in subclass for custom formatting
    return value;
  }

  /**
   * Determine if a field should be highlighted
   * 
   * @param {Object} field - The field data
   * @returns {boolean} - True if should be highlighted
   */
  shouldHighlight(field) {
    // Default: don't highlight
    // Override in subclass
    return false;
  }

  /**
   * Get template description
   */
  getDescription() {
    return 'Nanopublication';
  }
}
