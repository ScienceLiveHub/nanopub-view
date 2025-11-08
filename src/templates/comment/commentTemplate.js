// src/templates/comment/commentTemplate.js
// Comment on paper template customization

import { BaseTemplate } from '../base/baseTemplate.js';

/**
 * Comment Template Customization
 * 
 * Template URI: https://w3id.org/np/RAVEpTdLrX5XrhNl_gnvTaBcjRRSDu_hhZix8gu2HO7jI
 * 
 * Customizations:
 * - Blue color scheme
 * - Special rendering for quotations
 * - Comment text highlighting
 * - Paper reference grouping
 */
export class CommentTemplate extends BaseTemplate {
  constructor() {
    super();
    this.templateId = 'RAVEpTdLrX5XrhNl_gnvTaBcjRRSDu_hhZix8gu2HO7jI';
    this.name = 'Comment on Paper';
    this.type = 'comment';
    this.colors = {
      primary: '#3b82f6',
      secondary: '#1e40af'
    };
  }

  getDescription() {
    return 'Comments and quotations on papers';
  }

  /**
   * Group comment-related fields
   */
  detectSemanticGroups(assertions) {
    const groups = [];
    
    // Find quotation fields
    const quotationFields = assertions.filter(a => 
      a.predicate && (
        a.predicate.toLowerCase().includes('quotation') ||
        a.predicate.toLowerCase().includes('quote') ||
        a.predicate.toLowerCase().includes('hastext')
      )
    );
    
    if (quotationFields.length > 0) {
      groups.push({
        id: 'quotation-group',
        label: 'Quotation',
        fields: quotationFields,
        collapsible: false
      });
    }
    
    // Find paper reference fields
    const paperFields = assertions.filter(a => 
      a.predicate && (
        a.predicate.toLowerCase().includes('paper') ||
        a.predicate.toLowerCase().includes('publication') ||
        a.predicate.toLowerCase().includes('source')
      )
    );
    
    if (paperFields.length > 0) {
      groups.push({
        id: 'paper-group',
        label: 'Referenced Paper',
        fields: paperFields,
        collapsible: true
      });
    }
    
    return groups;
  }

  /**
   * Customize field rendering for comments
   */
  customizeField(fieldElement, field) {
    // Special rendering for quotation text
    if (field.predicate && (
        field.predicate.toLowerCase().includes('quotation') ||
        field.predicate.toLowerCase().includes('hastext')
      )) {
      
      const quotationBox = document.createElement('div');
      quotationBox.className = 'quotation-box';
      
      const quotationText = document.createElement('blockquote');
      quotationText.className = 'quotation-text';
      quotationText.textContent = field.object || field.value;
      
      quotationBox.appendChild(quotationText);
      fieldElement.appendChild(quotationBox);
      return true;
    }
    
    // Special rendering for paper DOIs
    if (field.object && typeof field.object === 'string' && 
        field.object.includes('doi.org')) {
      
      const paperRef = document.createElement('div');
      paperRef.className = 'paper-reference';
      
      const link = document.createElement('a');
      link.href = field.object;
      link.textContent = field.objectLabel || field.object;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'meta-link';
      
      paperRef.appendChild(link);
      fieldElement.appendChild(paperRef);
      return true;
    }
    
    return false;
  }

  /**
   * Highlight quotation fields
   */
  shouldHighlight(field) {
    return field.predicate && 
           (field.predicate.toLowerCase().includes('quotation') ||
            field.predicate.toLowerCase().includes('hastext'));
  }

  /**
   * Add comment badge to header
   */
  addBadges(container, data) {
    // Could add badge showing comment type
    // Example: "Positive Comment" vs "Critical Comment"
  }
}
