// src/index.js
import { NanopubParser } from './core/parser.js';
import { displayPublication as renderNanopub } from './core/renderer.js';
import { fetchNanopub } from './core/fetcher.js';
import './styles/viewer.css';

export class NanopubViewer {
  constructor(options = {}) {
    this.options = {
      apiEndpoint: 'https://np.petapico.org/',
      theme: 'default',
      showMetadata: true,
      fetchTimeout: 30000,
      ...options
    };
  }

  async renderFromUri(container, uri) {
    const content = await fetchNanopub(uri, this.options);
    return this.render(container, content);
  }
async render(container, content) {
    const element = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!element) {
      throw new Error('Container element not found');
    }
    
    element.classList.add('nanopub-viewer');
    
    // Create parser
    const parser = new NanopubParser(content);
    
    // Try to fetch template if referenced in nanopub
    const templateUri = parser.extractTemplateUri();
    if (templateUri) {
      console.log('Found template URI:', templateUri);
      try {
        const response = await fetch(templateUri, {
          headers: {
            'Accept': 'text/turtle, application/trig, application/rdf+xml, text/plain'
          }
        });
        
        if (response.ok) {
          const templateContent = await response.text();
          console.log('Template fetched successfully');
          parser.templateContent = templateContent;
          parser.template = null; // Reset to reparse with new template
        }
      } catch (error) {
        console.warn('Could not fetch template:', error);
      }
    }
    
    const data = await parser.parseWithLabels();
    renderNanopub(element, data, this.options);
    return data;
}
}

// Also export individual functions for advanced usage
export { NanopubParser, renderNanopub, fetchNanopub };
