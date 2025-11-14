// Simple global apiFetch function for REST API calls
window.apiFetch = async function(url, options = {}) {
    // Default to GET if not specified
    const opts = Object.assign({ method: 'GET', headers: {} }, options);
    // If sending JSON, set header
    if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(opts.body);
    }
    // Use relative URL for same-origin requests
    const response = await fetch(url, opts);
    if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    // Try to parse JSON, fallback to text
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return await response.json();
    } else {
        return await response.text();
    }
};
