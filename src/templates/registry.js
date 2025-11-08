// src/templates/registry.js
// Template Registry - Maps template IDs to customization classes

import { BaseTemplate } from './base/BaseTemplate.js';
import { GeographicalTemplate } from './geographical/GeographicalTemplate.js';

/**
 * Template Registry
 * 
 * Central registry for template customizations.
 * Maps template URIs/IDs to their customization classes.
 */
class TemplateRegistry {
  constructor() {
    this.templates = new Map();
    this.initialized = false;
  }
  
  /**
   * Initialize and register all built-in templates
   */
  init() {
    if (this.initialized) return;
    
    console.log('Initializing template registry...');
    
    // Register built-in templates
    this.registerBuiltInTemplates();
    
    this.initialized = true;
    console.log(`✅ Template registry initialized with ${this.templates.size} templates`);
  }
  
  /**
   * Register a template customization class
   */
  register(templateIdOrUri, TemplateClass) {
    const id = this.normalizeId(templateIdOrUri);
    this.templates.set(id, TemplateClass);
    console.log(`✅ Registered template: ${id}`);
  }
  
  /**
   * Get template customization for a given ID/URI
   * Returns instance of template class or BaseTemplate if not found
   */
  get(templateIdOrUri, templateMetadata = null) {
    this.init(); // Ensure registry is initialized
    
    if (!templateIdOrUri) {
      return new BaseTemplate(templateMetadata);
    }
    
    const id = this.normalizeId(templateIdOrUri);
    const TemplateClass = this.templates.get(id);
    
    if (TemplateClass) {
      console.log(`✅ Found customization for template: ${id}`);
      return new TemplateClass(templateMetadata);
    }
    
    console.log(`ℹ️ No customization found for template: ${id}, using BaseTemplate`);
    return new BaseTemplate(templateMetadata);
  }
  
  /**
   * Check if a template is registered
   */
  has(templateIdOrUri) {
    this.init();
    const id = this.normalizeId(templateIdOrUri);
    return this.templates.has(id);
  }
  
  /**
   * Get all registered template IDs
   */
  getAllIds() {
    this.init();
    return Array.from(this.templates.keys());
  }
  
  /**
   * Normalize template identifier
   * Extracts ID from full URI if needed
   */
  normalizeId(templateIdOrUri) {
    if (!templateIdOrUri) return null;
    
    const str = String(templateIdOrUri);
    
    // If it's a full URI, extract the ID
    if (str.includes('w3id.org/np/')) {
      return str.split('/').pop().split('#')[0];
    }
    
    return str;
  }
  
  /**
   * Register all built-in template customizations
   */
  registerBuiltInTemplates() {
    // Geographical Coverage Template
    this.register(
      'RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao',
      GeographicalTemplate
    );
    
    // Add more templates here as they are created:
    
    // Citation with CiTO
    // this.register(
    //   'RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo',
    //   CitationTemplate
    // );
    
    // Comment on Paper
    // this.register(
    //   'RAVEpTdLrX5XrhNl_gnvTaBcjRRSDu_hhZix8gu2HO7jI',
    //   CommentTemplate
    // );
    
    // AIDA Sentence
    // this.register(
    //   'RA4fmfVFULMP50FqDFX8fEMn66uDF07vXKFXh_L9aoQKE',
    //   AidaTemplate
    // );
  }
}

// Create singleton instance
const registry = new TemplateRegistry();

// Export individual functions that delegate to the singleton
export function register(templateIdOrUri, TemplateClass) {
  return registry.register(templateIdOrUri, TemplateClass);
}

export function getTemplate(templateIdOrUri, templateMetadata = null) {
  return registry.get(templateIdOrUri, templateMetadata);
}

export function hasTemplate(templateIdOrUri) {
  return registry.has(templateIdOrUri);
}

export function getAllTemplateIds() {
  return registry.getAllIds();
}

// Also export the singleton and class for advanced usage
export default registry;
export { TemplateRegistry };
