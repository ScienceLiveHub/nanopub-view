// src/templates/registry.js
// Template customization registry for nanopub-view
// Similar to nanopub-create's template system

import { GeographicalTemplate } from './geographical/geographicalTemplate.js';
import { CitationTemplate } from './citation/citationTemplate.js';
import { CommentTemplate } from './comment/commentTemplate.js';

/**
 * Template Registry
 * Maps template IDs to their customization classes
 */
const TEMPLATE_REGISTRY = new Map();

/**
 * Register a template customization
 */
export function registerTemplate(templateId, TemplateClass) {
  TEMPLATE_REGISTRY.set(templateId, TemplateClass);
  console.log(`✅ Registered template: ${templateId}`);
}

/**
 * Get template customization for a given template ID or URI
 */
export function getTemplate(templateIdOrUri) {
  // Extract ID from full URI if needed
  let templateId = templateIdOrUri;
  if (templateIdOrUri.includes('w3id.org/np/')) {
    templateId = templateIdOrUri.split('/').pop();
  }
  
  const TemplateClass = TEMPLATE_REGISTRY.get(templateId);
  if (TemplateClass) {
    return new TemplateClass();
  }
  
  return null;
}

/**
 * Check if a template is registered
 */
export function hasTemplate(templateIdOrUri) {
  let templateId = templateIdOrUri;
  if (templateIdOrUri.includes('w3id.org/np/')) {
    templateId = templateIdOrUri.split('/').pop();
  }
  
  return TEMPLATE_REGISTRY.has(templateId);
}

/**
 * Get all registered template IDs
 */
export function getAllTemplateIds() {
  return Array.from(TEMPLATE_REGISTRY.keys());
}

// ============================================
// REGISTER BUILT-IN TEMPLATES
// ============================================

// Geographical Coverage Template
registerTemplate(
  'RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao',
  GeographicalTemplate
);

// Citation with CiTO Template
registerTemplate(
  'RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo',
  CitationTemplate
);

// Comment on Paper Template
registerTemplate(
  'RAVEpTdLrX5XrhNl_gnvTaBcjRRSDu_hhZix8gu2HO7jI',
  CommentTemplate
);

// Add more templates here as they are created
