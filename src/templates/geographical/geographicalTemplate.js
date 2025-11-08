// src/templates/geographical/geographicalTemplate.js
// Geographical coverage template customization

import { BaseTemplate } from '../base/baseTemplate.js';

/**
 * Geographical Coverage Template Customization
 * 
 * Template URI: https://w3id.org/np/RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao
 * 
 * Customizations:
 * - Green color scheme
 * - Groups geometry-related fields
 * - Special rendering for WKT data
 * - Location badges
 */
export class GeographicalTemplate extends BaseTemplate {
  constructor() {
    super();
    this.templateId = 'RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao';
    this.name = 'Geographical Coverage';
    this.type = 'geographical';
    this.colors = {
      primary: '#059669',
      secondary: '#064e3b'
    };
  }

  getDescription() {
    return 'Geographical coverage information';
  }

  /**
   * Group geometry-related fields together
   */
  detectSemanticGroups(assertions) {
    const groups = [];
    
    // Find geometry and WKT fields
    const geometryFields = assertions.filter(a => 
      a.predicate && (
        a.predicate.toLowerCase().includes('geometry') ||
        a.predicate.toLowerCase().includes('wkt') ||
        a.predicate.toLowerCase().includes('coverage')
      )
    );
    
    if (geometryFields.length > 0) {
      groups.push({
        id: 'geometry-group',
        label: 'Geometry Details',
        fields: geometryFields,
        collapsible: true
      });
    }
    
    return groups;
  }

  /**
   * Customize field rendering for geographical data
   */
  customizeField(fieldElement, field) {
    // Special rendering for WKT data
    if (field.predicate && field.predicate.toLowerCase().includes('wkt')) {
      const wktContainer = document.createElement('div');
      wktContainer.className = 'wkt-display';
      wktContainer.textContent = field.object || field.value;
      
      const hint = document.createElement('div');
      hint.className = 'text-sm text-gray-500 mt-2';
      hint.textContent = 'Well-Known Text (WKT) geometry format';
      
      fieldElement.appendChild(wktContainer);
      fieldElement.appendChild(hint);
      return true; // Indicates custom rendering was applied
    }
    
    // Special rendering for location names
    if (field.predicate && field.predicate.toLowerCase().includes('location')) {
      const locationBadge = document.createElement('span');
      locationBadge.className = 'location-badge';
      locationBadge.textContent = `📍 ${field.object || field.value}`;
      fieldElement.appendChild(locationBadge);
      return true;
    }
    
    return false; // Use default rendering
  }

  /**
   * Highlight main location field
   */
  shouldHighlight(field) {
    return field.predicate && 
           field.predicate.toLowerCase().includes('location') &&
           !field.predicate.toLowerCase().includes('type');
  }

  /**
   * Add geographical context badge
   */
  addBadges(container, data) {
    // Could add badges showing coverage type, etc.
    // Example: "Point Coverage" vs "Polygon Coverage"
  }
}
