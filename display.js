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
// ============= FETCH NANOPUB FROM URL =============
async function fetchNanopubFromUrl() {
    const urlInput = document.getElementById('npUrl');
    const url = urlInput.value.trim();
    
    if (!url) {
        showError('Please enter a nanopublication URL');
        return;
    }
    
    // Extract the nanopub ID from the URL
    let npId = null;
    
    // Handle w3id.org URLs
    if (url.includes('w3id.org/np/')) {
        npId = url.split('w3id.org/np/')[1].split(/[?#]/)[0];
    }
    // Handle registry.knowledgepixels.com URLs
    else if (url.includes('registry.knowledgepixels.com/np/')) {
        npId = url.split('registry.knowledgepixels.com/np/')[1].split(/[?#.]/)[0];
    }
    // If just an ID is pasted
    else if (url.match(/^[A-Za-z0-9_-]+$/)) {
        npId = url;
    }
    else {
        showError('Invalid nanopublication URL. Please use a w3id.org/np/ or registry.knowledgepixels.com URL');
        return;
    }
    
    if (!npId) {
        showError('Could not extract nanopublication ID from URL');
        return;
    }
    
    // Construct the TriG URL
    const trigUrl = `https://registry.knowledgepixels.com/np/${npId}.trig`;
    
    document.getElementById('loading').classList.add('active');
    document.getElementById('loading').textContent = `Fetching nanopublication from ${trigUrl}...`;
    document.getElementById('error').classList.remove('active');
    
    try {
        const response = await fetch(trigUrl, {
            headers: {
                'Accept': 'application/trig, text/turtle, text/plain'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch nanopublication: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        
        if (!content || content.trim().length === 0) {
            throw new Error('Received empty content from server');
        }
        
        // Populate the textarea with the fetched content
        document.getElementById('npContent').value = content;
        
        // Clear the URL input
        urlInput.value = '';
        
        // Show success message briefly
        document.getElementById('loading').textContent = 'Nanopublication fetched successfully! Processing...';
        
        // Automatically process the nanopub
        await new Promise(resolve => setTimeout(resolve, 500));
        await processNanopub();
        
    } catch (error) {
        console.error('Fetch error:', error);
        showError(`Error fetching nanopublication: ${error.message}`);
    } finally {
        document.getElementById('loading').classList.remove('active');
    }
}
// ============= MAIN PROCESSING FUNCTION =============
async function processNanopub() {
    const npContent = document.getElementById('npContent').value;
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
            
            // Clean the display value of any extra spaces
            const cleanDisplay = mainEntityDisplay ? mainEntityDisplay.replace(/\s+/g, '') : '';
            console.log('Clean display:', cleanDisplay);
            
            // Try to find the DOI part in the title in various formats
            const patterns = [
                cleanDisplay,       // Try the cleaned display value first
                doiPart,            // Try the full DOI part
                doiPart.split('/').pop(),  // Try just the last part
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
            // For non-DOI URIs, try multiple strategies
            const patterns = [];
            
            // 1. Try the display value
            if (mainEntityDisplay) {
                patterns.push(mainEntityDisplay);
            }
            
            // 2. Try parsing the URI for common patterns
            if (mainEntityUri.startsWith('http')) {
                // Get the last part of the path (after last /)
                const uriParts = mainEntityUri.split('/').filter(p => p);
                const lastPart = uriParts[uriParts.length - 1];
                if (lastPart) patterns.push(lastPart);
                
                // Get the part before last / (useful for paths like /TR/shacl/)
                if (uriParts.length > 1) {
                    const secondLast = uriParts[uriParts.length - 2];
                    if (secondLast) patterns.push(secondLast);
                }
                
                // Try the fragment (after #)
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
            ${data.templateTag ? `<span class="template-type">${data.templateTag}</span>` : ''}
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-top: ${data.templateTag ? '15px' : '0'};">
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
            
            // Show main entity field if it's decoded (like AIDA sentences) or substantial content
            // Only skip simple URI main entities
            const isDecodedContent = field.isDecodedUri || (field.values.length > 0 && 
                typeof field.values[0].display === 'string' && field.values[0].display.length > 50);
            
            if (field.isMainEntity && !isDecodedContent) {
                console.log('Skipping simple main entity field in body');
                return;
            }
            
            if (field.isMainEntity && isDecodedContent) {
                console.log('Showing main entity field with substantial content');
            }
            
            html += `<div class="field-group">`;
            
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
