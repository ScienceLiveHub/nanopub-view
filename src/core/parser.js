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
        this.structure.groupedStatements = this.extractGroupedStatements();
        
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
        
        const stmtIds = new Set();
        const allStmtRegex = /(sub:st[\w-]+)/g;
        while ((match = allStmtRegex.exec(this.content)) !== null) {
            if (match[1].startsWith('sub:st')) {
                stmtIds.add(match[1]);
            }
        }
        
        console.log('All statement IDs found:', Array.from(stmtIds));
        
        stmtIds.forEach(stmtId => {
            const lines = this.content.split('\n');
            let inBlock = false;
            let block = '';
            
            for (let line of lines) {
                if (line.includes(stmtId) && (line.includes('rdf:subject') || line.includes('rdf:predicate') || line.includes('rdf:object') || line.includes('a nt:'))) {
                    inBlock = true;
                }
                
                if (inBlock) {
                    block += line + '\n';
                    if (line.trim().endsWith('.') && !line.trim().endsWith('>.')) {
                        break;
                    }
                }
            }
            
            if (!block) return;
            
            const subjectMatch = block.match(/rdf:subject\s+([^\s;.]+)/);
            const predicateMatch = block.match(/rdf:predicate\s+(<[^>]+>|[^\s;.]+)/);
            const objectMatch = block.match(/rdf:object\s+(<[^>]+>|[^\s;.]+)/);
            
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
        console.log('=== EXTRACTING PLACEHOLDER DEFINITIONS ===');
        
        const lines = this.content.split('\n');
        let currentBlock = '';
        let inPlaceholderBlock = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.match(/^sub:\w+\s+a\s+.*(Placeholder|Resource)/)) {
                inPlaceholderBlock = true;
                currentBlock = line + '\n';
            } else if (inPlaceholderBlock) {
                currentBlock += line + '\n';
                
                if (line.endsWith('.')) {
                    this.processPlaceholderBlock(currentBlock);
                    currentBlock = '';
                    inPlaceholderBlock = false;
                }
            }
        }
        
        console.log('Final placeholders:', this.structure.placeholders);
        console.log('==========================================');
    }

    processPlaceholderBlock(block) {
        const idMatch = block.match(/^(sub:\w+)/);
        if (!idMatch) return;
        
        const placeholderId = idMatch[1];
        
        const typesMatch = block.match(/a\s+([^;]+);/);
        const types = typesMatch ? typesMatch[1].split(',').map(t => t.trim()) : [];
        
        const labelMatch = block.match(/rdfs:label\s+"([^"]+)"/);
        const label = labelMatch ? labelMatch[1] : '';
        
        const prefixMatch = block.match(/nt:hasPrefix\s+"([^"]+)"/);
        const prefix = prefixMatch ? prefixMatch[1] : null;
        
        console.log('Found placeholder:', placeholderId, 'raw types:', types, 'label:', label, 'prefix:', prefix);
        
        const placeholderTypes = [];
        let hasPlaceholderType = false;
        let hasResourceType = false;
        
        types.forEach(type => {
            if (type.includes('Placeholder')) {
                placeholderTypes.push(type.split(':').pop());
                hasPlaceholderType = true;
            }
            if (type.includes('Resource')) {
                placeholderTypes.push(type.split(':').pop());
                hasResourceType = true;
            }
        });
        
        if (hasPlaceholderType || hasResourceType) {
            console.log('  Processed types:', placeholderTypes);
            
            this.structure.placeholders[placeholderId] = {
                types: placeholderTypes,
                label: label,
                prefix: prefix
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
        if (!uri) return '';
        uri = uri.trim();
        
        if (uri === 'a') {
            return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
        }
        
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

    extractGroupedStatements() {
        const groups = {};
        
        const lines = this.content.split('\n');
        let currentGroupId = null;
        let inGroupBlock = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.match(/^(sub:st\w+)\s+a.*GroupedStatement/)) {
                const match = line.match(/^(sub:st\w+)/);
                if (match) {
                    currentGroupId = match[1];
                    inGroupBlock = true;
                    groups[currentGroupId] = {
                        statements: [],
                        optional: line.includes('OptionalStatement')
                    };
                }
            }
            
            if (inGroupBlock && line.includes('nt:hasStatement')) {
                const statementsMatch = line.match(/nt:hasStatement\s+([^;.]+)/);
                if (statementsMatch) {
                    const statements = statementsMatch[1].split(',').map(s => s.trim());
                    groups[currentGroupId].statements = statements;
                }
            }
            
            if (inGroupBlock && line.endsWith('.')) {
                inGroupBlock = false;
                currentGroupId = null;
            }
        }
        
        console.log('Extracted grouped statements:', groups);
        return groups;
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
        
        if (localLabels[uri]) {
            return localLabels[uri];
        }
        
        if (this.cache.has(uri)) {
            return this.cache.get(uri);
        }
        
        try {
            const result = await this.fetchRdfsLabel(uri);
            if (result) {
                this.cache.set(uri, result);
                return result;
            }
        } catch (error) {
            // Silently fail
        }
        
        const parsedLabel = this.parseUriLabel(uri);
        this.cache.set(uri, parsedLabel);
        return parsedLabel;
    }

    async fetchRdfsLabel(uri) {
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
            if (uri.includes('wikidata.org/entity/')) {
                return await this.fetchWikidataLabel(uri);
            }
            
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
            return null;
        }
    }

    async fetchWikidataLabel(uri) {
        try {
            const match = uri.match(/\/entity\/([QP]\d+)/);
            if (!match) return null;
            
            const entityId = match[1];
            const apiUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&props=labels|descriptions&languages=en&format=json&origin=*`;
            
            const response = await fetch(apiUrl);
            if (!response.ok) return null;
            
            const data = await response.json();
            
            if (data.entities && data.entities[entityId]) {
                const entity = data.entities[entityId];
                const label = entity.labels?.en?.value;
                const description = entity.descriptions?.en?.value;
                
                if (label) {
                    return {
                        label: label,
                        description: description || null
                    };
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error fetching Wikidata label:', error);
            return null;
        }
    }

    parseTurtleLabel(text, uri) {
        const patterns = [
            new RegExp(`<${uri.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}>\\s+rdfs:label\\s+"([^"]+)"`, 'i'),
            /rdfs:label\s+"([^"]+)"/i,
            /<http:\/\/www\.w3.org\/2000\/01\/rdf-schema#label>\s+"([^"]+)"/i
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

// ============= NANOPUB PARSER =============
export class NanopubParser {
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
        
        if (this.templateContent) {
            const processor = new TemplateProcessor(this.templateContent, this.prefixes);
            this.template = processor.parse();
        }
        
        this.parseAllStatements();
        
        return this.formatForPublication();
    }

    async parseWithLabels() {
        console.log('=== parseWithLabels START ===');
        console.log('Template content exists?', !!this.templateContent);

        this.extractPrefixes();
        console.log('Prefixes extracted');
        
        if (this.templateContent) {
            console.log('About to parse template...');
            const processor = new TemplateProcessor(this.templateContent, this.prefixes);
            this.template = processor.parse();
            console.log('Template parsed. Statements:', this.template ? Object.keys(this.template.statements).length : 'NONE');
            console.log('Template labels:', this.template ? this.template.labels : 'NONE');
        }
        
        console.log('About to parse assertions...');

        this.parseAllStatements();
        console.log('Assertions parsed');
        
        const urisToFetch = new Set();
        this.data.assertions.forEach(triple => {
            if (triple.predicate.startsWith('http')) {
                urisToFetch.add(triple.predicate);
            }
            if (triple.subject.startsWith('http')) {
                urisToFetch.add(triple.subject);
            }
            if (triple.object.startsWith('http')) {
                urisToFetch.add(triple.object);
            }
        });
        
        console.log(`Found ${urisToFetch.size} URIs to fetch labels for:`, Array.from(urisToFetch));
        
        const localLabels = this.template?.labels || {};
        const fetchedLabels = await this.labelFetcher.batchGetLabels(
            Array.from(urisToFetch), 
            localLabels
        );
        
        console.log('Fetched labels:', Object.fromEntries(fetchedLabels));
        
        if (this.template) {
            fetchedLabels.forEach((label, uri) => {
                if (!this.template.labels[uri]) {
                    console.log(`About to add label for ${uri}, type:`, typeof label, 'value:', label);
                    this.template.labels[uri] = label;
                    console.log(`After adding, stored type:`, typeof this.template.labels[uri], 'value:', this.template.labels[uri]);
                }
            });
        }
        
        return this.formatForPublication();
    }

    extractTemplateUri() {
        if (Object.keys(this.prefixes).length === 0) {
            this.extractPrefixes();
        }
        
        const pubinoMatch = this.content.match(/sub:pubinfo\s*\{([^}]+)\}/s);
        if (!pubinoMatch) return null;
        
        const pubinfoContent = pubinoMatch[1];
        
        const patterns = [
            /nt:wasCreatedFromTemplate\s+<([^>]+)>(?!\w)/,
            /nt:wasCreatedFromTemplate\s+([^\s;.,]+)(?=\s*[;.,\s])/
        ];
        
        for (const pattern of patterns) {
            const match = pubinfoContent.match(pattern);
            if (match) {
                let uri = match[1];
                
                uri = uri.replace(/[;.,]+$/, '').trim();
                
                let expandedUri = this.expandUri(uri);
                
                expandedUri = expandedUri.replace('http://purl.org/np/', 'https://w3id.org/np/');
                expandedUri = expandedUri.replace('https://purl.org/np/', 'https://w3id.org/np/');
                
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

    detectUriStyle() {
        // Extract the sub: prefix definition
        const prefixMatch = this.content.match(/@prefix\s+sub:\s+<([^>]+)>\s*\./);
        
        if (!prefixMatch) {
            console.warn('Could not find sub: prefix definition');
            return { style: 'unknown', baseUri: '' };
        }
        
        const baseUri = prefixMatch[1];
        
        // Determine if using slash (/) or hash (#) URIs
        if (baseUri.endsWith('/')) {
            console.log('Detected SLASH URI style:', baseUri);
            return { style: 'slash', baseUri };
        } else if (baseUri.endsWith('#')) {
            console.log('Detected HASH URI style:', baseUri);
            return { style: 'hash', baseUri };
        }
        
        console.warn('Unknown URI style for base:', baseUri);
        return { style: 'unknown', baseUri };
    }

    parseAllStatements() {
        // Detect URI style first
        const { style, baseUri } = this.detectUriStyle();
        
        // Extract assertion block - handle both URI styles
        const assertionMatch = this.extractBlock('assertion', style, baseUri);
        if (assertionMatch) {
            this.data.assertions = this.parseTriples(assertionMatch);
        }

        // Extract provenance block
        const provMatch = this.extractBlock('provenance', style, baseUri);
        if (provMatch) {
            this.data.provenance = this.parseTriples(provMatch);
        }

        // Extract pubinfo block
        const pubinfoMatch = this.extractBlock('pubinfo', style, baseUri);
        if (pubinfoMatch) {
            this.data.pubinfo = this.parseTriples(pubinfoMatch);
        }
    }

    extractBlock(graphName, style, baseUri) {
        // Build the correct pattern based on URI style
        let patterns = [];
        
        if (style === 'slash') {
            // Slash URI: sub:assertion { }
            patterns.push(`sub:${graphName}`);
        } else if (style === 'hash') {
            // Hash URI: <baseURI#/assertion> { } or <baseURI#assertion> { }
            // Try both with and without the slash after #
            patterns.push(`<${baseUri}/${graphName}>`);
            patterns.push(`<${baseUri}${graphName}>`);
        } else {
            // Unknown style - try all possible patterns
            patterns.push(`sub:${graphName}`);
            // Also try to detect hash URIs without knowing the base
            const baseUriMatch = this.content.match(/<([^>]+#)[^>]*>/);
            if (baseUriMatch) {
                const detectedBase = baseUriMatch[1];
                patterns.push(`<${detectedBase}/${graphName}>`);
                patterns.push(`<${detectedBase}${graphName}>`);
            }
        }
        
        // Try each pattern until one works
        for (const pattern of patterns) {
            const result = this.extractBlockWithPattern(pattern);
            if (result) {
                console.log(`Successfully extracted ${graphName} using pattern: ${pattern}`);
                return result;
            }
        }
        
        console.warn(`Could not extract block for: ${graphName}`);
        return null;
    }

    extractBlockWithPattern(blockPattern) {
        // Escape special regex characters in the pattern
        const escapedPattern = blockPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const startPattern = new RegExp(`${escapedPattern}\\s*\\{`, 'g');
        const match = startPattern.exec(this.content);
        
        if (!match) return null;
        
        let startIndex = match.index + match[0].length;
        let braceCount = 1;
        let inQuotes = false;
        let inTripleQuotes = false;
        
        for (let i = startIndex; i < this.content.length; i++) {
            const char = this.content[i];
            const next2 = this.content.substr(i, 3);
            
            // Check for triple quotes
            if (next2 === '"""') {
                inTripleQuotes = !inTripleQuotes;
                i += 2; // Skip next 2 chars
                continue;
            }
            
            // Check for single quotes (only if not in triple quotes)
            if (char === '"' && !inTripleQuotes && (i === 0 || this.content[i-1] !== '\\')) {
                inQuotes = !inQuotes;
                continue;
            }
            
            // Only count braces outside of quotes
            if (!inQuotes && !inTripleQuotes) {
                if (char === '{') {
                    braceCount++;
                } else if (char === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        return this.content.substring(startIndex, i);
                    }
                }
            }
        }
        
        return null;
    }

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

    splitBySemicolon(text) {
        const parts = [];
        let current = '';
        let inTripleQuotes = false;
        let inQuotes = false;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            
            // Check for triple quotes
            if (text.substr(i, 3) === '"""') {
                inTripleQuotes = !inTripleQuotes;
                current += '"""';
                i += 2;
                continue;
            }
            
            // Check for single quotes
            if (char === '"' && !inTripleQuotes && (i === 0 || text[i-1] !== '\\')) {
                inQuotes = !inQuotes;
                current += char;
                continue;
            }
            
            // Semicolon splits only outside quotes
            if (char === ';' && !inQuotes && !inTripleQuotes) {
                if (current.trim()) {
                    parts.push(current.trim());
                }
                current = '';
                continue;
            }
            
            current += char;
        }
        
        if (current.trim()) {
            parts.push(current.trim());
        }
        
        return parts;
    }

    parseFirstTriple(line) {
        const subjectMatch = line.match(/^(\S+)\s+(.+)$/s);
        if (!subjectMatch) return null;
        
        const subject = this.expandUri(subjectMatch[1]);
        const rest = subjectMatch[2];
        
        const predicateMatch = rest.match(/^(\S+)\s+(.+)$/s);
        if (!predicateMatch) return null;
        
        const predicate = this.expandUri(predicateMatch[1]);
        const objectsPart = predicateMatch[2];
        
        const objects = this.splitObjects(objectsPart);
        
        const triples = objects.map(obj => ({
            subject: subject,
            predicate: predicate,
            object: this.cleanObject(obj)
        }));
        
        return { subject, triples };
    }

    parseAdditionalTriple(subject, line) {
        const match = line.match(/^(\S+)\s+(.+)$/s);
        if (!match) return [];
        
        const predicate = this.expandUri(match[1]);
        const objectsPart = match[2];
        
        const objects = this.splitObjects(objectsPart);
        
        return objects.map(obj => ({
            subject: subject,
            predicate: predicate,
            object: this.cleanObject(obj)
        }));
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
            
            // Use the new semicolon-aware split
            const lines = this.splitBySemicolon(trimmed);
            let currentSubject = null;
            
            lines.forEach((line, index) => {
                line = line.trim();
                if (!line) return;
                
                if (index === 0) {
                    const firstTriple = this.parseFirstTriple(line);
                    if (firstTriple) {
                        currentSubject = firstTriple.subject;
                        triples.push(...firstTriple.triples);
                    }
                } else {
                    if (currentSubject) {
                        const additionalTriples = this.parseAdditionalTriple(currentSubject, line);
                        triples.push(...additionalTriples);
                    }
                }
            });
        });
        
        console.log('FINISHED parsing. Created', triples.length, 'triples');
        return triples;
    }

    splitObjects(objectsPart) {
        const objects = [];
        let current = '';
        let inQuotes = false;
        let inTripleQuotes = false;
        let inAngleBrackets = false;
        
        for (let i = 0; i < objectsPart.length; i++) {
            const char = objectsPart[i];
            const next2 = objectsPart.substr(i, 3);
            
            // Check for triple quotes - CRITICAL for multi-line literals
            if (next2 === '"""') {
                inTripleQuotes = !inTripleQuotes;
                current += '"""';
                i += 2; // Skip the next 2 characters since we consumed 3
                continue;
            }
            
            // Check for single quotes (only if not in triple quotes)
            if (char === '"' && !inTripleQuotes && (i === 0 || objectsPart[i-1] !== '\\')) {
                inQuotes = !inQuotes;
                current += char;
                continue;
            }
            
            // Check for angle brackets (URIs)
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
            
            // Comma separates multiple objects, but only outside quotes/brackets
            if (char === ',' && !inQuotes && !inTripleQuotes && !inAngleBrackets) {
                if (current.trim()) {
                    objects.push(current.trim());
                }
                current = '';
                continue;
            }
            
            // Add character to current object
            current += char;
        }
        
        // Don't forget the last object
        if (current.trim()) {
            objects.push(current.trim());
        }
        
        return objects;
    }

    splitStatements(content) {
        const statements = [];
        let current = '';
        let inQuotes = false;
        let inTripleQuotes = false;
        
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            const next2 = content.substr(i, 3);
            
            // Check for triple quotes FIRST (before single quotes)
            if (next2 === '"""') {
                inTripleQuotes = !inTripleQuotes;
                current += '"""';
                i += 2; // Skip the next 2 characters
                continue;
            }
            
            // Check for single quotes only if not in triple quotes
            if (char === '"' && !inTripleQuotes && (i === 0 || content[i-1] !== '\\')) {
                inQuotes = !inQuotes;
            }
            
            current += char;
            
            // Only split on period if we're outside ALL quotes
            if (char === '.' && !inQuotes && !inTripleQuotes && content[i+1]?.match(/\s/)) {
                statements.push(current.slice(0, -1)); // Remove the period
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
        
        // Handle triple-quoted strings (multi-line literals)
        if (obj.startsWith('"""')) {
            // Find the closing triple quotes
            let endIndex = -1;
            for (let i = 3; i < obj.length - 2; i++) {
                if (obj[i] === '"' && obj[i+1] === '"' && obj[i+2] === '"') {
                    // Make sure this isn't an escaped quote
                    let numBackslashes = 0;
                    for (let j = i - 1; j >= 0 && obj[j] === '\\'; j--) {
                        numBackslashes++;
                    }
                    if (numBackslashes % 2 === 0) {
                        endIndex = i;
                        break;
                    }
                }
            }
            
            if (endIndex !== -1) {
                // Extract content between the triple quotes
                let content = obj.slice(3, endIndex);
                return content;
            } else {
                // Fallback: take everything after opening """
                let content = obj.slice(3);
                
                // Remove any trailing characters that might be datatype indicators
                if (content.includes('^^')) {
                    content = content.split('^^')[0];
                }
                
                return content;
            }
        }
        
        // Remove trailing punctuation
        if (obj.endsWith('.') || obj.endsWith(';')) {
            obj = obj.slice(0, -1).trim();
        }
        
        // Handle datatype indicators (e.g., "value"^^xsd:string)
        if (obj.includes('^^')) {
            const parts = obj.split('^^');
            obj = parts[0].trim();
        }
        
        // Handle regular quoted strings
        if (obj.startsWith('"') && obj.length > 1) {
            const lastQuoteIndex = obj.lastIndexOf('"');
            if (lastQuoteIndex > 0) {
                return obj.slice(1, lastQuoteIndex);
            }
            return obj.slice(1);
        }
        
        // Handle URIs
        return this.expandUri(obj);
    }

    expandUri(uri) {
        if (!uri) return uri;
        uri = uri.trim();
        
        if (uri === 'a') {
            return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
        }
        
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

    getPlaceholderPrefix(placeholderId) {
        if (!this.templateContent) return null;
        
        const regex = new RegExp(`${placeholderId}[^.]*nt:hasPrefix\\s+"([^"]+)"`, 's');
        const match = this.templateContent.match(regex);
        
        return match ? match[1] : null;
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

        if (this.template && this.template.labels) {
            console.log('=== COPYING LABELS TO entityLabels ===');
            for (const [uri, labelData] of Object.entries(this.template.labels)) {
                console.log(`Copying ${uri}:`, typeof labelData, labelData);
                result.entityLabels[uri] = labelData;
                console.log(`After copy, entityLabels[${uri}]:`, typeof result.entityLabels[uri], result.entityLabels[uri]);
            }
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
                // Only store if we don't already have an object (from Wikidata API)
                if (!result.entityLabels[triple.subject] || typeof result.entityLabels[triple.subject] !== 'object') {
                    console.log('Found hasLabelFromApi - storing:', triple.subject, triple.object);
                    result.entityLabels[triple.subject] = triple.object;
                } else {
                    console.log('Skipping hasLabelFromApi - already have object for:', triple.subject);
                }
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
            result.structuredData = this.matchTemplateToData(result.entityLabels);
        } else {
            result.unmatchedAssertions = this.data.assertions;
        }

        console.log('=== STRUCTURED DATA ===');
        result.structuredData.forEach((field, index) => {
            console.log(`Field ${index}:`, {
                label: field.label,
                values: field.values,
                isMainEntity: field.isMainEntity
            });
        });
        console.log('=======================');

        return result;
    }

    matchTemplateToData(entityLabels) {
        console.log('=== matchTemplateToData - entityLabels received ===');
        for (const [uri, labelData] of Object.entries(entityLabels)) {
            console.log(`  ${uri}:`, typeof labelData, labelData);
        }
        
        const structured = [];
        const matched = new Set();
        
        console.log('=== ALL ASSERTION TRIPLES ===');
        this.data.assertions.forEach(triple => {
            console.log('  Subject:', triple.subject, 'Predicate:', triple.predicate, 'Object:', triple.object.substring(0, 50));
        });
        console.log('=========================');
        
        const placeholderValues = new Map();
        
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
        
        console.log('=== PLACEHOLDER OCCURRENCES ===');
        console.log('Placeholder occurrences:', placeholderOccurrences);
        console.log('================================');
        
        for (let [placeholder, count] of Object.entries(placeholderOccurrences)) {
            console.log(`Checking placeholder ${placeholder} with count ${count}`);
            if (count > 1) {
                console.log(`  -> ${placeholder} appears ${count} times, setting as main entity`);
                mainEntityPlaceholder = placeholder;
                mainEntityLabel = this.template.placeholders[placeholder]?.label || 'Subject';
                
                // Find the first available statement (some might be missing from extraction)
                let firstStmt = null;
                for (const stmtId of this.template.statementOrder) {
                    if (this.template.statements[stmtId]) {
                        firstStmt = this.template.statements[stmtId];
                        break;
                    }
                }
                
                if (firstStmt && firstStmt.subject === placeholder) {
                    const matchingTriple = this.data.assertions.find(t => 
                        t.predicate === firstStmt.predicate
                    );
                    if (matchingTriple) {
                        mainEntityActualValue = matchingTriple.subject;
                        console.log('Main entity found via simple detection:', mainEntityActualValue);
                    }
                }
                
                if (!mainEntityActualValue) {
                    this.data.assertions.forEach(triple => {
                        if (triple.subject.startsWith('http') || triple.subject.startsWith('sub:')) {
                            const showsAsSubject = this.data.assertions.some(t => 
                                t.subject === triple.subject
                            );
                            
                            const showsAsObject = this.data.assertions.some(t => 
                                t.object === triple.subject
                            );
                            
                            const isLocalResource = triple.subject.startsWith('sub:');
                            
                            if (showsAsSubject && (showsAsObject || isLocalResource) && !mainEntityActualValue) {
                                mainEntityActualValue = triple.subject;
                                console.log('Main entity found via complex detection:', mainEntityActualValue);
                            }
                        }
                    });
                }
                
                break;
            }
        }
        
        if (mainEntityActualValue) {
            const placeholder = this.template.placeholders[mainEntityPlaceholder];
            
            console.log('Main entity placeholder:', mainEntityPlaceholder);
            console.log('Main entity value:', mainEntityActualValue);
            console.log('Placeholder types:', placeholder?.types);
            
            const hasOnlyResourceTypes = placeholder && 
                placeholder.types.every(t => t === 'IntroducedResource' || t === 'LocalResource');
            
            console.log('Has only resource types?', hasOnlyResourceTypes);
            
            if (!hasOnlyResourceTypes) {
                let displayValue = entityLabels[mainEntityActualValue] || mainEntityActualValue;
                let isDecodedUri = false;
                let fieldType = ['ExternalUriPlaceholder'];
                
                // Check for AutoEscapeUriPlaceholder BEFORE the DOI cleaning
                if (placeholder && placeholder.types.includes('AutoEscapeUriPlaceholder')) {
                    const prefix = placeholder.prefix || this.getPlaceholderPrefix(mainEntityPlaceholder);
                    
                    if (prefix && mainEntityActualValue.startsWith(prefix)) {
                        const encodedText = mainEntityActualValue.substring(prefix.length);
                        const decodedText = decodeURIComponent(encodedText.replace(/\+/g, ' '));
                        
                        displayValue = decodedText;
                        isDecodedUri = true;
                        fieldType = ['AutoEscapeUriPlaceholder'];
                        
                        console.log('Decoded AutoEscapeUri:', encodedText, '→', decodedText);
                    }
                }
                // ONLY clean DOI if it's NOT an AutoEscapeUriPlaceholder
                else if (mainEntityActualValue.includes('doi.org/') && typeof displayValue === 'string') {
                    displayValue = displayValue.replace(/\s+/g, '');
                    console.log('Cleaned DOI display value:', displayValue);
                }
                
                const field = {
                    statementId: 'main-entity',
                    label: mainEntityLabel,
                    values: [{
                        raw: mainEntityActualValue,
                        display: displayValue
                    }],
                    type: fieldType,
                    isMainEntity: true,
                    isDecodedUri: isDecodedUri
                };
                
                console.log('Creating main entity field with isMainEntity=true');
                structured.push(field);
                matched.add(mainEntityActualValue);
            } else {
                console.log('Skipping main entity field (only resource types)');
            }
            
            placeholderValues.set(mainEntityPlaceholder, new Set([mainEntityActualValue]));
        }
        
        this.template.statementOrder.forEach(stmtId => {
            const stmt = this.template.statements[stmtId];
            if (!stmt) return;
            
            const isGroupedStatement = this.template.groupedStatements && 
                                        Object.values(this.template.groupedStatements).some(g => 
                                            g.statements.includes(stmtId)
                                        );
            if (isGroupedStatement) {
                console.log('Skipping grouped statement:', stmtId, '(will be processed with parent)');
                return;
            }
            
            console.log('Processing statement:', stmtId, 'predicate:', stmt.predicate, 'repeatable:', stmt.repeatable);
            
            const matchingTriples = [];
            
            console.log('  Looking for triples with predicate:', stmt.predicate);
            console.log('  Statement subject:', stmt.subject);
            console.log('  Statement object placeholder:', stmt.object);
            
            const predicateIsPlaceholder = stmt.predicate.startsWith('sub:');
            let expectedPredicates = null;
            
            if (predicateIsPlaceholder) {
                expectedPredicates = placeholderValues.get(stmt.predicate);
                console.log('  Predicate is a placeholder:', stmt.predicate);
                console.log('  Expected predicates:', expectedPredicates ? Array.from(expectedPredicates) : 'any (first occurrence)');
            }
            
            let expectedSubjects = null;
            if (stmt.subject.startsWith('sub:') && stmt.subject !== 'CREATOR') {
                expectedSubjects = placeholderValues.get(stmt.subject);
                console.log('  Expected subjects for', stmt.subject, ':', expectedSubjects ? Array.from(expectedSubjects) : 'not yet determined');
            }
            
            this.data.assertions.forEach(triple => {
                if (predicateIsPlaceholder) {
                    if (expectedPredicates && expectedPredicates.size > 0) {
                        if (!expectedPredicates.has(triple.predicate)) {
                            return;
                        }
                    }
                } else {
                    if (triple.predicate !== stmt.predicate) return;
                }
                
                console.log('    Found triple with matching predicate. Subject:', triple.subject, 'Object:', triple.object);
                
                if (triple.object === mainEntityActualValue) {
                    console.log('    Skipped: object is mainEntity');
                    matched.add(triple); 
                    return;
                }
                
                if (stmt.object && !stmt.object.startsWith('sub:')) {
                    const expectedObject = this.expandUri(stmt.object);
                    if (triple.object !== expectedObject) {
                        console.log('    Skipped: object', triple.object, 'does not match expected literal', expectedObject);
                        return;
                    }
                    console.log('    Matched: object matches literal');
                }
                
                if (stmt.object && stmt.object.startsWith('sub:')) {
                    const placeholder = this.template.placeholders[stmt.object];
                    console.log('    Checking placeholder', stmt.object, 'types:', placeholder?.types);

                    if (placeholder && placeholder.types.includes('RestrictedChoicePlaceholder')) {
                        const possibleValues = this.getPossibleValuesForPlaceholder(stmt.object);
                        console.log('    Placeholder', stmt.object, 'has possible values:', possibleValues);
                        if (possibleValues.length > 0 && !possibleValues.includes(triple.object)) {
                            console.log('    Skipped: object', triple.object, 'not in possible values');
                            return;
                        }
                    }
                    
                    const groupedConstraints = this.findGroupedConstraintsForPlaceholder(stmt.object);
                    if (groupedConstraints.length > 0) {
                        console.log('    Placeholder', stmt.object, 'has grouped constraints:', groupedConstraints);
                        
                        const satisfiesConstraints = this.checkGroupedConstraints(triple.object, groupedConstraints);
                        if (!satisfiesConstraints) {
                            console.log('    Skipped: object', triple.object, 'does not satisfy grouped constraints');
                            return;
                        }
                        console.log('    Matched: object satisfies grouped constraints');
                    }
                }
                
                if (stmt.subject === 'CREATOR') {
                    if (triple.subject.includes('orcid.org')) {
                        console.log('    Matched: CREATOR subject');
                        matchingTriples.push(triple);
                        matched.add(triple);
                    }
                } else if (stmt.subject.startsWith('sub:')) {
                    if (expectedSubjects && expectedSubjects.size > 0) {
                        if (expectedSubjects.has(triple.subject)) {
                            console.log('    Matched: subject matches expected placeholder value');
                            matchingTriples.push(triple);
                            matched.add(triple);
                        } else {
                            console.log('    Skipped: subject', triple.subject, 'not in expected values', Array.from(expectedSubjects));
                        }
                    } else {
                        console.log('    Matched: first occurrence of placeholder subject');
                        matchingTriples.push(triple);
                        matched.add(triple);
                    }
                } else if (triple.subject.includes(stmt.subject.replace('sub:', ''))) {
                    console.log('    Matched: subject contains statement subject');
                    matchingTriples.push(triple);
                    matched.add(triple);
                }
            });
            
            if (matchingTriples.length > 0) {
                console.log('Found', matchingTriples.length, 'matching triples for statement', stmtId);
                
                if (stmt.predicate && stmt.predicate.startsWith('sub:')) {
                    if (!placeholderValues.has(stmt.predicate)) {
                        placeholderValues.set(stmt.predicate, new Set());
                    }
                    matchingTriples.forEach(triple => {
                        placeholderValues.get(stmt.predicate).add(triple.predicate);
                    });
                }
                
                if (stmt.object && stmt.object.startsWith('sub:')) {
                    if (!placeholderValues.has(stmt.object)) {
                        placeholderValues.set(stmt.object, new Set());
                    }
                    matchingTriples.forEach(triple => {
                        placeholderValues.get(stmt.object).add(triple.object);
                    });
                }
                
                if (stmt.subject && stmt.subject.startsWith('sub:') && stmt.subject !== 'CREATOR') {
                    if (!placeholderValues.has(stmt.subject)) {
                        placeholderValues.set(stmt.subject, new Set());
                    }
                    matchingTriples.forEach(triple => {
                        placeholderValues.get(stmt.subject).add(triple.subject);
                    });
                }
                
                const subjectPlaceholder = this.template.placeholders[stmt.subject];
                const objectPlaceholder = this.template.placeholders[stmt.object];
                const predicatePlaceholder = this.template.placeholders[stmt.predicate];
                
                const actualPredicate = stmt.predicate.startsWith('sub:') ? 
                    (matchingTriples[0]?.predicate || stmt.predicate) : stmt.predicate;
                
                console.log('Creating fields for statement', stmtId);
                console.log('  Subject placeholder?', stmt.subject, subjectPlaceholder ? 'YES' : 'NO');
                console.log('  Main entity?', stmt.subject === mainEntityPlaceholder);
                
                if (stmt.subject && stmt.subject.startsWith('sub:') && stmt.subject !== 'CREATOR' && 
                    stmt.subject !== mainEntityPlaceholder && subjectPlaceholder) {
                    
                    console.log('  Should create subject field');
                    
                    const existingSubjectField = structured.find(f => 
                        f.placeholderId === stmt.subject && f.isSubjectField
                    );
                    
                    console.log('  Existing subject field?', existingSubjectField ? 'YES' : 'NO');
                    
                    if (!existingSubjectField) {
                        const subjectField = {
                            statementId: stmtId + '-subject',
                            placeholderId: stmt.subject,
                            label: subjectPlaceholder.label || 'Subject',
                            values: [],
                            type: subjectPlaceholder.types,
                            isSubjectField: true
                        };
                        
                        const uniqueSubjects = new Set();
                        matchingTriples.forEach(triple => {
                            uniqueSubjects.add(triple.subject);
                        });
                        
                        console.log('  Unique subjects found:', Array.from(uniqueSubjects));
                        
                        uniqueSubjects.forEach(subjectUri => {
                            const labelData = entityLabels[subjectUri];
                            console.log('  Looking up label for subject:', subjectUri);
                            console.log('    Label data type:', typeof labelData);
                            console.log('    Label data value:', labelData);
                            
                            let displayValue = labelData || subjectUri;
                            
                            subjectField.values.push({
                                raw: subjectUri,
                                display: displayValue
                            });
                        });
                        
                        console.log('  Adding subject field with', subjectField.values.length, 'values');
                        structured.push(subjectField);
                    }
                }
                
                const alreadyProcessed = structured.some(f => f.statementId === stmtId);
                
                if (alreadyProcessed) {
                    console.log('  Already processed statement', stmtId, '- skipping duplicate');
                    return;
                }
                
                const existingField = structured.find(f => f.predicateUri === actualPredicate);
                
                if (existingField && stmt.repeatable) {
                    matchingTriples.forEach(triple => {
                        const labelData = entityLabels[triple.object];
                        console.log('Looking up label for object:', triple.object);
                        console.log('  Label data type:', typeof labelData);
                        console.log('  Label data value:', labelData);
                        
                        let displayValue = labelData || triple.object;
                        
                        existingField.values.push({
                            raw: triple.object,
                            display: displayValue,
                            subject: triple.subject
                        });
                    });
                } else {
                    let fieldLabel;

                    if (this.template.labels[actualPredicate]) {
                        // Keep the whole object (with label and description if present)
                        fieldLabel = this.template.labels[actualPredicate];
                    }
                    else if (objectPlaceholder && objectPlaceholder.label) {
                        fieldLabel = objectPlaceholder.label;
                    }
                    else if (predicatePlaceholder && predicatePlaceholder.label) {
                        fieldLabel = predicatePlaceholder.label;
                    }
                    else {
                        fieldLabel = this.getSimpleLabel(actualPredicate);
                    }
                    
                    const field = {
                        statementId: stmtId,
                        label: fieldLabel,
                        predicateUri: actualPredicate,
                        values: [],
                        type: objectPlaceholder ? objectPlaceholder.types : ['literal'],
                        repeatable: stmt.repeatable,
                        optional: stmt.optional
                    };
                    
                    matchingTriples.forEach(triple => {
                        const labelData = entityLabels[triple.object];
                        console.log('Looking up label for object:', triple.object);
                        console.log('  Label data type:', typeof labelData);
                        console.log('  Label data value:', labelData);
                        
                        let displayValue = labelData || triple.object;
                        
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
        
        const filteredStructured = structured.filter(field => {
            const allValuesAreLocalResources = field.values.every(v => 
                typeof v.raw === 'string' && v.raw.startsWith('sub:')
            );
            
            if (allValuesAreLocalResources) {
                console.log('Filtering out field with only LocalResource values:', field.label);
                return false;
            }
            
            return true;
        });
        
        return filteredStructured;
    }

    getSimpleLabel(uri) {
        const parts = uri.split(/[#\/]/);
        const label = parts[parts.length - 1];
        return label.replace(/([A-Z])/g, ' $1').replace(/^has/, 'Has').trim();
    }

    getPossibleValuesForPlaceholder(placeholderId) {
        const values = [];
        const placeholder = this.template.placeholders[placeholderId];
        if (!placeholder) return values;
        
        const startIndex = this.templateContent.indexOf(placeholderId);
        if (startIndex === -1) return values;
        
        let endIndex = startIndex;
        let inAngleBrackets = false;
        let inQuotes = false;
        for (let i = startIndex; i < this.templateContent.length; i++) {
            const char = this.templateContent[i];
            if (char === '"' && this.templateContent[i-1] !== '\\') inQuotes = !inQuotes;
            if (char === '<' && !inQuotes) inAngleBrackets = true;
            if (char === '>' && !inQuotes) inAngleBrackets = false;
            if (char === '.' && !inAngleBrackets && !inQuotes && this.templateContent[i+1]?.match(/\s/)) {
                endIndex = i;
                break;
            }
        }
        
        const block = this.templateContent.substring(startIndex, endIndex + 1);
        
        if (!block.includes('nt:possibleValue')) return values;
        
        const uriMatches = block.match(/<https:\/\/[^>]+>|<http:\/\/[^>]+>/g);
        
        if (uriMatches) {
            const possibleValueIndex = block.indexOf('nt:possibleValue');
            const afterPossibleValue = block.substring(possibleValueIndex);
            const relevantUris = afterPossibleValue.match(/<https:\/\/[^>]+>|<http:\/\/[^>]+>/g);
            
            if (relevantUris) {
                relevantUris.forEach(uri => {
                    const cleanUri = uri.slice(1, -1);
                    values.push(cleanUri);
                });
            }
        }
        
        return values;
    }

    findGroupedConstraintsForPlaceholder(placeholderId) {
        const constraints = [];
        
        if (!this.template.groupedStatements) return constraints;
        
        for (let groupId in this.template.groupedStatements) {
            const group = this.template.groupedStatements[groupId];
            
            const relatedStatements = group.statements.filter(stmtId => {
                const stmt = this.template.statements[stmtId];
                return stmt && stmt.subject === placeholderId;
            });
            
            if (relatedStatements.length > 0) {
                constraints.push({
                    groupId: groupId,
                    statements: relatedStatements
                });
            }
        }
        
        return constraints;
    }

    checkGroupedConstraints(uri, groupedConstraints) {
        for (let constraint of groupedConstraints) {
            const satisfiesGroup = constraint.statements.every(stmtId => {
                const stmt = this.template.statements[stmtId];
                if (!stmt) return false;
                
                const matchingTriple = this.data.assertions.find(triple => {
                    if (triple.subject !== uri) return false;
                    if (triple.predicate !== stmt.predicate) return false;
                    
                    if (stmt.object && !stmt.object.startsWith('sub:')) {
                        const expectedObject = this.expandUri(stmt.object);
                        return triple.object === expectedObject;
                    }
                    
                    return true;
                });
                
                return matchingTriple !== undefined;
            });
            
            if (!satisfiesGroup) return false;
        }
        
        return true;
    }

    identifyMainEntity() {
        if (!this.template || !this.template.statements) {
            return null;
        }

        console.log('=== IDENTIFYING MAIN ENTITY ===');
        
        for (const [placeholderId, placeholder] of Object.entries(this.template.placeholders)) {
            if (placeholder.types && (
                placeholder.types.includes('IntroducedResource') || 
                placeholder.types.includes('EmbeddedResource')
            )) {
                console.log(`Found main entity via IntroducedResource/EmbeddedResource: ${placeholderId}`);
                return placeholderId;
            }
        }
        
        const subjectCounts = {};
        for (const stmt of Object.values(this.template.statements)) {
            const subject = stmt.subject;
            if (subject && subject.startsWith('sub:')) {
                subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
            }
        }
        
        console.log('Subject frequency counts:', subjectCounts);
        
        let maxCount = 0;
        let mostFrequentSubject = null;
        for (const [subject, count] of Object.entries(subjectCounts)) {
            if (count > maxCount) {
                maxCount = count;
                mostFrequentSubject = subject;
            }
        }
        
        if (mostFrequentSubject && maxCount > 1) {
            console.log(`Found main entity via frequency: ${mostFrequentSubject} (appears ${maxCount} times)`);
            return mostFrequentSubject;
        }
        
        for (const [placeholderId, placeholder] of Object.entries(this.template.placeholders)) {
            if (placeholder.types && placeholder.types.includes('ExternalUriPlaceholder')) {
                console.log(`Falling back to first ExternalUriPlaceholder: ${placeholderId}`);
                return placeholderId;
            }
        }
        
        console.log('No main entity found');
        return null;
    }
}
