// src/templates/citation/citationTemplate.js
// Citation template customization

import { BaseTemplate } from '../base/baseTemplate.js';

/**
 * Citation Template Customization
 * 
 * Template URI: https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo
 * 
 * Customizations:
 * - Pink/purple color scheme
 * - Groups citing/cited papers
 * - Special rendering for CiTO relations
 * - Citation type badges
 */
export class CitationTemplate extends BaseTemplate {
  constructor() {
    super();
    this.templateId = 'RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo';
    this.name = 'Citation with CiTO';
    this.type = 'citation';
    this.colors = {
      primary: '#BE2E78',
      secondary: '#101E43'
    };
  }

  getDescription() {
    return 'Citation relationships between papers';
  }

  /**
   * Group citation-related fields
   */
  detectSemanticGroups(assertions) {
    const groups = [];
    
    // Find citing paper fields
    const citingFields = assertions.filter(a => 
      a.predicate && (
        a.predicate.toLowerCase().includes('citing') ||
        a.predicate.toLowerCase().includes('source')
      )
    );
    
    if (citingFields.length > 0) {
      groups.push({
        id: 'citing-group',
        label: 'Citing Paper',
        fields: citingFields,
        collapsible: false
      });
    }
    
    // Find cited paper fields
    const citedFields = assertions.filter(a => 
      a.predicate && (
        a.predicate.toLowerCase().includes('cited') ||
        a.predicate.toLowerCase().includes('target')
      )
    );
    
    if (citedFields.length > 0) {
      groups.push({
        id: 'cited-group',
        label: 'Cited Paper',
        fields: citedFields,
        collapsible: false
      });
    }
    
    return groups;
  }

  /**
   * Customize field rendering for citations
   */
  customizeField(fieldElement, field) {
    // Special rendering for CiTO relation types
    if (field.predicate && (
        field.predicate.toLowerCase().includes('cites') ||
        field.predicate.toLowerCase().includes('citation')
      )) {
      
      const citationType = this.extractCitationType(field.object || field.value);
      
      if (citationType) {
        const badge = document.createElement('span');
        badge.className = 'citation-relation';
        badge.textContent = citationType;
        fieldElement.appendChild(badge);
        return true;
      }
    }
    
    // Highlight cited papers
    if (field.predicate && field.predicate.toLowerCase().includes('cited')) {
      fieldElement.classList.add('cited-paper');
    }
    
    return false;
  }

  /**
   * Extract citation type from CiTO URI
   */
  extractCitationType(value) {
    if (!value || typeof value !== 'string') return null;
    
    // Common CiTO relations
    const citoTypes = {
      'cites': 'cites',
      'extends': 'extends',
      'supports': 'supports',
      'disputes': 'disputes',
      'discusses': 'discusses',
      'reviews': 'reviews',
      'updates': 'updates',
      'usesMethodIn': 'uses method from',
      'usesDataFrom': 'uses data from'
    };
    
    for (const [key, label] of Object.entries(citoTypes)) {
      if (value.toLowerCase().includes(key.toLowerCase())) {
        return label;
      }
    }
    
    return null;
  }

  /**
   * Highlight main citation relationship
   */
  shouldHighlight(field) {
    return field.predicate && 
           field.predicate.toLowerCase().includes('cites');
  }

  /**
   * Add citation type badge to header
   */
  addBadges(container, data) {
    // Could add badge showing citation type
    // Example: "Supporting Citation" vs "Disputing Citation"
  }
}
