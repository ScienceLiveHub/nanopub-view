// ============= FILE UPLOAD HANDLERS =============
document.getElementById('npFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('npFileName').textContent = file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('npContent').value = e.target.result;
        };
        reader.onerror = function(e) {
            showError('Error reading file: ' + e.target.error);
        };
        reader.readAsText(file);
    }
});

document.getElementById('templateFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('templateFileName').textContent = file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('templateContent').value = e.target.result;
        };
        reader.onerror = function(e) {
            showError('Error reading file: ' + e.target.error);
        };
        reader.readAsText(file);
    }
});

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
    const npId = uri.split('/').pop();
    const registryUrl = `https://nanodash.knowledgepixels.com/explore?57&id=${npId}`;
    window.open(registryUrl, '_blank');
    const dropdown = document.getElementById('shareDropdown');
    dropdown.classList.remove('active');
};

window.downloadFormat = function(uri, format) {
    const npId = uri.split('/').pop();
    const downloadUrl = `https://registry.knowledgepixels.com/np/${npId}.${format}`;
    window.open(downloadUrl, '_blank');
    const dropdown = document.getElementById('shareDropdown');
    dropdown.classList.remove('active');
};

function toggleShareDropdown(event) {
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

document.addEventListener('click', function(event) {
    const shareButton = document.querySelector('.share-button');
    if (shareButton && !shareButton.contains(event.target)) {
        const dropdown = document.getElementById('shareDropdown');
        if (dropdown) {
            dropdown.classList.remove('active');
        }
    }
});

// ============= MAIN PROCESSING FUNCTION =============
async function processNanopub() {
    const npContent = document.getElementById('npContent').value;
    // DEBUG: Log the full content
    console.log('=== RAW NANOPUB CONTENT ===');
    console.log('Total length:', npContent.length);
    console.log('Triple quote count:', (npContent.match(/"""/g) || []).length);
    console.log('Last 200 chars:', npContent.slice(-200));
    console.log('===========================');

    let templateContent = document.getElementById('templateContent').value;
    
    if (!npContent.trim()) {
        showError('Please provide a nanopublication to display');
        return;
    }

    document.getElementById('loading').classList.add('active');
    document.getElementById('loading').textContent = 'Processing nanopublication...';
    document.getElementById('error').classList.remove('active');
    
    try {
        const parser = new NanopubParser(npContent, templateContent);
        
        if (!templateContent || !templateContent.trim()) {
            document.getElementById('loading').textContent = 'Looking for template reference...';
            const templateUri = parser.extractTemplateUri();
            
            if (templateUri) {
                console.log('Found template URI:', templateUri);
                document.getElementById('loading').textContent = 'Fetching template from ' + templateUri + '...';
                
                try {
                    let fetchedContent = null;
                    
                    try {
                        const response = await fetch(templateUri, {
                            headers: {
                                'Accept': 'text/turtle, application/trig, application/rdf+xml, text/plain'
                            },
                            mode: 'cors'
                        });
                        
                        if (response.ok) {
                            fetchedContent = await response.text();
                        }
                    } catch (directError) {
                        console.warn('Direct fetch failed:', directError);
                    }
                    
                    if (!fetchedContent) {
                        try {
                            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(templateUri)}`;
                            const response = await fetch(proxyUrl);
                            if (response.ok) {
                                fetchedContent = await response.text();
                            }
                        } catch (proxyError) {
                            console.warn('Proxy fetch failed:', proxyError);
                        }
                    }
                    
                    if (fetchedContent) {
                        templateContent = fetchedContent;
                        console.log('Template fetched successfully');
                        parser.templateContent = templateContent;
                        parser.template = null;
                    } else {
                        console.warn('Could not fetch template from any source');
                        document.getElementById('loading').textContent = 'Template not accessible, continuing without it...';
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } catch (fetchError) {
                    console.warn('Error fetching template:', fetchError);
                    document.getElementById('loading').textContent = 'Could not fetch template, continuing without it...';
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } else {
                console.log('No template reference found in nanopublication');
            }
        }
        
        document.getElementById('loading').textContent = 'Fetching predicate labels from the web...';
        
        console.log('About to call parseWithLabels');
        const data = await parser.parseWithLabels();
        console.log('parseWithLabels returned:', data);
        displayPublication(data);
    } catch (error) {
        console.error('Parse error:', error);
        showError('Error parsing nanopublication: ' + error.message);
    } finally {
        document.getElementById('loading').classList.remove('active');
    }
}

// ============= DISPLAY FUNCTIONS =============
function displayPublication(data) {
    let html = `
        <div class="pub-header">
            ${data.templateTag ? `<span class="template-type">${data.templateTag}</span>` : ''}
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-top: ${data.templateTag ? '15px' : '0'};">
                <h2 class="pub-title">${data.title || 'Nanopublication Document'}</h2>
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
        let commonSubject = null;
        if (data.commonSubject) {
            commonSubject = data.commonSubject;
            html += `<div class="field-group">`;
            let subjectLabel = data.commonSubjectLabel || 'Subject';
            html += `<span class="field-label">${subjectLabel}:</span>`;
            html += `<div class="field-value">`;
            if (commonSubject.startsWith('http')) {
                let displayText = commonSubject;
                if (commonSubject.includes('doi.org/')) {
                    displayText = 'DOI: ' + commonSubject.split('doi.org/')[1];
                }
                html += `<a href="${commonSubject}" target="_blank">${displayText}</a>`;
            } else {
                html += commonSubject;
            }
            html += `</div></div>`;
        }

        data.structuredData.forEach(field => {
            if (field.values.length === 0 && field.optional) return;
            
            // Display main entity field prominently
            if (field.isMainEntity) {
                html += `<div class="field-group main-entity-group">`;
                html += `<div class="field-value">`;
                field.values.forEach((val, index) => {
                    if (index > 0) html += '<br>';
                    html += formatValue(val, field.type, field.isDecodedUri);
                });
                html += `</div></div>`;
                return; // Skip to next field
            }
            
            html += `<div class="field-group">`;
            
            if (field.isSubjectField) {
                html += `<span class="field-label">${field.label}:</span>`;
            } else if (field.predicateUri) {
                // Check if label is an object with description
                if (typeof field.label === 'object' && field.label !== null && field.label.label) {
                    const label = field.label.label;
                    const description = field.label.description;
                    if (description) {
                        const uniqueId = 'desc-pred-' + Math.random().toString(36).substr(2, 9);
                        html += `<span class="field-label">
                            <a href="${field.predicateUri}" target="_blank" title="${field.predicateUri}">${escapeHtml(label)}</a>
                            <span class="info-icon" onclick="toggleDescription('${uniqueId}')" title="Show description">ℹ️</span>:
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
    } else if (data.unmatchedAssertions.length > 0) {
        html += `<div class="raw-statements">`;
        data.unmatchedAssertions.forEach(triple => {
            html += `<div class="statement-row">`;
            html += `<span>${formatUri(triple.subject)}</span> → `;
            html += `<span>${formatUri(triple.predicate)}</span> → `;
            html += `<span>${formatUri(triple.object)}</span>`;
            html += `</div>`;
        });
        html += `</div>`;
    }

    html += `
            </div>
        </div>
    `;

    let createdByHtml = '';
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

    document.getElementById('publication').innerHTML = html;
    document.getElementById('publication').classList.add('active');
}

// ============= UTILITY FUNCTIONS =============
// ============= ENHANCED FORMAT VALUE FUNCTION =============
// ============= DEBUG VERSION OF formatValue =============
// This adds extra logging to see what's happening

function formatValue(val, types, isDecodedUri) {
    const isUri = val.raw && val.raw.startsWith('http');
    const isLongLiteral = types && types.includes('LongLiteralPlaceholder');
    
    // Log the full value for debugging
    console.log('=== formatValue DEBUG ===');
    console.log('val.raw length:', val.raw ? val.raw.length : 0);
    console.log('val.display length:', typeof val.display === 'string' ? val.display.length : 'not a string');
    console.log('isLongLiteral:', isLongLiteral);
    console.log('Full display value:', val.display);
    
    // Detect content type for long literals
    const contentType = isLongLiteral ? detectContentType(val.display) : null;
    
    console.log('Detected contentType:', contentType);
    console.log('========================');
    
    if (isDecodedUri) {
        return `<div class="decoded-sentence">${escapeHtml(getDisplayText(val.display))}</div>`;
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
                        <span class="info-icon" onclick="toggleDescription('${uniqueId}')" title="Show description">ℹ️</span>
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
        console.log('Using formatContentByType with:', contentType);
        // Handle different content types specially
        return formatContentByType(val, contentType);
    } else if (isLongLiteral || (typeof val.display === 'string' && val.display.length > 100)) {
        console.log('Using formatGenericLongLiteral');
        // Generic long literal
        return formatGenericLongLiteral(val);
    } else {
        return `<div class="literal-value">${escapeHtml(getDisplayText(val.display))}</div>`;
    }
}
// ============= CONTENT TYPE DETECTION =============
// Add this new function to detect content types
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
// Add this new function to format different content types
function formatContentByType(val, contentType) {
    const uniqueId = `content-${contentType}-${Math.random().toString(36).substr(2, 9)}`;
    const text = getDisplayText(val.display);
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
// Add this new function for generic long text
function formatGenericLongLiteral(val) {
    const uniqueId = 'long-' + Math.random().toString(36).substr(2, 9);
    const text = getDisplayText(val.display);
    
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
// Add these new toggle functions

// Toggle content visibility (works for any content type)
function toggleContent(id) {
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

// Copy content to clipboard
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

// Toggle long literal visibility
function toggleLongLiteral(id) {
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
function getDisplayText(display) {
    if (typeof display === 'object' && display !== null && display.label) {
        return display.label;
    }
    if (typeof display === 'string') {
        return display.split(' - ')[0];
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
    if (uri.startsWith('http')) {
        const parts = uri.split(/[#\/]/);
        return parts[parts.length - 1];
    }
    return uri;
}

function showError(message) {
    document.getElementById('error').textContent = message;
    document.getElementById('error').classList.add('active');
    document.getElementById('loading').classList.remove('active');
}

// ============= ADVANCED OPTIONS TOGGLE =============
function toggleAdvancedOptions() {
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
