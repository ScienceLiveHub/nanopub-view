export class NanopubViewer {
  constructor(options = {}) {
    this.options = {
      enableTemplateStyles: true,
      theme: 'light',
      ...options
    };
  }

  render(nanopub, container) {
    const templateType = this.detectTemplate(nanopub);
    container.className = `viewer-container ${templateType ? `template-${templateType}` : ''}`;
    
    const card = document.createElement('div');
    card.className = 'pub-card mb-10';
    
    card.appendChild(this.renderHeader(nanopub));
    card.appendChild(this.renderAssertion(nanopub));
    card.appendChild(this.renderProvenance(nanopub));
    
    container.appendChild(card);
  }

  renderHeader(nanopub) {
    const header = document.createElement('div');
    header.className = 'pub-header';
    
    if (nanopub.templateType) {
      const badge = document.createElement('span');
      badge.className = 'template-badge';
      badge.textContent = nanopub.templateType;
      header.appendChild(badge);
    }
    
    const title = document.createElement('h1');
    title.className = 'pub-title';
    title.textContent = nanopub.title || 'Nanopublication';
    header.appendChild(title);
    
    const meta = document.createElement('div');
    meta.className = 'meta-grid';
    
    if (nanopub.creator) {
      meta.appendChild(this.createMetaItem('Creator', nanopub.creator, true));
    }
    
    if (nanopub.created) {
      meta.appendChild(this.createMetaItem('Created', nanopub.created));
    }
    
    if (nanopub.uri) {
      meta.appendChild(this.createMetaItem('URI', nanopub.uri, true));
    }
    
    header.appendChild(meta);
    return header;
  }

  createMetaItem(label, value, isLink = false) {
    const item = document.createElement('div');
    
    const labelEl = document.createElement('strong');
    labelEl.className = 'meta-label';
    labelEl.textContent = label + ': ';
    item.appendChild(labelEl);
    
    if (isLink) {
      const link = document.createElement('a');
      link.className = 'meta-link';
      link.href = value;
      link.textContent = value;
      link.target = '_blank';
      item.appendChild(link);
    } else {
      item.appendChild(document.createTextNode(value));
    }
    
    return item;
  }

  renderAssertion(nanopub) {
    const section = document.createElement('div');
    section.className = 'pub-section';
    
    const title = document.createElement('h2');
    title.className = 'section-title';
    title.textContent = 'Assertion';
    section.appendChild(title);
    
    nanopub.assertions.forEach(assertion => {
      const group = document.createElement('div');
      group.className = 'field-group';
      
      const label = document.createElement('div');
      label.className = 'field-label';
      label.textContent = assertion.predicate;
      group.appendChild(label);
      
      const value = document.createElement('div');
      value.className = 'field-value';
      
      if (assertion.isUri) {
        const link = document.createElement('a');
        link.className = 'meta-link';
        link.href = assertion.object;
        link.textContent = assertion.objectLabel || assertion.object;
        link.target = '_blank';
        value.appendChild(link);
      } else if (assertion.isCode) {
        const code = document.createElement('pre');
        code.className = 'code-block';
        code.textContent = assertion.object;
        value.appendChild(code);
      } else {
        const literal = document.createElement('div');
        literal.className = 'literal-box';
        literal.textContent = assertion.object;
        value.appendChild(literal);
      }
      
      group.appendChild(value);
      section.appendChild(group);
    });
    
    return section;
  }

  renderProvenance(nanopub) {
    const section = document.createElement('div');
    section.className = 'pub-section bg-gray-50 dark:bg-gray-800';
    
    const title = document.createElement('h2');
    title.className = 'section-title';
    title.textContent = 'Provenance';
    section.appendChild(title);
    
    nanopub.provenance.forEach(prov => {
      const group = document.createElement('div');
      group.className = 'field-group';
      
      const label = document.createElement('div');
      label.className = 'field-label text-sm';
      label.textContent = prov.predicate;
      group.appendChild(label);
      
      const value = document.createElement('div');
      value.className = 'field-value text-sm';
      value.textContent = prov.object;
      group.appendChild(value);
      
      section.appendChild(group);
    });
    
    return section;
  }

  detectTemplate(nanopub) {
    if (nanopub.templateUri) {
      if (nanopub.templateUri.includes('CiTO')) return 'citation';
      if (nanopub.templateUri.includes('geographical')) return 'geographical';
    }
    return null;
  }

  renderInput(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'viewer-container';
    
    const textarea = document.createElement('textarea');
    textarea.className = 'w-full min-h-[120px] p-3 border-2 border-gray-300 rounded-md font-mono text-sm resize-y focus:outline-none focus:border-nanopub-primary focus:ring-2 focus:ring-nanopub-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200';
    textarea.placeholder = 'Paste nanopublication content here...';
    
    const button = document.createElement('button');
    button.className = 'btn-primary w-full mt-4';
    button.textContent = 'Visualize Nanopublication';
    button.onclick = () => this.parseAndRender(textarea.value, container);
    
    wrapper.appendChild(textarea);
    wrapper.appendChild(button);
    container.appendChild(wrapper);
  }

  parseAndRender(content, container) {
    try {
      const parsed = this.parseNanopub(content);
      container.innerHTML = '';
      this.render(parsed, container);
    } catch (error) {
      this.showError(container, error.message);
    }
  }

  showError(container, message) {
    const error = document.createElement('div');
    error.className = 'alert-error mt-4';
    error.textContent = `Error: ${message}`;
    container.appendChild(error);
  }

  parseNanopub(content) {
    // Placeholder parser - implement actual RDF parsing
    return {
      uri: 'http://example.org/np/123',
      title: 'Sample Nanopublication',
      creator: 'https://orcid.org/0000-0000-0000-0000',
      created: new Date().toISOString(),
      templateType: 'citation',
      templateUri: 'https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo',
      assertions: [
        {
          predicate: 'cites',
          object: 'https://doi.org/10.1234/example',
          objectLabel: 'Example Paper',
          isUri: true
        }
      ],
      provenance: [
        {
          predicate: 'wasGeneratedBy',
          object: 'Manual creation'
        }
      ]
    };
  }
}
