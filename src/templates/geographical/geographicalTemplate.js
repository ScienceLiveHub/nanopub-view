// src/templates/geographical/GeographicalTemplate.js
// Geographical Coverage Template Customization

import { BaseTemplate } from '../base/BaseTemplate.js';

/**
 * Geographical Coverage Template
 * Template URI: https://w3id.org/np/RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao
 * 
 * Purpose: Document geographical area/region covered by research
 * 
 * Key Features:
 * - Earth-toned color scheme (greens/golds)
 * - Groups geometry fields together (collapsible)
 * - Special WKT format handling
 * - Location badges and icons
 * - Helpful hints for each field type
 */
export class GeographicalTemplate extends BaseTemplate {
  constructor(templateMetadata = null) {
    super(templateMetadata);
    this.name = 'Geographical Coverage';
    this.type = 'geographical';
  }
  
  // ============================================
  // VISUAL CUSTOMIZATION
  // ============================================
  
  getColors() {
    return {
      primary: '#059669',       // Emerald green (earth/nature)
      secondary: '#064e3b',     // Dark green
      accent: '#fbbf24',        // Gold (highlights)
      background: '#f0fdf4',    // Very light green
      primaryLight: '#10b981',
      primaryLighter: '#d1fae5',
      accentLight: '#fef3c7'
    };
  }
  
  getCustomCSS() {
    return `
      /* Geographical Template Styles */
      .template-geographical {
        --geo-primary: #059669;
        --geo-primary-light: #10b981;
        --geo-primary-lighter: #d1fae5;
        --geo-primary-lightest: #f0fdf4;
        --geo-secondary: #064e3b;
        --geo-accent: #fbbf24;
        --geo-accent-light: #fef3c7;
      }
      
      /* Override global primary colors for this template */
      .template-geographical {
        --primary: var(--geo-primary);
        --primary-hover: var(--geo-primary-light);
        --primary-light: var(--geo-primary-lighter);
      }
      
      /* Template badge */
      .template-geographical .template-badge {
        background: var(--geo-primary);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        font-weight: 600;
        font-size: 0.875rem;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      /* Geometry group - special styling */
      .template-geographical .geometry-group {
        background: var(--geo-primary-lightest);
        border-left: 4px solid var(--geo-primary);
        border-radius: 0.5rem;
        padding: 1.5rem;
        margin: 1.5rem 0;
        box-shadow: 0 1px 3px rgba(5, 150, 105, 0.1);
      }
      
      .template-geographical .geometry-group .field-label {
        color: var(--geo-secondary);
        font-weight: 600;
      }
      
      /* WKT field - monospace for coordinates */
      .template-geographical .wkt-field {
        font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
        font-size: 0.9em;
        background: white;
        border: 2px solid var(--geo-primary-lighter);
        padding: 0.75rem;
        border-radius: 0.375rem;
        white-space: pre-wrap;
        word-break: break-all;
      }
      
      /* Location display - with icon */
      .template-geographical .location-value {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1.1em;
        font-weight: 500;
        color: var(--geo-secondary);
      }
      
      .template-geographical .location-icon {
        font-size: 1.2em;
      }
      
      /* Paper citation group */
      .template-geographical .paper-citation {
        background: var(--geo-accent-light);
        border-left: 3px solid var(--geo-accent);
        border-radius: 0.5rem;
        padding: 1.25rem;
        margin: 1rem 0;
      }
      
      /* Field hints */
      .template-geographical .field-hint {
        margin-top: 0.5rem;
        padding: 0.75rem 1rem;
        background: var(--geo-primary-lightest);
        border-left: 3px solid var(--geo-primary-light);
        border-radius: 0.375rem;
        font-size: 0.875rem;
        color: var(--geo-secondary);
        line-height: 1.6;
      }
      
      .template-geographical .field-hint code {
        background: white;
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
        font-size: 0.85em;
        color: var(--geo-primary);
        border: 1px solid var(--geo-primary-lighter);
      }
      
      .template-geographical .field-hint a {
        color: var(--geo-primary);
        text-decoration: underline;
      }
      
      /* Quote field */
      .template-geographical .quote-field {
        background: #fffbeb;
        border-left: 3px solid var(--geo-accent);
        padding: 1rem;
        border-radius: 0.375rem;
        font-style: italic;
        color: #78350f;
      }
      
      /* Collapsible sections */
      .template-geographical .collapsible-section {
        margin: 1rem 0;
      }
      
      .template-geographical .collapsible-header {
        cursor: pointer;
        padding: 0.75rem 1rem;
        background: var(--geo-primary-lighter);
        border-radius: 0.375rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 600;
        color: var(--geo-secondary);
        transition: background-color 0.2s;
      }
      
      .template-geographical .collapsible-header:hover {
        background: var(--geo-primary-light);
        color: white;
      }
      
      .template-geographical .collapsible-icon {
        font-size: 0.75em;
        transition: transform 0.2s;
      }
      
      .template-geographical .collapsible-section.open .collapsible-icon {
        transform: rotate(90deg);
      }
      
      .template-geographical .collapsible-body {
        padding: 1rem;
        display: none;
      }
      
      .template-geographical .collapsible-section.open .collapsible-body {
        display: block;
      }
    `;
  }
  
  getTemplateBadge() {
    return '🌍 Geographical Coverage';
  }
  
  // ============================================
  // STRUCTURAL ORGANIZATION
  // ============================================
  
  detectSemanticGroups(structuredData) {
    const groups = [];
    
    // Find geometry-related fields
    const geometryFields = structuredData.filter(field => 
      this.uriMatches(field.predicate, 'hasGeometry') ||
      this.uriMatches(field.predicate, 'asWKT') ||
      this.uriMatches(field.predicate, 'geometry')
    );
    
    if (geometryFields.length > 0) {
      groups.push({
        id: 'geometry-group',
        label: '📍 Geometry Details (Optional)',
        fields: geometryFields,
        collapsible: true,
        cssClass: 'geometry-group',
        description: 'Precise coordinates using Well-Known Text (WKT) format'
      });
    }
    
    // Find paper citation fields
    const paperFields = structuredData.filter(field =>
      this.uriMatches(field.predicate, 'cites') ||
      this.uriMatches(field.predicate, 'paper') ||
      this.uriMatches(field.predicate, 'quote')
    );
    
    if (paperFields.length > 0) {
      groups.push({
        id: 'paper-citation',
        label: '📄 Paper Citation & Evidence',
        fields: paperFields,
        collapsible: false,
        cssClass: 'paper-citation'
      });
    }
    
    return groups;
  }
  
  shouldHighlight(field) {
    // Highlight the main location field
    return this.uriMatches(field.predicate, 'location') ||
           this.uriMatches(field.predicate, 'coverage');
  }
  
  // ============================================
  // FIELD CUSTOMIZATION
  // ============================================
  
  customizeField(fieldElement, field) {
    // Custom rendering for WKT data
    if (this.uriMatches(field.predicate, 'wkt') || 
        this.uriMatches(field.predicate, 'asWKT')) {
      return this.renderWKTField(fieldElement, field);
    }
    
    // Custom rendering for location
    if (this.uriMatches(field.predicate, 'location') ||
        this.uriMatches(field.predicate, 'coverage')) {
      return this.renderLocationField(fieldElement, field);
    }
    
    // Custom rendering for quotes
    if (this.uriMatches(field.predicate, 'quote')) {
      return this.renderQuoteField(fieldElement, field);
    }
    
    return false; // Use default rendering
  }
  
  renderWKTField(fieldElement, field) {
    const valueElement = fieldElement.querySelector('.field-value');
    if (!valueElement) return false;
    
    // Clear existing content
    valueElement.innerHTML = '';
    
    // Create WKT display
    const wktDisplay = document.createElement('div');
    wktDisplay.className = 'wkt-field';
    wktDisplay.textContent = field.value || field.object;
    
    valueElement.appendChild(wktDisplay);
    
    // Add hint about WKT format
    const hint = this.createHint(`
      💡 <strong>Well-Known Text (WKT)</strong> format for geometry<br>
      <code>POINT(longitude latitude)</code><br>
      <code>POLYGON((lon1 lat1, lon2 lat2, ...))</code><br>
      <a href="https://en.wikipedia.org/wiki/Well-known_text_representation_of_geometry" target="_blank">Learn more</a>
    `);
    valueElement.appendChild(hint);
    
    return true;
  }
  
  renderLocationField(fieldElement, field) {
    const valueElement = fieldElement.querySelector('.field-value');
    if (!valueElement) return false;
    
    // Clear existing content
    valueElement.innerHTML = '';
    
    // Create location display with icon
    const locationDisplay = document.createElement('div');
    locationDisplay.className = 'location-value';
    locationDisplay.innerHTML = `
      <span class="location-icon">📍</span>
      <span>${field.value || field.object}</span>
    `;
    
    valueElement.appendChild(locationDisplay);
    
    // Add hint
    const hint = this.createHint(`
      💡 Examples: "Amazon Basin, Brazil", "Northern Europe", "Mediterranean Region"
    `);
    valueElement.appendChild(hint);
    
    return true;
  }
  
  renderQuoteField(fieldElement, field) {
    const valueElement = fieldElement.querySelector('.field-value');
    if (!valueElement) return false;
    
    // Clear existing content
    valueElement.innerHTML = '';
    
    // Create quote display
    const quoteDisplay = document.createElement('div');
    quoteDisplay.className = 'quote-field';
    quoteDisplay.innerHTML = `"${field.value || field.object}"`;
    
    valueElement.appendChild(quoteDisplay);
    
    // Add hint
    const hint = this.createHint(`
      💡 Copy the exact text from the paper that describes the geographical coverage
    `);
    valueElement.appendChild(hint);
    
    return true;
  }
  
  getFieldHint(field) {
    // DOI hint
    if (this.uriMatches(field.predicate, 'cites') ||
        this.uriMatches(field.predicate, 'paper')) {
      return '💡 Enter DOI in format: <code>10.1234/example.2024</code>';
    }
    
    return null;
  }
  
  getFieldIcon(field) {
    if (this.uriMatches(field.predicate, 'location')) return '📍';
    if (this.uriMatches(field.predicate, 'geometry')) return '🗺️';
    if (this.uriMatches(field.predicate, 'wkt')) return '📐';
    if (this.uriMatches(field.predicate, 'paper')) return '📄';
    if (this.uriMatches(field.predicate, 'quote')) return '💬';
    return null;
  }
  
  formatFieldValue(value, field) {
    // Format DOI links
    if (this.uriMatches(field.predicate, 'cites') && 
        value && value.startsWith('10.')) {
      return `<a href="https://doi.org/${value}" target="_blank">${value}</a>`;
    }
    
    return value;
  }
  
  // ============================================
  // DISPLAY ENHANCEMENTS
  // ============================================
  
  enhanceTitle(title, data) {
    // Add location to title if available
    const locationField = data.structuredData?.find(f => 
      this.uriMatches(f.predicate, 'location')
    );
    
    if (locationField && locationField.value) {
      return `${title} - ${locationField.value}`;
    }
    
    return title;
  }
  
  getAdditionalMetadata(data) {
    const metadata = [];
    
    // Check if geometry is provided
    const hasGeometry = data.structuredData?.some(f =>
      this.uriMatches(f.predicate, 'wkt')
    );
    
    if (hasGeometry) {
      metadata.push({
        label: 'Precision',
        value: '🗺️ Includes geometric coordinates',
        cssClass: 'text-emerald-700 font-medium'
      });
    }
    
    return metadata;
  }
}
