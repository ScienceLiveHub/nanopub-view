// src/core/fetcher.js - Fetch nanopublications from URLs

/**
 * Fetch nanopublication content from a URI
 * @param {string} uri - Nanopublication URI
 * @param {Object} options - Fetch options
 * @returns {Promise<string>} - Nanopub content in TriG format
 */
export async function fetchNanopub(uri, options = {}) {
  const {
    apiEndpoint = 'https://np.petapico.org/',
    fetchTimeout = 30000
  } = options;

  if (!uri || typeof uri !== 'string') {
    throw new Error('Valid URI required');
  }

  // Extract nanopub ID from URI
  const npId = uri.split('/').pop();
  
  // Try different fetch strategies
  const strategies = [
    // Strategy 1: Direct fetch with .trig extension
    () => fetchWithTimeout(`${uri}.trig`, fetchTimeout),
    
    // Strategy 2: Via petapico API
    () => fetchWithTimeout(`${apiEndpoint}${npId}.trig`, fetchTimeout),
    
    // Strategy 3: Direct URI (might return HTML)
    () => fetchWithTimeout(uri, fetchTimeout)
  ];

  let lastError;
  
  for (const strategy of strategies) {
    try {
      const response = await strategy();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const content = await response.text();
      
      // Basic validation: check if it looks like RDF
      if (content.includes('@prefix') || content.includes('np:') || content.includes('<http')) {
        return content;
      }
      
      throw new Error('Response does not appear to be valid RDF content');
      
    } catch (error) {
      lastError = error;
      console.warn('Fetch strategy failed:', error.message);
      continue;
    }
  }
  
  throw new Error(`Failed to fetch nanopublication: ${lastError.message}`);
}

/**
 * Fetch with timeout
 * @param {string} url - URL to fetch
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
function fetchWithTimeout(url, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);

    fetch(url)
      .then(response => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
