/**
 * Tabbed Viewer for Geographical Nanopublications
 * 
 * Provides two views:
 * 1. Details Tab - Structured data view (existing functionality)
 * 2. Map Tab - Interactive map view with WKT geometry
 */

import { MapViewer } from './mapViewer.js';

export class TabbedGeographicalViewer {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.options = {
      showDetailsTab: true,
      showMapTab: true,
      defaultTab: 'details', // or 'map'
      ...options
    };
    
    this.container = null;
    this.mapViewer = null;
    this.currentTab = this.options.defaultTab;
    this.nanopubData = null;
  }
  
  /**
   * Initialize the tabbed interface
   */
  initialize() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`Container ${this.containerId} not found`);
      return;
    }
    
    // Create tab structure
    this.createTabStructure();
    
    // If starting on map tab, initialize the map viewer immediately
    if (this.currentTab === 'map') {
      this.initializeMapViewer();
    }
  }
  
  /**
   * Create the HTML structure for tabs
   */
  createTabStructure() {
    const tabsHTML = `
      <div class="geo-tabbed-viewer">
        <!-- Tab Headers -->
        <div class="geo-tabs-header">
          ${this.options.showDetailsTab ? `
            <button class="geo-tab-button ${this.currentTab === 'details' ? 'active' : ''}" 
                    data-tab="details">
              <span class="tab-icon">📋</span>
              <span class="tab-label">Details</span>
            </button>
          ` : ''}
          
          ${this.options.showMapTab ? `
            <button class="geo-tab-button ${this.currentTab === 'map' ? 'active' : ''}" 
                    data-tab="map">
              <span class="tab-icon">🗺️</span>
              <span class="tab-label">Map View</span>
            </button>
          ` : ''}
        </div>
        
        <!-- Tab Content -->
        <div class="geo-tabs-content">
          <!-- Details Tab -->
          <div class="geo-tab-pane ${this.currentTab === 'details' ? 'active' : ''}" 
               id="${this.containerId}-details">
            <!-- Original nanopub viewer content goes here -->
          </div>
          
          <!-- Map Tab -->
          <div class="geo-tab-pane ${this.currentTab === 'map' ? 'active' : ''}" 
               id="${this.containerId}-map">
            <div class="map-container">
              <div id="${this.containerId}-map-canvas" class="map-canvas"></div>
              <div class="map-info-panel">
                <div class="map-legend">
                  <h4>Legend</h4>
                  <div class="legend-item">
                    <span class="legend-symbol point"></span>
                    <span>Point Location</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-symbol line"></span>
                    <span>Line/Route</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-symbol polygon"></span>
                    <span>Area/Region</span>
                  </div>
                </div>
                <div class="map-details" id="${this.containerId}-map-details">
                  <!-- Location details will be populated here -->
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.container.innerHTML = tabsHTML;
    
    // Attach tab click handlers
    this.attachTabHandlers();
  }
  
  /**
   * Attach click handlers to tab buttons
   */
  attachTabHandlers() {
    const tabButtons = this.container.querySelectorAll('.geo-tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const targetTab = e.currentTarget.dataset.tab;
        this.switchTab(targetTab);
      });
    });
  }
  
  /**
   * Switch between tabs
   * @param {string} tabName - 'details' or 'map'
   */
  switchTab(tabName) {
    if (this.currentTab === tabName) return;
    
    // Update button states
    const buttons = this.container.querySelectorAll('.geo-tab-button');
    buttons.forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Update tab panes
    const panes = this.container.querySelectorAll('.geo-tab-pane');
    panes.forEach(pane => {
      if (pane.id === `${this.containerId}-${tabName}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });
    
    this.currentTab = tabName;
    
    // Initialize map when switching to map tab for the first time
    if (tabName === 'map' && !this.mapViewer) {
      this.initializeMapViewer();
    }
  }
  
  /**
   * Initialize the map viewer
   */
  initializeMapViewer() {
    const mapCanvasId = `${this.containerId}-map-canvas`;
    this.mapViewer = new MapViewer(mapCanvasId, {
      defaultZoom: 6,
      defaultCenter: [48.8566, 2.3522]
    });
    
    this.mapViewer.initializeMap();
    
    // Load geometry if nanopub data is available
    if (this.nanopubData) {
      this.loadGeometryOnMap(this.nanopubData);
    }
  }
  
  /**
   * Load nanopub data and extract/display geometry
   * @param {object} data - Parsed nanopub data
   */
  loadNanopubData(data) {
    this.nanopubData = data;
    
    // If map tab is active and map is initialized, load geometry
    if (this.currentTab === 'map' && this.mapViewer) {
      this.loadGeometryOnMap(data);
    }
  }
  
  /**
   * Extract WKT and display on map
   * @param {object} data - Nanopub data
   */
  loadGeometryOnMap(data) {
    if (!this.mapViewer) return;
    
    // Extract WKT from nanopub
    // First check structuredData (where the parser puts it)
    let wkt = null;
    
    if (data.structuredData && Array.isArray(data.structuredData)) {
      for (const field of data.structuredData) {
        if (field.label && field.label.toLowerCase().includes('wkt')) {
          wkt = field.values && field.values[0] ? field.values[0].raw : null;
          break;
        }
      }
    }
    
    // Fallback to MapViewer.extractWKT for assertions
    if (!wkt) {
      wkt = MapViewer.extractWKT(data);
    }
    
    if (wkt) {
      // Clear existing geometries
      this.mapViewer.clearGeometries();
      
      // Add WKT to map
      const layer = this.mapViewer.addWKTGeometry(wkt, {
        color: '#059669',
        fillColor: '#d1fae5',
        fillOpacity: 0.4,
        weight: 3
      });
      
      // Extract location info for popup and details panel
      const locationInfo = this.extractLocationInfo(data);
      
      if (layer && locationInfo) {
        // Add popup to geometry
        this.mapViewer.addPopup(layer, this.createPopupContent(locationInfo));
        
        // Update details panel
        this.updateMapDetailsPanel(locationInfo, wkt);
      }
    } else {
      // Show message if no geometry found
      this.showNoGeometryMessage();
    }
  }
  
  /**
   * Extract location information from nanopub
   * @param {object} data - Nanopub data
   * @returns {object} Location info
   */
  extractLocationInfo(data) {
    const info = {
      name: null,
      identifier: null,
      paper: null,
      paperTitle: null
    };
    
    if (!data.assertions) return info;
    
    // Extract location name and identifier
    for (const assertion of data.assertions) {
      // Location name
      if (assertion.predicate && 
          (assertion.predicate.includes('label') || 
           assertion.predicate.includes('name'))) {
        info.name = assertion.object;
      }
      
      // Location identifier
      if (assertion.subject && typeof assertion.subject === 'string') {
        info.identifier = assertion.subject.split('/').pop();
      }
      
      // Paper reference
      if (assertion.predicate && assertion.predicate.includes('cites')) {
        info.paper = assertion.object;
      }
      
      // Paper title (if available)
      if (assertion.predicate && assertion.predicate.includes('title')) {
        info.paperTitle = assertion.object;
      }
    }
    
    return info;
  }
  
  /**
   * Create popup HTML content
   * @param {object} locationInfo 
   * @returns {string} HTML content
   */
  createPopupContent(locationInfo) {
    return `
      <div class="geo-popup">
        <h3 class="popup-title">${locationInfo.name || 'Location'}</h3>
        ${locationInfo.identifier ? `
          <p class="popup-id"><strong>ID:</strong> ${locationInfo.identifier}</p>
        ` : ''}
        ${locationInfo.paper ? `
          <p class="popup-paper">
            <strong>Paper:</strong> 
            <a href="${locationInfo.paper}" target="_blank" rel="noopener">
              ${locationInfo.paperTitle || 'View Paper'}
            </a>
          </p>
        ` : ''}
      </div>
    `;
  }
  
  /**
   * Update the map details panel
   * @param {object} locationInfo 
   * @param {string} wkt 
   */
  updateMapDetailsPanel(locationInfo, wkt) {
    const detailsPanel = document.getElementById(`${this.containerId}-map-details`);
    if (!detailsPanel) return;
    
    detailsPanel.innerHTML = `
      <div class="location-details">
        <h4>Location Information</h4>
        <dl>
          ${locationInfo.name ? `
            <dt>Name:</dt>
            <dd>${locationInfo.name}</dd>
          ` : ''}
          
          ${locationInfo.identifier ? `
            <dt>Identifier:</dt>
            <dd><code>${locationInfo.identifier}</code></dd>
          ` : ''}
          
          <dt>Geometry Type:</dt>
          <dd>${this.getGeometryType(wkt)}</dd>
          
          ${locationInfo.paper ? `
            <dt>Related Paper:</dt>
            <dd>
              <a href="${locationInfo.paper}" target="_blank" rel="noopener">
                ${locationInfo.paperTitle || locationInfo.paper}
              </a>
            </dd>
          ` : ''}
        </dl>
        
        <details class="wkt-details">
          <summary>View WKT Coordinates</summary>
          <pre class="wkt-code">${wkt}</pre>
        </details>
      </div>
    `;
  }
  
  /**
   * Get human-readable geometry type
   * @param {string} wkt 
   * @returns {string}
   */
  getGeometryType(wkt) {
    if (/^POINT/i.test(wkt)) return '📍 Point';
    if (/^LINESTRING/i.test(wkt)) return '📏 Line String';
    if (/^POLYGON/i.test(wkt)) return '⬡ Polygon';
    if (/^MULTIPOINT/i.test(wkt)) return '📍 Multiple Points';
    if (/^MULTILINESTRING/i.test(wkt)) return '📏 Multiple Lines';
    if (/^MULTIPOLYGON/i.test(wkt)) return '⬡ Multiple Polygons';
    return 'Unknown';
  }
  
  /**
   * Show message when no geometry is found
   */
  showNoGeometryMessage() {
    const mapCanvas = document.getElementById(`${this.containerId}-map-canvas`);
    if (mapCanvas) {
      const message = document.createElement('div');
      message.className = 'no-geometry-message';
      message.innerHTML = `
        <div class="message-content">
          <span class="message-icon">🗺️</span>
          <h3>No Geometry Data Available</h3>
          <p>This nanopublication doesn't contain WKT geometry data for map visualization.</p>
          <p class="message-hint">Geometry data should be in GeoSPARQL format with <code>asWKT</code> predicate.</p>
        </div>
      `;
      mapCanvas.appendChild(message);
    }
  }
  
  /**
   * Destroy the viewer and clean up resources
   */
  destroy() {
    if (this.mapViewer) {
      this.mapViewer.destroy();
      this.mapViewer = null;
    }
  }
}

export default TabbedGeographicalViewer;
