// src/utils/templateDetector.js
// Helper to detect and apply template-specific classes

export function detectTemplateType(data) {
  // Check template URI
  if (data.templateUri) {
    const uri = data.templateUri.toLowerCase();
    
    if (uri.includes('cito') || uri.includes('citation')) {
      return 'citation';
    }
    
    if (uri.includes('geographical') || uri.includes('geo')) {
      return 'geographical';
    }
    
    if (uri.includes('comment')) {
      return 'comment';
    }
  }
  
  // Check type assertions in nanopub
  if (data.assertions) {
    const types = data.assertions
      .filter(a => a.predicate?.includes('type'))
      .map(a => a.object?.toLowerCase() || '');
    
    if (types.some(t => t.includes('citation'))) return 'citation';
    if (types.some(t => t.includes('geographical'))) return 'geographical';
  }
  
  return null;
}

export function applyTemplateClass(element, templateType) {
  if (!templateType) return;
  
  element.classList.add(`template-${templateType}`);
}

export function getTemplateConfig(templateType) {
  const configs = {
    citation: {
      primaryColor: '#BE2E78',
      secondaryColor: '#101E43',
      icon: '📄',
      label: 'Citation'
    },
    geographical: {
      primaryColor: '#059669',
      secondaryColor: '#064e3b',
      icon: '🌍',
      label: 'Geographical'
    },
    comment: {
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af',
      icon: '💬',
      label: 'Comment'
    }
  };
  
  return configs[templateType] || null;
}
