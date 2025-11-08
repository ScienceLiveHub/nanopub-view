import { getTemplate, hasTemplate } from '../templates/registry.js';

function detectTemplateFromData(data) {
  console.log('Detecting template from data...');
  
  // Method 1: Check explicit templateUri
  if (data.templateUri && hasTemplate(data.templateUri)) {
    console.log('Found template via data.templateUri:', data.templateUri);
    return getTemplate(data.templateUri);
  }
  
  // Method 2: Check pubinfo for wasCreatedFromTemplate
  if (data.pubinfo && Array.isArray(data.pubinfo)) {
    const templateTriple = data.pubinfo.find(triple => 
      triple.predicate && 
      (triple.predicate.includes('wasCreatedFromTemplate') ||
       triple.predicate.includes('nt:wasCreatedFromTemplate'))
    );
    
    if (templateTriple && templateTriple.object && hasTemplate(templateTriple.object)) {
      console.log('Found template via pubinfo:', templateTriple.object);
      return getTemplate(templateTriple.object);
    }
  }
  
  // Method 3: Check URI patterns
  if (data.uri) {
    const uriParts = data.uri.split('/');
    const possibleTemplateId = uriParts[uriParts.length - 1];
    if (hasTemplate(possibleTemplateId)) {
      console.log('Found template via URI pattern:', possibleTemplateId);
      return getTemplate(possibleTemplateId);
    }
  }
  
  console.log('No template found, using default rendering');
  return null;
}

// ============= SHARE BUTTON HANDLERS =============
window.copyNanopubLink = function(uri) {
    navigator.clipboard.writeText(uri);
    const dropdown = document.getElementById('shareDropdown');
    dropdown.classList.remove('active');
    
    const button = event.target.closest('.share-dropdown-item');
    const originalText = button.textContent;
    button.textContent = '✓ Copied!';
    setTimeout(() => {
        button.textContent = originalText;
    }, 2000);
};

window.openNanopubLink = function(uri) {
    if (!uri) return;
    const npId = uri.split('/').pop();
    const registryUrl = `https://nanodash.knowledgepixels.com/explore?57&id=${npId}`;
    window.open(registryUrl, '_blank');
    const dropdown = document.getElementById('shareDropdown');
    dropdown.classList.remove('active');
};

window.downloadFormat = function(uri, format) {
    if (!uri) return;
    const npId = uri.split('/').pop();
    const downloadUrl = `https://registry.knowledgepixels.com/np/${npId}.${format}`;
    window.open(downloadUrl, '_blank');
    const dropdown = document.getElementById('shareDropdown');
    dropdown.classList.remove('active');
};

window.toggleShareDropdown = function(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('shareDropdown');
    const button = event.target.closest('.share-icon');
    
    if (dropdown.classList.contains('active')) {
        dropdown.classList.remove('active');
    } else {
        const rect = button.getBoundingClientRect();
        dropdown.style.top = (rect.bottom + 8) + 'px';
        dropdown.style.right = (window.innerWidth - rect.right) + 'px';
        dropdown.classList.add('active');
    }
}

export function displayPublication(container, data, options) {
    // Detect and apply template customization
    const template = detectTemplateFromData(data);
  
    if (template) {
      console.log(`Applying template: ${template.name} (${template.type})`);
      
      // Apply template CSS class
      container.classList.add(template.getClassName());
      
      // Store template on container for later use
      container._template = template;
    
      // Apply template color variables
      const colors = template.getColors();
      container.style.setProperty('--template-primary', colors.primary);
      container.style.setProperty('--template-secondary', colors.secondary);
    }

    console.log('=== displayPublication START ===');
    console.log('Title:', data.title);
    console.log('Structured data fields:', data.structuredData?.length);
    
    // Extract main entity info if present
    let mainEntityUri = null;
    let mainEntityDisplay = null;
    
    if (data.structuredData && data.structuredData.length > 0) {
        const mainEntityField = data.structuredData.find(f => f.isMainEntity);
        console.log('Found main entity field?', !!mainEntityField);
        if (mainEntityField && mainEntityField.values.length > 0) {
            mainEntityUri = mainEntityField.values[0].raw;
            mainEntityDisplay = mainEntityField.values[0].display;
            console.log('Main entity URI:', mainEntityUri);
            console.log('Main entity display:', mainEntityDisplay);
        }
    }
    
    // Make title clickable if it contains the main entity
    let titleHtml = data.title || 'Nanopublication Document';
    console.log('Original title:', titleHtml);
    
    if (mainEntityUri) {
        console.log('Attempting to link main entity in title...');
        let replaced = false;
        
        // For DOIs, try multiple patterns
        if (mainEntityUri.includes('doi.org/')) {
            const doiPart = mainEntityUri.split('doi.org/')[1];
            console.log('DOI part:', doiPart);
            
            const cleanDisplay = mainEntityDisplay ? mainEntityDisplay.replace(/\s+/g, '') : '';
            console.log('Clean display:', cleanDisplay);
            
            const patterns = [
                cleanDisplay,
                doiPart,
                doiPart.split('/').pop(),
            ];
            
            console.log('Trying patterns:', patterns);
            
            for (let pattern of patterns) {
                if (pattern && titleHtml.includes(pattern)) {
                    console.log('Pattern matched:', pattern);
                    titleHtml = titleHtml.replace(
                        pattern,
                        `<a href="${mainEntityUri}" target="_blank" title="Open DOI: ${doiPart}" class="title-link">${pattern}</a>`
                    );
                    replaced = true;
                    break;
                }
            }
        } else {
            const patterns = [];
            
            if (mainEntityDisplay) {
                patterns.push(mainEntityDisplay);
            }
            
            if (mainEntityUri.startsWith('http')) {
                const uriParts = mainEntityUri.split('/').filter(p => p);
                const lastPart = uriParts[uriParts.length - 1];
                if (lastPart) patterns.push(lastPart);
                
                if (uriParts.length > 1) {
                    const secondLast = uriParts[uriParts.length - 2];
                    if (secondLast) patterns.push(secondLast);
                }
                
                if (mainEntityUri.includes('#')) {
                    const fragment = mainEntityUri.split('#')[1];
                    if (fragment) patterns.push(fragment);
                }
            }
            
            console.log('Trying patterns for URI:', patterns);
            
            for (let pattern of patterns) {
                if (pattern && titleHtml.includes(pattern)) {
                    console.log('Pattern matched:', pattern);
                    titleHtml = titleHtml.replace(
                        pattern,
                        `<a href="${mainEntityUri}" target="_blank" class="title-link">${pattern}</a>`
                    );
                    replaced = true;
                    break;
                }
            }
        }
        
        console.log('Title linking successful?', replaced);
        console.log('Final title HTML:', titleHtml);
    }
    
    let html = `
        <div class="pub-header">
            ${template ? `<span class="template-badge">${template.name}</span>` : (data.templateTag ? `<span class="template-type">${data.templateTag}</span>` : '')}
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-top: ${template || data.templateTag ? '15px' : '0'};">
                <h2 class="pub-title">${titleHtml}</h2>
                <div class="share-button" style="margin-top: 5px;">
                    <button class="share-icon" onclick="toggleShareDropdown(event)" title="Share nanopublication"><i class="fas fa-share-alt"></i></button>
                    <div class="share-dropdown" id="shareDropdown">
                        <div class="share-dropdown-item" onclick="window.copyNanopubLink('${data.uri}')"><i class="fas fa-copy"></i> Copy link</div>
                        <div class="share-dropdown-item" onclick="window.openNanopubLink('${data.uri}')"><i class="fas fa-external-link-alt"></i> Open in new tab</div>
                        <div class="share-dropdown-divider"></div>
                        <div class="share-dropdown-item" onclick="window.downloadFormat('${data.uri}', 'trig.txt')"><i class="fas fa-file-code"></i> TriG(txt)</div>
                        <div class="share-dropdown-item" onclick="window.downloadFormat('${data.uri}', 'jsonld')"><i class="fas fa-file-code"></i> JSON-LD(txt)</div>
                        <div class="share-dropdown-item" onclick="window.downloadFormat('${data.uri}', 'nq')"><i class="fas fa-file-code"></i> N-Quads(txt)</div>
                        <div class="share-dropdown-item" onclick="window.downloadFormat('${data.uri}', 'xml.txt')"><i class="fas fa-file-code"></i> XML(txt)</div>
                    </div>
                </div>
            </div>
            
            <div class="pub-meta">
                <div class="meta-item">
                    <div class="author-info">
                        ${data.authorOrcid ? `<a href="${data.authorOrcid}" target="_blank" title="ORCID Profile">${data.authorName || 'Unknown'}</a>` : `<span>${data.authorName || 'Unknown'}</span>`}
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="assertion-box">
    `;

    if (data.structuredData && data.structuredData.length > 0) {
        data.structuredData.forEach(field => {
            if (field.values.length === 0 && field.optional) return;
            
            const isDecodedContent = field.isDecodedUri || (field.values.length > 0 && 
                typeof field.values[0].display === 'string' && field.values[0].display.length > 50);
            
            if (field.isMainEntity && !isDecodedContent) {
                console.log('Skipping simple main entity field in body');
                return;
            }
            
            if (field.isMainEntity && isDecodedContent) {
                console.log('Showing main entity field with substantial content');
            }
            
            // Check if template wants to highlight this field
            const shouldHighlight = template && template.shouldHighlight(field);
            const fieldGroupClass = shouldHighlight ? 'field-group highlighted-field' : 'field-group';
            
            html += `<div class="${fieldGroupClass}">`;
            
            if (field.isSubjectField) {
                html += `<span class="field-label">${field.label}:</span>`;
            } else if (field.predicateUri) {
                if (typeof field.label === 'object' && field.label !== null && field.label.label) {
                    const label = field.label.label;
                    const description = field.label.description;
                    if (description) {
                        const uniqueId = 'desc-pred-' + Math.random().toString(36).substr(2, 9);
                        html += `<span class="field-label">
                            <a href="${field.predicateUri}" target="_blank" title="${field.predicateUri}">${escapeHtml(label)}</a>
                            <span class="info-icon" onclick="toggleDescription('${uniqueId}')" title="Show description"><i class="fas fa-info-circle"></i></span>:
                            <div id="${uniqueId}" class="wikidata-description">${escapeHtml(description)}</div>
                        </span>`;
                    } else {
                        html += `<span class="field-label"><a href="${field.predicateUri}" target="_blank" title="${field.predicateUri}">${escapeHtml(label)}</a>:</span>`;
                    }
                } else {
                    const labelText = typeof field.label === 'string' ? field.label : String(field.label);
                    html += `<span class="field-label"><a href="${field.predicateUri}" target="_blank" title="${field.predicateUri}">${labelText}</a>:</span>`;
                }
            } else {
                html += `<span class="field-label">${field.label}:</span>`;
            }
            
            html += `<div class="field-value">`;
            
            if (field.repeatable && field.values.length > 1) {
                html += '<ul>';
                field.values.forEach(val => {
                    html += '<li>' + formatValue(val, field.type, field.isDecodedUri) + '</li>';
                });
                html += '</ul>';
            } else {
                field.values.forEach((val, index) => {
                    if (index > 0) html += ', ';
                    html += formatValue(val, field.type, field.isDecodedUri);
                });
            }
            
            html += `</div></div>`;
        });
    } else if (data.unmatchedAssertions && data.unmatchedAssertions.length > 0) {
        html += `<div class="raw-statements">`;
        data.unmatchedAssertions.forEach(triple => {
            html += `<div class="statement-row">`;
            
            // Format subject
            const subjectLabel = formatUri(triple.subject);
            if (triple.subject.startsWith('http')) {
                html += `<span><a href="${triple.subject}" target="_blank" title="${triple.subject}">${subjectLabel}</a></span> → `;
            } else {
                html += `<span>${subjectLabel}</span> → `;
            }
            
            // Format predicate - try to get a better label
            let predicateLabel = formatUri(triple.predicate);
            
            // Common predicate mappings for better display
            const predicateMappings = {
                'cites': 'cites',
                'wasAttributedTo': 'was attributed to',
                'wasDerivedFrom': 'was derived from',
                'wasGeneratedBy': 'was generated by',
                'type': 'is a',
                'label': 'has label',
                'title': 'has title',
                'creator': 'created by',
                'created': 'created at',
                'describes': 'describes',
                'extends': 'extends',
                'supports': 'supports'
            };
            
            // Check if the label matches any known patterns
            for (const [key, value] of Object.entries(predicateMappings)) {
                if (predicateLabel.toLowerCase().includes(key.toLowerCase())) {
                    predicateLabel = value;
                    break;
                }
            }
            
            if (triple.predicate.startsWith('http')) {
                html += `<span><a href="${triple.predicate}" target="_blank" title="${triple.predicate}"><em>${predicateLabel}</em></a></span> → `;
            } else {
                html += `<span><em>${predicateLabel}</em></span> → `;
            }
            
            // Format object
            const objectLabel = formatUri(triple.object);
            if (typeof triple.object === 'string' && triple.object.startsWith('http')) {
                html += `<span><a href="${triple.object}" target="_blank" title="${triple.object}">${objectLabel}</a></span>`;
            } else {
                html += `<span>${objectLabel}</span>`;
            }
            
            html += `</div>`;
        });
        html += `</div>`;
    }

    html += `
            </div>
        </div>
    `;

    let createdByHtml = '';
    if (data.provenance && data.provenance.length > 0) {
    data.provenance.forEach(triple => {
        if (triple.predicate.includes('wasAttributedTo')) {
            let authorDisplay = '';
            let orcidUrl = triple.object;
            
            if (triple.object.includes('orcid.org')) {
                if (data.authorName) {
                    authorDisplay = data.authorName;
                } else {
                    authorDisplay = orcidUrl.split('/').pop();
                }
                createdByHtml = `<div style="padding: 20px 30px; font-size: 0.95em; display: flex; justify-content: space-between; align-items: center;"><div><strong>Created by:</strong> <a href="${orcidUrl}" target="_blank">${authorDisplay}</a></div>`;
            } else {
                createdByHtml = `<div style="padding: 20px 30px; font-size: 0.95em; display: flex; justify-content: space-between; align-items: center;"><div><strong>Created by:</strong> <a href="${triple.object}" target="_blank">${triple.object}</a></div>`;
            }
        }
    });
     } 
    if (createdByHtml) {
        let publicationInfoHtml = '';
        if (data.date || data.license) {
            publicationInfoHtml = '<div style="display: flex; gap: 30px; flex-wrap: wrap;">';
            if (data.date) {
                publicationInfoHtml += `<div><strong>Published:</strong> ${data.date}</div>`;
            }
            if (data.license) {
                publicationInfoHtml += `<div><strong>License:</strong> <a href="${data.license}" target="_blank">CC BY 4.0</a></div>`;
            }
            publicationInfoHtml += '</div>';
        }
        createdByHtml += publicationInfoHtml + '</div>';
        html += createdByHtml;
    }

    // NEW: Add citation section
    html += buildCitationSection(data);

    container.innerHTML = html;
    container.classList.add('active');
    
    // Store data globally for citation functions to access
    window.currentNanopubData = data;
}
// ============= UTILITY FUNCTIONS =============
function formatValue(val, types, isDecodedUri) {
    const isUri = val.raw && val.raw.startsWith('http');
    const isLongLiteral = types && types.includes('LongLiteralPlaceholder');
    
    // Detect content type for long literals
    const contentType = isLongLiteral ? detectContentType(val.display) : null;
    
    if (isDecodedUri) {
        // For decoded URIs (like AIDA sentences), show the full text without truncation
        return `<div class="decoded-sentence">${escapeHtml(getRawDisplayText(val.display))}</div>`;
    } else if (isUri) {
        // Check if display value is an object (from Wikidata)
        if (typeof val.display === 'object' && val.display !== null && val.display.label) {
            const label = val.display.label;
            const description = val.display.description;
            
            if (description) {
                const uniqueId = 'desc-' + Math.random().toString(36).substr(2, 9);
                return `
                    <span class="wikidata-item">
                        <a href="${val.raw}" target="_blank" class="wikidata-link">${escapeHtml(label)}</a>
                        <span class="info-icon" onclick="toggleDescription('${uniqueId}')" title="Show description"><i class="fas fa-info-circle"></i></span>
                        <div id="${uniqueId}" class="wikidata-description">${escapeHtml(description)}</div>
                    </span>
                `;
            } else {
                return `<a href="${val.raw}" target="_blank">${escapeHtml(label)}</a>`;
            }
        } else {
            const displayText = getDisplayText(val.display);
            return `<a href="${val.raw}" target="_blank">${escapeHtml(displayText)}</a>`;
        }
    } else if (contentType) {
        // Handle different content types specially
        return formatContentByType(val, contentType);
    } else if (isLongLiteral || (typeof val.display === 'string' && val.display.length > 100)) {
        // Generic long literal
        return formatGenericLongLiteral(val);
    } else {
        return `<div class="literal-value">${escapeHtml(getRawDisplayText(val.display))}</div>`;
    }
}

// ============= CONTENT TYPE DETECTION =============
function detectContentType(text) {
    if (typeof text !== 'string') return null;
    
    const trimmed = text.trim();
    
    // SPARQL query - check for SPARQL keywords
    if (trimmed.match(/^\s*(PREFIX|prefix|SELECT|select|CONSTRUCT|construct|ASK|ask|DESCRIBE|describe)\s/i) ||
        trimmed.includes('prefix ') || trimmed.includes('PREFIX ')) {
        return 'sparql';
    }
    
    // JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
            JSON.parse(trimmed);
            return 'json';
        } catch (e) {
            // Not valid JSON
        }
    }
    
    // XML
    if (trimmed.startsWith('<?xml') || trimmed.match(/^<[a-zA-Z][\w:]*[^>]*>/)) {
        return 'xml';
    }
    
    // Python code
    if (trimmed.match(/^(import|from|def|class|if __name__)/m)) {
        return 'python';
    }
    
    // JavaScript code
    if (trimmed.match(/^(function|const|let|var|class|import|export)/m) ||
        trimmed.includes('=>') || trimmed.includes('function(')) {
        return 'javascript';
    }
    
    // Markdown (has headers, lists, or code blocks)
    if (trimmed.match(/^#{1,6}\s/m) || 
        trimmed.match(/^[\*\-\+]\s/m) || 
        trimmed.includes('```')) {
        return 'markdown';
    }
    
    // CSV
    if (trimmed.split('\n').length > 2 && 
        trimmed.split('\n')[0].includes(',')) {
        const lines = trimmed.split('\n');
        const firstLineCount = lines[0].split(',').length;
        if (lines.slice(0, 3).every(line => line.split(',').length === firstLineCount)) {
            return 'csv';
        }
    }
    
    return null; // Unknown type
}

// ============= FORMAT BY CONTENT TYPE =============
function formatContentByType(val, contentType) {
    const uniqueId = `content-${contentType}-${Math.random().toString(36).substr(2, 9)}`;
    const text = getRawDisplayText(val.display);
    const escapedText = escapeHtml(text);
    
    const typeConfig = {
        sparql: {
            label: 'SPARQL Query',
            icon: 'fa-database',
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        },
        json: {
            label: 'JSON Data',
            icon: 'fa-brackets-curly',
            gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        },
        xml: {
            label: 'XML Document',
            icon: 'fa-code',
            gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
        },
        python: {
            label: 'Python Code',
            icon: 'fa-brands fa-python',
            gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
        },
        javascript: {
            label: 'JavaScript Code',
            icon: 'fa-brands fa-js',
            gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
        },
        markdown: {
            label: 'Markdown Text',
            icon: 'fa-brands fa-markdown',
            gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
        },
        csv: {
            label: 'CSV Data',
            icon: 'fa-table',
            gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
        }
    };
    
    const config = typeConfig[contentType] || {
        label: 'Code',
        icon: 'fa-file-code',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    };
    
    return `
        <div class="content-container ${contentType}-container">
            <div class="content-header" style="background: ${config.gradient}">
                <i class="fas ${config.icon}"></i>
                <span class="content-label">${config.label}</span>
                <button class="content-toggle" onclick="toggleContent('${uniqueId}')" title="Show/Hide">
                    <i class="fas fa-chevron-down"></i>
                </button>
                <button class="content-copy" onclick="copyContent('${uniqueId}')" title="Copy to Clipboard">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
            <pre id="${uniqueId}" class="content-block ${contentType}-block collapsed">${escapedText}</pre>
        </div>
    `;
}

// ============= FORMAT GENERIC LONG LITERAL =============
function formatGenericLongLiteral(val) {
    const uniqueId = 'long-' + Math.random().toString(36).substr(2, 9);
    const text = getRawDisplayText(val.display);
    
    return `
        <div class="long-literal-container">
            <div id="${uniqueId}" class="long-literal collapsed">${escapeHtml(text)}</div>
            <button class="show-more-btn" onclick="toggleLongLiteral('${uniqueId}')" title="Show more">
                <i class="fas fa-chevron-down"></i>
            </button>
        </div>
    `;
}

// ============= TOGGLE FUNCTIONS =============
window.toggleContent = function(id) {
    const element = document.getElementById(id);
    const button = element.previousElementSibling.querySelector('.content-toggle i');
    
    if (element.classList.contains('collapsed')) {
        element.classList.remove('collapsed');
        element.classList.add('expanded');
        button.classList.remove('fa-chevron-down');
        button.classList.add('fa-chevron-up');
    } else {
        element.classList.add('collapsed');
        element.classList.remove('expanded');
        button.classList.remove('fa-chevron-up');
        button.classList.add('fa-chevron-down');
    }
}

function copyContent(id) {
    const element = document.getElementById(id);
    const text = element.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        const button = element.previousElementSibling.querySelector('.content-copy i');
        button.classList.remove('fa-copy');
        button.classList.add('fa-check');
        
        setTimeout(() => {
            button.classList.remove('fa-check');
            button.classList.add('fa-copy');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy to clipboard');
    });
}

window.toggleLongLiteral = function(id) {
    const element = document.getElementById(id);
    const button = element.nextElementSibling.querySelector('i');
    
    if (element.classList.contains('collapsed')) {
        element.classList.remove('collapsed');
        element.classList.add('expanded');
        button.classList.remove('fa-chevron-down');
        button.classList.add('fa-chevron-up');
    } else {
        element.classList.add('collapsed');
        element.classList.remove('expanded');
        button.classList.remove('fa-chevron-up');
        button.classList.add('fa-chevron-down');
    }
}

// NEW FUNCTION: Get raw display text without any truncation
function getRawDisplayText(display) {
    if (typeof display === 'object' && display !== null && display.label) {
        return display.label;
    }
    if (typeof display === 'string') {
        return display;  // Return full string without any splitting
    }
    return String(display);
}

// UPDATED FUNCTION: Get display text with smart truncation for URIs only
function getDisplayText(display) {
    if (typeof display === 'object' && display !== null && display.label) {
        return display.label;
    }
    if (typeof display === 'string') {
        // Only split on " - " for URI labels that look like "Something - Description"
        // This pattern is typically only seen in parsed URI labels, not in AIDA sentences
        if (display.includes(' - ') && display.length < 100) {
            return display.split(' - ')[0];
        }
        return display;
    }
    return String(display);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function formatUri(uri) {
    if (!uri) return '';
    
    // Handle prefixed URIs (e.g., "cito:cites")
    if (!uri.startsWith('http') && uri.includes(':')) {
        const parts = uri.split(':');
        return parts[parts.length - 1];
    }
    
    // Handle full HTTP URIs
    if (uri.startsWith('http')) {
        const parts = uri.split(/[#\/]/);
        let localName = parts[parts.length - 1];
        
        // If the local name is too short (1-2 chars) or empty, 
        // it might be a malformed URI. Try to get a better label.
        if (!localName || localName.length <= 2) {
            // Try the second-to-last part
            if (parts.length > 1) {
                const prevPart = parts[parts.length - 2];
                if (prevPart && prevPart.length > 2) {
                    localName = prevPart;
                }
            }
        }
        
        // Convert camelCase to readable format
        if (localName) {
            localName = localName
                .replace(/([A-Z])/g, ' $1')  // Add space before capitals
                .replace(/^./, str => str.toUpperCase())  // Capitalize first letter
                .trim();
        }
        
        return localName || uri.split('/').pop() || uri;
    }
    
    return uri;
}

function showError(message) {
    document.getElementById('error').textContent = message;
    document.getElementById('error').classList.add('active');
    document.getElementById('loading').classList.remove('active');
}

// ============= ADVANCED OPTIONS TOGGLE =============
window.toggleAdvancedOptions = function() {
    const options = document.getElementById('advancedOptions');
    const icon = document.getElementById('advancedToggleIcon');
    
    if (options.style.display === 'none') {
        options.style.display = 'block';
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        options.style.display = 'none';
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    }
}

// ============= WIKIDATA DESCRIPTION TOGGLE =============
window.toggleDescription = function(descId) {
    const descElement = document.getElementById(descId);
    
    if (descElement) {
        const linkElement = descElement.previousElementSibling;
        descElement.classList.toggle('expanded');
        
        // Update aria-expanded for accessibility
        const isExpanded = descElement.classList.contains('expanded');
        if (linkElement) {
            linkElement.setAttribute('aria-expanded', isExpanded);
        }
    }
};

/**
 * Build the citation section HTML
 */
function buildCitationSection(data) {
    const defaultCitation = generateCitation(data, 'apa');
    
    return `
        <div class="citation-section">
            <h3><i class="fas fa-quote-right"></i> Cite This Nanopublication</h3>
            
            <div class="citation-formats">
                <button class="citation-format-btn active" onclick="switchCitationFormat('apa', window.currentNanopubData)">
                    <i class="fas fa-book"></i> APA
                </button>
                <button class="citation-format-btn" onclick="switchCitationFormat('mla', window.currentNanopubData)">
                    <i class="fas fa-graduation-cap"></i> MLA
                </button>
                <button class="citation-format-btn" onclick="switchCitationFormat('chicago', window.currentNanopubData)">
                    <i class="fas fa-landmark"></i> Chicago
                </button>
                <button class="citation-format-btn" onclick="switchCitationFormat('bibtex', window.currentNanopubData)">
                    <i class="fas fa-code"></i> BibTeX
                </button>
            </div>
            
            <div class="citation-display">
                <div id="citation-text">${defaultCitation}</div>
            </div>
            
            <div class="citation-actions">
                <button class="citation-copy-btn" onclick="copyCitation('apa', window.currentNanopubData)">
                    <i class="fas fa-copy"></i> Copy Citation
                </button>
            </div>
        </div>
    `;
}

// ============= CITATION SUPPORT =============

/**
 * Generate citation in different formats
 */
function generateCitation(data, format = 'apa') {
    const author = data.authorName || 'Unknown Author';
    const year = data.date ? new Date(data.date).getFullYear() : 'n.d.';
    const title = data.title || 'Untitled Nanopublication';
    const uri = data.uri;
    
    if (!uri) return ''; 
    
    // Extract just the nanopub ID for cleaner display
    const npId = uri.split('/').pop();
    
    const formats = {
        apa: `${author}. (${year}). <em>${title}</em> [Nanopublication]. ${uri}`,
        mla: `${author}. "${title}." <em>Nanopublication</em>, ${year}, ${uri}.`,
        chicago: `${author}. "${title}." Nanopublication. ${year}. ${uri}.`,
        bibtex: `@misc{nanopub_${npId},
  author = {${author}},
  title = {${title}},
  year = {${year}},
  howpublished = {Nanopublication},
  url = {${uri}}
}`
    };
    
    return formats[format] || formats.apa;
}

/**
 * Copy citation to clipboard
 */
window.copyCitation = function(format, data) {
    const citation = generateCitation(data, format);
    
    // Strip HTML tags for plain text copy
    const plainText = citation.replace(/<[^>]*>/g, '');
    
    navigator.clipboard.writeText(plainText).then(() => {
        // Show success feedback
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        button.style.background = '#10b981';
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy citation:', err);
        alert('Failed to copy to clipboard');
    });
}

/**
 * Switch displayed citation format
 */
window.switchCitationFormat = function(format, data) {
    const citationText = document.getElementById('citation-text');
    const citation = generateCitation(data, format);
    citationText.innerHTML = citation;
    
    // Update active button state
    document.querySelectorAll('.citation-format-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}
