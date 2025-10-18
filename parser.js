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
    // First, find all statement IDs that are repeatable/optional
    const repeatableStatements = new Set();
    const optionalStatements = new Set();
    const groupedStatements = new Set();
    
    const typeRegex = /(sub:st[\w-]+)\s+a\s+([^;.]+)/g;
    let match;
    while ((match = typeRegex.exec(this.content)) !== null) {
        const stmtId = match[1];
        const types = match[2];
        if (types.includes('nt:RepeatableStatement')) {
            repeatableStatements.add(stmtId);
        }
        if (types.includes('nt:OptionalStatement')) {
            optionalStatements.add(stmtId);
        }
        if (types.includes('nt:GroupedStatement')) {
            groupedStatements.add(stmtId);
        }
    }
    
    console.log('Found repeatable statements:', Array.from(repeatableStatements));
    
    // Find all statement IDs
    const stmtIds = new Set();
    const allStmtRegex = /(sub:st[\w-]+)/g;
    while ((match = allStmtRegex.exec(this.content)) !== null) {
        if (match[1].startsWith('sub:st')) {
            stmtIds.add(match[1]);
        }
    }
    
    console.log('All statement IDs found:', Array.from(stmtIds));
    
    // For each statement ID, extract its components
    stmtIds.forEach(stmtId => {
        // Look for: stmtId ... (stuff) ... until we see a line ending with period that's not inside <>
        const lines = this.content.split('\n');
        let inBlock = false;
        let block = '';
        
        for (let line of lines) {
            if (line.includes(stmtId) && (line.includes('rdf:subject') || line.includes('rdf:predicate') || line.includes('rdf:object') || line.includes('a nt:'))) {
                inBlock = true;
            }
            
            if (inBlock) {
                block += line + '\n';
                // Check if line ends with period (and we're not inside angle brackets)
                if (line.trim().endsWith('.') && !line.trim().endsWith('>.')) {
                    break;
                }
            }
        }
        
        if (!block) return;
        
        // Extract subject, predicate, object from this block
        const subjectMatch = block.match(/rdf:subject\s+([^\s;.]+)/);
        const predicateMatch = block.match(/rdf:predicate\s+(<[^>]+>|[^\s;.]+)/);
        const objectMatch = block.match(/rdf:object\s+([^\s;.]+)/);
        
        if (subjectMatch && predicateMatch && objectMatch) {
            const subject = this.expandUri(subjectMatch[1].trim());
            const predicate = this.expandUri(predicateMatch[1].trim());
            const object = objectMatch[1].trim();
            
            this.structure.statements[stmtId] = {
                id: stmtId,
                subject: subject,
                predicate: predicate,
                object: object,
                optional: optionalStatements.has(stmtId),
                repeatable: repeatableStatements.has(stmtId),
                grouped: groupedStatements.has(stmtId)
            };
            
            console.log('Extracted statement:', stmtId, {
                predicate: predicate,
                repeatable: repeatableStatements.has(stmtId)
            });
        }
    });
    
    console.log('Extracted', Object.keys(this.structure.statements).length, 'statements from template');
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

// ============= LABEL FETCHER =============
class LabelFetcher {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
    }

    async getLabel(uri, localLabels = {}) {
        if (!uri) return '';
        
        // Strategy 1: Check local labels (from nanopub/template)
        if (localLabels[uri]) {
            return localLabels[uri];
        }
        
        // Strategy 2: Check cache
        if (this.cache.has(uri)) {
            return this.cache.get(uri);
        }
        
        // Strategy 3: Try to fetch from web (with deduplication)
        try {
            const label = await this.fetchRdfsLabel(uri);
            if (label) {
                this.cache.set(uri, label);
                return label;
            }
        } catch (error) {
            // Silently fail - we'll use the fallback
        }
        
        // Strategy 4: Fallback to parsing URI
        const parsedLabel = this.parseUriLabel(uri);
        this.cache.set(uri, parsedLabel);
        return parsedLabel;
    }

    async fetchRdfsLabel(uri) {
        // Avoid fetching if already in progress
        if (this.pendingRequests.has(uri)) {
            return this.pendingRequests.get(uri);
        }
        
        const promise = this._doFetch(uri);
        this.pendingRequests.set(uri, promise);
        
        try {
            const result = await promise;
            return result;
        } finally {
            this.pendingRequests.delete(uri);
        }
    }

    async _doFetch(uri) {
        try {
            const response = await fetch(uri, {
                headers: {
                    'Accept': 'text/turtle, application/rdf+xml, application/ld+json, text/plain'
                },
                mode: 'cors'
            });
            
            if (!response.ok) {
                return null;
            }
            
            const contentType = response.headers.get('content-type') || '';
            const text = await response.text();
            
            // Parse based on content type
            if (contentType.includes('turtle') || contentType.includes('ttl')) {
                return this.parseTurtleLabel(text, uri);
            } else if (contentType.includes('rdf+xml')) {
                return this.parseRdfXmlLabel(text, uri);
            } else if (contentType.includes('json')) {
                return this.parseJsonLdLabel(text, uri);
            } else {
                return this.parseTurtleLabel(text, uri);
            }
        } catch (error) {
            // Silently return null for CORS and network errors
            return null;
        }
    }

    parseTurtleLabel(text, uri) {
        const patterns = [
            new RegExp(`<${uri.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}>\\s+rdfs:label\\s+"([^"]+)"`, 'i'),
            /rdfs:label\s+"([^"]+)"/i,
            /<http:\/\/www\.w3\.org\/2000\/01\/rdf-schema#label>\s+"([^"]+)"/i
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }

    parseRdfXmlLabel(text, uri) {
        const labelMatch = text.match(/<rdfs:label[^>]*>([^<]+)<\/rdfs:label>/i);
        if (labelMatch && labelMatch[1]) {
            return labelMatch[1];
        }
        return null;
    }

    parseJsonLdLabel(text, uri) {
        try {
            const data = JSON.parse(text);
            
            if (data['rdfs:label']) {
                return data['rdfs:label'];
            }
            if (data['http://www.w3.org/2000/01/rdf-schema#label']) {
                const label = data['http://www.w3.org/2000/01/rdf-schema#label'];
                return typeof label === 'object' ? label['@value'] : label;
            }
            if (data['@graph']) {
                for (const node of data['@graph']) {
                    if (node['@id'] === uri && node['rdfs:label']) {
                        return node['rdfs:label'];
                    }
                }
            }
        } catch (e) {
            // Silently fail
        }
        return null;
    }

    parseUriLabel(uri) {
        const parts = uri.split(/[#\/]/);
        let label = parts[parts.length - 1];
        
        if (!label && parts.length > 1) {
            label = parts[parts.length - 2];
        }
        
        label = label
            .replace(/([A-Z])/g, ' $1')
            .replace(/^has/, 'Has')
            .replace(/[_-]/g, ' ')
            .trim()
            .replace(/\s+/g, ' ');
        
        label = label.charAt(0).toUpperCase() + label.slice(1);
        
        return label;
    }

    async batchGetLabels(uris, localLabels = {}) {
        const results = new Map();
        const promises = uris.map(async uri => {
            const label = await this.getLabel(uri, localLabels);
            results.set(uri, label);
        });
        
        await Promise.all(promises);
        return results;
    }

    clearCache() {
        this.cache.clear();
        this.pendingRequests.clear();
    }
}

// ============= NANOPUB PARSER (ENHANCED) =============
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
        this.labelFetcher = new LabelFetcher();
    }

    parse() {
        this.extractPrefixes();
        
        // Parse template FIRST if available
        if (this.templateContent) {
            const processor = new TemplateProcessor(this.templateContent, this.prefixes);
            this.template = processor.parse();
        }
        
        // Then parse all statements (now we can check against the template)
        this.parseAllStatements();
        
        return this.formatForPublication();
    }

    // Async version that fetches labels

async parseWithLabels() {
    console.log('=== parseWithLabels START ===');
    console.log('Template content exists?', !!this.templateContent);

    this.extractPrefixes();
    console.log('Prefixes extracted');
    
    // Parse template FIRST if available
    if (this.templateContent) {
        console.log('About to parse template...');
        const processor = new TemplateProcessor(this.templateContent, this.prefixes);
        this.template = processor.parse();
        console.log('Template parsed. Statements:', this.template ? Object.keys(this.template.statements).length : 'NONE');
    }
    
    console.log('About to parse assertions...');

    // Then parse all statements (now we can check against the template)
    this.parseAllStatements();
    console.log('Assertions parsed');
    
    // Collect all predicates that need labels
    const urisToFetch = new Set();
    this.data.assertions.forEach(triple => {
        if (triple.predicate.startsWith('http')) {
            urisToFetch.add(triple.predicate);
        }
    });
    
    console.log(`Found ${urisToFetch.size} predicate URIs to fetch labels for:`, Array.from(urisToFetch));
    
    // Fetch labels for all URIs
    const localLabels = this.template?.labels || {};
    const fetchedLabels = await this.labelFetcher.batchGetLabels(
        Array.from(urisToFetch), 
        localLabels
    );
    
    console.log('Fetched labels:', Object.fromEntries(fetchedLabels));
    
    // Merge fetched labels into template labels
    if (this.template) {
        fetchedLabels.forEach((label, uri) => {
            if (!this.template.labels[uri]) {
                this.template.labels[uri] = label;
                console.log(`Added fetched label for ${uri}: ${label}`);
            }
        });
    }
    
    // ADD THIS LINE - it was missing!
    return this.formatForPublication();
}

    extractTemplateUri() {
        // Make sure prefixes are extracted first
        if (Object.keys(this.prefixes).length === 0) {
            this.extractPrefixes();
        }
        
        // Look in pubinfo section for wasCreatedFromTemplate
        const pubinoMatch = this.content.match(/sub:pubinfo\s*\{([^}]+)\}/s);
        if (!pubinoMatch) return null;
        
        const pubinfoContent = pubinoMatch[1];
        
        // Match the MAIN template specifically (not Provenance or Pubinfo templates)
        const patterns = [
            /nt:wasCreatedFromTemplate\s+<([^>]+)>(?!\w)/,  // Full URI in angle brackets
            /nt:wasCreatedFromTemplate\s+([^\s;.,]+)(?=\s*[;.,\s])/  // Prefixed URI
        ];
        
        for (const pattern of patterns) {
            const match = pubinfoContent.match(pattern);
            if (match) {
                let uri = match[1];
                
                // Remove trailing punctuation if present
                uri = uri.replace(/[;.,]+$/, '').trim();
                
                // Expand if it's a prefixed URI
                let expandedUri = this.expandUri(uri);
                
                // IMPORTANT: Transform purl.org URLs to w3id.org for proper resolution
                expandedUri = expandedUri.replace('http://purl.org/np/', 'https://w3id.org/np/');
                expandedUri = expandedUri.replace('https://purl.org/np/', 'https://w3id.org/np/');
                
                // Add .trig extension for fetching
                if (!expandedUri.match(/\.(trig|ttl|nq|jsonld)$/)) {
                    expandedUri += '.trig';
                }
                
                console.log('Template URI found:', uri, '→ expanded to:', expandedUri);
                
                return expandedUri;
            }
        }
        
        return null;
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
// Check if a predicate is repeatable in the template
isRepeatablePredicate(predicate) {
    console.log('Checking repeatable for:', predicate);
    
    if (!this.template || !this.template.statements) {
        console.log('No template');
        return false;
    }
    
    for (let stmtId in this.template.statements) {
        const stmt = this.template.statements[stmtId];
        if (stmt.predicate === predicate) {
            console.log('Found', stmtId, 'repeatable:', stmt.repeatable);
            return stmt.repeatable === true;
        }
    }
    
    return false;
}

parseTriples(content) {
    console.log('PARSING TRIPLES - template exists:', !!this.template);
    if (this.template && this.template.statements) {
        console.log('Template has', Object.keys(this.template.statements).length, 'statements');
    }
    
    const triples = [];
    const statements = this.splitStatements(content);
    console.log('Processing', statements.length, 'statements from nanopub');
    
    statements.forEach(statement => {
        const trimmed = statement.trim();
        if (!trimmed) return;
        
        const lines = trimmed.split(/;\s*\n\s*/);
        let currentSubject = null;
        
        lines.forEach((line, index) => {
            line = line.trim();
            if (!line) return;
            
            if (index === 0) {
                // First line: subject predicate object(s)
                const match = line.match(/^(\S+)\s+(\S+)\s+(.+)$/s);
                if (match) {
                    currentSubject = this.expandUri(match[1]);
                    const predicate = this.expandUri(match[2]);
                    const objectsPart = match[3];
                    
                    // Check if this predicate is repeatable in the template
                    const isRepeatable = this.isRepeatablePredicate(predicate);
                    
                    if (isRepeatable) {
                        // Handle comma-separated objects
                        const objects = this.splitObjects(objectsPart);
                        console.log('Splitting', objects.length, 'objects for repeatable predicate:', predicate);
                        objects.forEach(obj => {
                            triples.push({
                                subject: currentSubject,
                                predicate: predicate,
                                object: this.cleanObject(obj)
                            });
                        });
                    } else {
                        // Single object
                        triples.push({
                            subject: currentSubject,
                            predicate: predicate,
                            object: this.cleanObject(objectsPart)
                        });
                    }
                }
            } else {
                // Continuation line: predicate object(s)
                const match = line.match(/^(\S+)\s+(.+)$/s);
                if (match && currentSubject) {
                    const predicate = this.expandUri(match[1]);
                    const objectsPart = match[2];
                    
                    // Check if this predicate is repeatable in the template
                    const isRepeatable = this.isRepeatablePredicate(predicate);
                    
                    if (isRepeatable) {
                        // Handle comma-separated objects
                        const objects = this.splitObjects(objectsPart);
                        console.log('Splitting', objects.length, 'objects for repeatable predicate:', predicate);
                        objects.forEach(obj => {
                            triples.push({
                                subject: currentSubject,
                                predicate: predicate,
                                object: this.cleanObject(obj)
                            });
                        });
                    } else {
                        // Single object
                        triples.push({
                            subject: currentSubject,
                            predicate: predicate,
                            object: this.cleanObject(objectsPart)
                        });
                    }
                }
            }
        });
    });
    
    console.log('FINISHED parsing. Created', triples.length, 'triples');
    return triples;
}

    // Split comma-separated objects while respecting quotes and angle brackets
    splitObjects(objectsPart) {
        const objects = [];
        let current = '';
        let inQuotes = false;
        let inTripleQuotes = false;
        let inAngleBrackets = false;
        
        for (let i = 0; i < objectsPart.length; i++) {
            const char = objectsPart[i];
            const next2 = objectsPart.substr(i, 3);
            
            // Handle triple quotes
            if (next2 === '"""') {
                inTripleQuotes = !inTripleQuotes;
                current += '"""';
                i += 2;
                continue;
            }
            
            // Handle regular quotes (only if not in triple quotes)
            if (char === '"' && !inTripleQuotes && objectsPart[i-1] !== '\\') {
                inQuotes = !inQuotes;
                current += char;
                continue;
            }
            
            // Handle angle brackets
            if (char === '<' && !inQuotes && !inTripleQuotes) {
                inAngleBrackets = true;
                current += char;
                continue;
            }
            if (char === '>' && !inQuotes && !inTripleQuotes) {
                inAngleBrackets = false;
                current += char;
                continue;
            }
            
            // Split on comma only if not inside quotes or angle brackets
            if (char === ',' && !inQuotes && !inTripleQuotes && !inAngleBrackets) {
                if (current.trim()) {
                    objects.push(current.trim());
                }
                current = '';
                continue;
            }
            
            current += char;
        }
        
        // Add the last object
        if (current.trim()) {
            objects.push(current.trim());
        }
        
        return objects;
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
        
        // Remove trailing semicolon or period
        if (obj.endsWith('.') || obj.endsWith(';')) {
            obj = obj.slice(0, -1).trim();
        }
        
        // Handle datatype annotations
        if (obj.includes('^^')) {
            const parts = obj.split('^^');
            obj = parts[0];
        }
        
        // Handle triple-quoted strings
        if (obj.startsWith('"""') && obj.includes('"""', 3)) {
            return obj.slice(3, obj.lastIndexOf('"""'));
        }
        
        // Handle regular quoted strings
        if (obj.startsWith('"') && obj.includes('"', 1)) {
            return obj.slice(1, obj.lastIndexOf('"'));
        }
        
        // Expand URIs
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
            
            // Handle CREATOR subject specially
            if (stmt.subject === 'CREATOR') {
                // Check if the triple's subject is a creator (ORCID)
                if (triple.subject.includes('orcid.org')) {
                    matchingTriples.push(triple);
                    matched.add(triple);
                }
            } else if (stmt.subject.startsWith('sub:')) {
                // Placeholder subject - match any
                matchingTriples.push(triple);
                matched.add(triple);
            } else if (triple.subject.includes(stmt.subject.replace('sub:', ''))) {
                matchingTriples.push(triple);
                matched.add(triple);
            }
        });
        
        if (matchingTriples.length > 0) {
            const placeholder = this.template.placeholders[stmt.object];
            
            // Check if we already have a field for this predicate
            const existingField = structured.find(f => f.predicateUri === stmt.predicate);
            
            if (existingField && stmt.repeatable) {
                // Merge into existing field
                matchingTriples.forEach(triple => {
                    let displayValue = triple.object;
                    if (entityLabels[triple.object]) {
                        displayValue = entityLabels[triple.object];
                    }
                    
                    existingField.values.push({
                        raw: triple.object,
                        display: displayValue,
                        subject: triple.subject
                    });
                });
            } else {
                // Create new field only if we have matching triples
                const field = {
                    statementId: stmtId,
                    label: placeholder ? placeholder.label : 
                           this.template.labels[stmt.predicate] || 
                           this.getSimpleLabel(stmt.predicate),
                    predicateUri: stmt.predicate,
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
        }
    });
    
    this.data.assertions.forEach(triple => {
        if (!matched.has(triple)) {
            structured.push({
                label: this.template?.labels[triple.predicate] || this.getSimpleLabel(triple.predicate),
                predicateUri: triple.predicate,
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
