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
                html += `<span class="field-label"><a href="${field.predicateUri}" target="_blank" title="${field.predicateUri}">${field.label}</a>:</span>`;
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
    const isUri = val.raw.startsWith('http');
    const isLongLiteral = types && types.includes('LongLiteralPlaceholder');
    
    if (isDecodedUri) {
        // Show decoded text prominently, not as a link
        return `<div class="decoded-sentence">${val.display}</div>`;
    } else if (isUri) {
        const displayText = val.display.split(' - ')[0];
        return `<a href="${val.raw}" target="_blank">${displayText}</a>`;
    } else if (isLongLiteral || val.display.length > 100) {
        return `<div class="long-literal">${val.display}</div>`;
    } else {
        return `<div class="literal-value">${val.display}</div>`;
    }
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
