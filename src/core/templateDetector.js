// src/core/templateDetector.js
// Detect and fetch template information from nanopublications

/**
 * TemplateDetector - Extract template URIs from nanopubs and fetch definitions
 */
export class TemplateDetector {
  constructor() {
    this.cache = new Map();
  }
  
  /**
   * Extract template URI from parsed nanopub data
   * Looks for template declarations in the RDF
   */
  extractTemplateUri(parsedData) {
    if (!parsedData) return null;
    
    // Strategy 1: Check for wasCreatedFromTemplate predicate
    if (parsedData.assertions) {
      for (const triple of parsedData.assertions) {
        if (triple.predicate && 
            (triple.predicate.includes('wasCreatedFromTemplate') ||
             triple.predicate.includes('wasCreatedFrom') ||
             triple.predicate.includes('usedTemplate'))) {
          return triple.object;
        }
      }
    }
    
    // Strategy 2: Check provenance graph
    if (parsedData.provenance) {
      for (const triple of parsedData.provenance) {
        if (triple.predicate && 
            (triple.predicate.includes('wasCreatedFromTemplate') ||
             triple.predicate.includes('usedTemplate'))) {
          return triple.object;
        }
      }
    }
    
    // Strategy 3: Check pubinfo graph
    if (parsedData.pubinfo) {
      for (const triple of parsedData.pubinfo) {
        if (triple.predicate && 
            (triple.predicate.includes('wasCreatedFromTemplate') ||
             triple.predicate.includes('wasCreatedFromProvenanceTemplate') ||
             triple.predicate.includes('wasCreatedFromPubinfoTemplate'))) {
          return triple.object;
        }
      }
    }
    
    // Strategy 4: Check structured data
    if (parsedData.structuredData) {
      for (const field of parsedData.structuredData) {
        if (field.predicate && 
            field.predicate.includes('wasCreatedFromTemplate')) {
          return field.object || field.value;
        }
      }
    }
    
    // Strategy 5: Check for template type in assertion
    // Sometimes templates are referenced via rdf:type
    if (parsedData.assertions) {
      for (const triple of parsedData.assertions) {
        if (triple.predicate && triple.predicate.endsWith('type')) {
          const obj = triple.object;
          if (obj && obj.includes('w3id.org/np/')) {
            // Might be a template URI
            return obj;
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Fetch template definition from URI
   */
  async fetchTemplate(templateUri) {
    if (!templateUri) return null;
    
    // Check cache
    if (this.cache.has(templateUri)) {
      console.log('Template cache hit:', templateUri);
      return this.cache.get(templateUri);
    }
    
    console.log('Fetching template:', templateUri);
    
    try {
      // Try to fetch the template as TriG/Turtle
      const response = await fetch(templateUri, {
        headers: {
          'Accept': 'text/turtle, application/trig, application/rdf+xml, text/plain'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const content = await response.text();
      
      // Basic validation
      if (!content.includes('@prefix') && !content.includes('<http')) {
        throw new Error('Response does not appear to be RDF');
      }
      
      // Cache the template content
      this.cache.set(templateUri, content);
      
      console.log('Template fetched successfully');
      return content;
      
    } catch (error) {
      console.warn('Could not fetch template:', error.message);
      return null;
    }
  }
  
  /**
   * Extract template ID from URI
   */
  extractTemplateId(templateUri) {
    if (!templateUri) return null;
    return templateUri.split('/').pop().split('#')[0];
  }
  
  /**
   * Detect template type from URI or content
   */
  detectTemplateType(templateUri, templateContent = null) {
    if (!templateUri) return 'unknown';
    
    const uri = templateUri.toLowerCase();
    
    // Check URI patterns
    if (uri.includes('geographical') || uri.includes('coverage')) {
      return 'geographical';
    }
    if (uri.includes('cito') || uri.includes('citation')) {
      return 'citation';
    }
    if (uri.includes('comment') || uri.includes('annotation')) {
      return 'comment';
    }
    if (uri.includes('aida')) {
      return 'aida';
    }
    if (uri.includes('rosetta')) {
      return 'rosetta';
    }
    
    // If we have content, could parse it for more info
    if (templateContent) {
      const content = templateContent.toLowerCase();
      if (content.includes('geographical')) return 'geographical';
      if (content.includes('citation')) return 'citation';
    }
    
    return 'generic';
  }
  
  /**
   * Clear template cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Singleton instance
const detector = new TemplateDetector();
export default detector;
