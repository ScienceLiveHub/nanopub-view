// ============= TEMPLATE PROCESSOR =============
class TemplateProcessor {
    constructor(templateContent, prefixes) {
        this.content = templateContent;
        this.prefixes = prefixes;
        this.structure = {
            statements: {},
            placeholders: {},
            labels: {},
            title: null,
            description: null,
            tag: null,
            statementOrder: []
        };
    }

    parse() {
        if (!this.content) return this.structure;
        
        this.extractTemplateMetadata();
        this.extractStatementDefinitions();
        this.extractPlaceholderDefinitions();
        this.extractLabels();
        
        return this.structure;
    }

    extractTemplateMetadata() {
        const titleMatch = this.content.match(/sub:assertion[^}]*rdfs:label\s+"([^"]+)"/);
        if (titleMatch) {
            this.structure.title = titleMatch[1];
        }
        
        const descMatch = this.content.match(/dct:description\s+"([^"]+)"/);
        if (descMatch) {
            this.structure.description = descMatch[1];
        }
        
        const tagMatch = this.content.match(/nt:hasTag\s+"([^"]+)"/);
        if (tagMatch) {
            this.structure.tag = tagMatch[1];
        }
        
        const hasStatementRegex = /nt:hasStatement\s+([^;.]+)/;
        const match = this.content.match(hasStatementRegex);
        if (match) {
            this.structure.statementOrder = match[1].split(',').map(s => s.trim());
        }
    }

    extractStatementDefinitions() {
        const stmtRegex = /(sub:st[\w-]+)[^.;]*rdf:subject\s+([^;\s]+)[^.;]*rdf:predicate\s+([^;\s]+)[^.;]*rdf:object\s+([^;\s.]+)/g;
        let match;
        
        while ((match = stmtRegex.exec(this.content)) !== null) {
            const stmtId = match[1];
            const subject = this.expandUri(match[2]);
            const predicate = this.expandUri(match[3]);
            const object = match[4];
            
            const isOptional = this.content.includes(stmtId + ' a nt:OptionalStatement');
            const isRepeatable = this.content.includes(stmtId + ' a nt:RepeatableStatement');
            const isGrouped = this.content.includes(stmtId + ' a nt:GroupedStatement');
            
            this.structure.statements[stmtId] = {
                id: stmtId,
                subject: subject,
                predicate: predicate,
                object: object,
                optional: isOptional,
                repeatable: isRepeatable,
                grouped: isGrouped
            };
        }
    }

    extractPlaceholderDefinitions() {
        const placeholderRegex = /(sub:\w+)\s+a\s+([^;]+);[^}]*rdfs:label\s+"([^"]+)"/g;
        let match;
        
        while ((match = placeholderRegex.exec(this.content)) !== null) {
            const placeholderId = match[1];
            const types = match[2].split(',').map(t => t.trim());
            const label = match[3];
            
            const placeholderTypes = [];
            types.forEach(type => {
                if (type.includes('Placeholder')) {
                    placeholderTypes.push(type.split(':').pop());
                }
            });
            
            this.structure.placeholders[placeholderId] = {
                types: placeholderTypes,
                label: label
            };
        }
    }

    extractLabels() {
        const labelRegex = /(<[^>]+>|[\w]+:[\w-]+)\s+rdfs:label\s+"([^"]+)"/g;
        let match;
        
        while ((match = labelRegex.exec(this.content)) !== null) {
            const uri = this.expandUri(match[1]);
            const label = match[2];
            this.structure.labels[uri] = label;
        }
    }

    expandUri(uri) {
        if (!uri) return uri;
        uri = uri.trim();
        
        if (uri === 'nt:CREATOR') return 'CREATOR';
        if (uri.startsWith('<') && uri.endsWith('>')) {
            return uri.slice(1, -1);
        }
        if (uri.startsWith('sub:')) {
            return uri;
        }
        
        const colonIndex = uri.indexOf(':');
        if (colonIndex > 0) {
            const prefix = uri.substring(0, colonIndex);
            const local = uri.substring(colonIndex + 1);
            if (this.prefixes[prefix]) {
                return this.prefixes[prefix] + local;
            }
        }
        return uri;
    }
}

// ============= NANOPUB PARSER =============
class NanopubParser {
    constructor(content, templateContent) {
        this.content = content;
        this.templateContent = templateContent;
        this.prefixes = {};
        this.data = {
            assertions: [],
            provenance: [],
            pubinfo: []
        };
        this.template = null;
    }

    parse() {
        this.extractPrefixes();
        this.parseAllStatements();
        
        if (this.templateContent) {
            const processor = new TemplateProcessor(this.templateContent, this.prefixes);
            this.template = processor.parse();
        }
        
        return this.formatForPublication();
    }

    extractPrefixes() {
        const prefixRegex = /@prefix\s+(\w+):\s+<([^>]+)>/g;
        let match;
        
        while ((match = prefixRegex.exec(this.content)) !== null) {
            this.prefixes[match[1]] = match[2];
        }
        
        if (this.templateContent) {
            while ((match = prefixRegex.exec(this.templateContent)) !== null) {
                this.prefixes[match[1]] = match[2];
            }
        }
    }

    parseAllStatements() {
        const assertionMatch = this.content.match(/sub:assertion\s*\{([^}]+)\}/s);
        if (assertionMatch) {
            this.data.assertions = this.parseTriples(assertionMatch[1]);
        }

        const provMatch = this.content.match(/sub:provenance\s*\{([^}]+)\}/s);
        if (provMatch) {
            this.data.provenance = this.parseTriples(provMatch[1]);
        }

        const pubinfoMatch = this.content.match(/sub:pubinfo\s*\{([^}]+)\}/s);
        if (pubinfoMatch) {
            this.data.pubinfo = this.parseTriples(pubinfoMatch[1]);
        }
    }

    parseTriples(content) {
        const triples = [];
        const statements = this.splitStatements(content);
        
        statements.forEach(statement => {
            const trimmed = statement.trim();
            if (!trimmed) return;
            
            const lines = trimmed.split(/;\s*\n\s*/);
            let currentSubject = null;
            
            lines.forEach((line, index) => {
                line = line.trim();
                if (!line) return;
                
                if (index === 0) {
                    const match = line.match(/^(\S+)\s+(\S+)\s+(.+)$/s);
                    if (match) {
                        currentSubject = this.expandUri(match[1]);
                        triples.push({
                            subject: currentSubject,
                            predicate: this.expandUri(match[2]),
                            object: this.cleanObject(match[3])
                        });
                    }
                } else {
                    const match = line.match(/^(\S+)\s+(.+)$/s);
                    if (match && currentSubject) {
                        triples.push({
                            subject: currentSubject,
                            predicate: this.expandUri(match[1]),
                            object: this.cleanObject(match[2])
                        });
                    }
                }
            });
        });
        
        return triples;
    }

    splitStatements(content) {
        const statements = [];
        let current = '';
        let inQuotes = false;
        let tripleQuotes = false;
        
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            
            if (content.substr(i, 3) === '"""') {
                tripleQuotes = !tripleQuotes;
                current += '"""';
                i += 2;
                continue;
            }
            
            if (char === '"' && !tripleQuotes && content[i-1] !== '\\') {
                inQuotes = !inQuotes;
            }
            
            current += char;
            
            if (char === '.' && !inQuotes && !tripleQuotes && content[i+1]?.match(/\s/)) {
                statements.push(current.slice(0, -1));
                current = '';
            }
        }
        
        if (current.trim()) {
            statements.push(current);
        }
        
        return statements;
    }

    cleanObject(obj) {
        if (!obj) return '';
        obj = obj.trim();
        
        if (obj.endsWith('.') || obj.endsWith(';')) {
            obj = obj.slice(0, -1).trim();
        }
        
        if (obj.includes('^^')) {
            const parts = obj.split('^^');
            obj = parts[0];
        }
        
        if (obj.startsWith('"""') && obj.includes('"""', 3)) {
            return obj.slice(3, obj.lastIndexOf('"""'));
        }
        
        if (obj.startsWith('"') && obj.includes('"', 1)) {
            return obj.slice(1, obj.lastIndexOf('"'));
        }
        
        return this.expandUri(obj);
    }

    expandUri(uri) {
        if (!uri) return '';
        uri = uri.trim();
        
        if (uri.startsWith('<') && uri.endsWith('>')) {
            return uri.slice(1, -1);
        }
        
        const colonIndex = uri.indexOf(':');
        if (colonIndex > 0) {
            const prefix = uri.substring(0, colonIndex);
            const local = uri.substring(colonIndex + 1);
            if (this.prefixes[prefix]) {
                return this.prefixes[prefix] + local;
            }
        }
        return uri;
    }

    formatForPublication() {
        const result = {
            uri: '',
            title: '',
            author: '',
            authorName: '',
            authorOrcid: '',
            date: '',
            license: '',
            templateTitle: this.template?.title,
            templateTag: this.template?.tag,
            structuredData: [],
            unmatchedAssertions: [],
            provenance: this.data.provenance,
            entityLabels: {},
            commonSubject: null,
            commonSubjectLabel: null
        };

        const uriMatch = this.content.match(/@prefix this: <([^>]+)>/);
        if (uriMatch) {
            result.uri = uriMatch[1];
        }

        this.data.pubinfo.forEach(triple => {
            if (triple.predicate.includes('creator')) {
                result.author = triple.object;
            }
            if (triple.predicate.includes('created')) {
                try {
                    const date = new Date(triple.object);
                    if (!isNaN(date.getTime())) {
                        result.date = date.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        });
                    }
                } catch (e) {}
            }
            if (triple.predicate.includes('name')) {
                result.authorName = triple.object;
            }
            if (triple.predicate.includes('license')) {
                result.license = triple.object;
            }
            if (triple.predicate.includes('#label')) {
                result.title = triple.object;
            }
            if (triple.predicate.includes('hasLabelFromApi')) {
                result.entityLabels[triple.subject] = triple.object;
            }
        });

        this.data.provenance.forEach(triple => {
            if (triple.predicate.includes('wasAttributedTo') && triple.object.includes('orcid.org')) {
                result.authorOrcid = triple.object;
            }
        });

        if (!result.title && this.template?.title) {
            result.title = this.template.title;
        }

        if (this.template && this.template.statementOrder.length > 0) {
            const subjects = new Set(this.data.assertions.map(t => t.subject));
            if (subjects.size === 1) {
                const subject = Array.from(subjects)[0];
                if (subject.startsWith('http') && !subject.includes('/np/') && !subject.includes('orcid.org')) {
                    result.commonSubject = subject;
                    
                    for (let stmtId in this.template.statements) {
                        const stmt = this.template.statements[stmtId];
                        if (stmt.subject && stmt.subject.startsWith('sub:')) {
                            const placeholder = this.template.placeholders[stmt.subject];
                            if (placeholder && placeholder.label) {
                                result.commonSubjectLabel = placeholder.label;
                                break;
                            }
                        }
                    }
                }
            }
            
            if (!result.commonSubject) {
                const objectPlaceholders = new Map();
                for (let stmtId of this.template.statementOrder) {
                    const stmt = this.template.statements[stmtId];
                    if (stmt && stmt.object && stmt.object.startsWith('sub:')) {
                        const placeholder = this.template.placeholders[stmt.object];
                        if (placeholder && placeholder.types.includes('ExternalUriPlaceholder')) {
                            objectPlaceholders.set(stmt.object, placeholder);
                        }
                    }
                }
                
                for (let [placeholderId, placeholder] of objectPlaceholders) {
                    let isAlsoSubject = false;
                    for (let stmtId in this.template.statements) {
                        const stmt = this.template.statements[stmtId];
                        if (stmt.subject === placeholderId) {
                            isAlsoSubject = true;
                            break;
                        }
                    }
                    
                    if (isAlsoSubject) {
                        for (let triple of this.data.assertions) {
                            if (triple.object.startsWith('http') && !triple.object.includes('/np/')) {
                                const appearsAsSubject = this.data.assertions.some(t => t.subject === triple.object);
                                if (appearsAsSubject) {
                                    result.commonSubject = triple.object;
                                    result.commonSubjectLabel = placeholder.label;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            
            if (!result.commonSubjectLabel) {
                if (this.template?.title) {
                    if (this.template.title.toLowerCase().includes('review')) {
                        result.commonSubjectLabel = 'Paper';
                    } else if (this.template.title.toLowerCase().includes('favorite') || 
                              this.template.title.toLowerCase().includes('favorited')) {
                        result.commonSubjectLabel = 'Resource';
                    }
                }
            }
            
            result.structuredData = this.matchTemplateToData(result.entityLabels);
        } else {
            result.unmatchedAssertions = this.data.assertions;
        }

        return result;
    }

    matchTemplateToData(entityLabels) {
        const structured = [];
        const matched = new Set();
        
        let mainEntityPlaceholder = null;
        let mainEntityActualValue = null;
        let mainEntityLabel = null;
        
        const placeholderOccurrences = {};
        
        this.template.statementOrder.forEach(stmtId => {
            const stmt = this.template.statements[stmtId];
            if (!stmt) return;
            
            if (stmt.object && stmt.object.startsWith('sub:')) {
                placeholderOccurrences[stmt.object] = (placeholderOccurrences[stmt.object] || 0) + 1;
            }
            
            if (stmt.subject && stmt.subject.startsWith('sub:') && stmt.subject !== 'CREATOR') {
                placeholderOccurrences[stmt.subject] = (placeholderOccurrences[stmt.subject] || 0) + 1;
            }
        });
        
        for (let [placeholder, count] of Object.entries(placeholderOccurrences)) {
            if (count > 1) {
                mainEntityPlaceholder = placeholder;
                mainEntityLabel = this.template.placeholders[placeholder]?.label || 'Subject';
                
                this.data.assertions.forEach(triple => {
                    if (triple.object.startsWith('http')) {
                        const showsAsObject = this.data.assertions.some(t => 
                            t.object === triple.object && 
                            t.predicate === this.template.statements[this.template.statementOrder[0]]?.predicate
                        );
                        
                        const showsAsSubject = this.data.assertions.some(t => 
                            t.subject === triple.object
                        );
                        
                        if (showsAsObject && showsAsSubject && !mainEntityActualValue) {
                            mainEntityActualValue = triple.object;
                        }
                    }
                });
                
                break;
            }
        }
        
        if (mainEntityActualValue) {
            const field = {
                statementId: 'main-entity',
                label: mainEntityLabel,
                values: [{
                    raw: mainEntityActualValue,
                    display: entityLabels[mainEntityActualValue] || mainEntityActualValue
                }],
                type: ['ExternalUriPlaceholder'],
                isMainEntity: true
            };
            
            structured.push(field);
            matched.add(mainEntityActualValue);
        }
        
        this.template.statementOrder.forEach(stmtId => {
            const stmt = this.template.statements[stmtId];
            if (!stmt) return;
            
            const matchingTriples = [];
            
            this.data.assertions.forEach(triple => {
                if (triple.predicate !== stmt.predicate) return;
                
                if (triple.object === mainEntityActualValue) return;
                
                if (stmt.subject === 'CREATOR' || 
                    stmt.subject.startsWith('sub:') ||
                    triple.subject.includes(stmt.subject.replace('sub:', ''))) {
                    matchingTriples.push(triple);
                    matched.add(triple);
                }
            });
            
            if (matchingTriples.length > 0 || !stmt.optional) {
                const placeholder = this.template.placeholders[stmt.object];
                const field = {
                    statementId: stmtId,
                    label: placeholder ? placeholder.label : 
                           this.template.labels[stmt.predicate] || 
                           this.getSimpleLabel(stmt.predicate),
                    values: [],
                    type: placeholder ? placeholder.types : ['literal'],
                    repeatable: stmt.repeatable,
                    optional: stmt.optional
                };
                
                matchingTriples.forEach(triple => {
                    let displayValue = triple.object;
                    if (entityLabels[triple.object]) {
                        displayValue = entityLabels[triple.object];
                    }
                    
                    field.values.push({
                        raw: triple.object,
                        display: displayValue,
                        subject: triple.subject
                    });
                });
                
                structured.push(field);
            }
        });
        
        this.data.assertions.forEach(triple => {
            if (!matched.has(triple)) {
                structured.push({
                    label: this.template?.labels[triple.predicate] || this.getSimpleLabel(triple.predicate),
                    values: [{
                        raw: triple.object,
                        display: entityLabels[triple.object] || triple.object
                    }],
                    type: ['literal'],
                    unmatched: true
                });
            }
        });
        
        return structured;
    }

    getSimpleLabel(uri) {
        const parts = uri.split(/[#\/]/);
        const label = parts[parts.length - 1];
        return label.replace(/([A-Z])/g, ' $1').replace(/^has/, 'Has').trim();
    }
}
