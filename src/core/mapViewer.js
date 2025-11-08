/**
 * Map Viewer Component for Geographical Nanopublications
 * 
 * Displays WKT geometries from GeoSPARQL nanopubs on an interactive Leaflet map
 * Supports: POINT, LINESTRING, POLYGON, MULTIPOINT, MULTILINESTRING, MULTIPOLYGON
 */

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export class MapViewer {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.options = {
      defaultZoom: 5,
      defaultCenter: [48.8566, 2.3522], // Paris as default
      tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
      ...options
    };
    
    this.map = null;
    this.geometryLayer = null;
  }
  
  /**
   * Initialize the Leaflet map
   */
  initializeMap() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Container ${this.containerId} not found`);
      return;
    }
    
    // Create map
    this.map = L.map(this.containerId).setView(
      this.options.defaultCenter, 
      this.options.defaultZoom
    );
    
    // Add tile layer (OpenStreetMap)
    L.tileLayer(this.options.tileLayer, {
      attribution: this.options.attribution,
      maxZoom: 19
    }).addTo(this.map);
    
    // Create layer group for geometries
    this.geometryLayer = L.layerGroup().addTo(this.map);
    
    return this.map;
  }
  
  /**
   * Parse WKT string and add to map
   * @param {string} wktString - Well-Known Text geometry string
   * @param {object} options - Styling options for the geometry
   */
  addWKTGeometry(wktString, options = {}) {
    if (!this.map) {
      this.initializeMap();
    }
    
    try {
      const geometry = this.parseWKT(wktString);
      if (!geometry) {
        console.error('Failed to parse WKT:', wktString);
        return null;
      }
      
      const layer = this.createLeafletLayer(geometry, options);
      if (layer) {
        this.geometryLayer.addLayer(layer);
        
        // Fit map bounds to show the geometry
        if (layer.getBounds) {
          this.map.fitBounds(layer.getBounds(), { padding: [50, 50] });
        } else if (layer.getLatLng) {
          this.map.setView(layer.getLatLng(), 10);
        }
        
        return layer;
      }
    } catch (error) {
      console.error('Error adding WKT geometry:', error);
      return null;
    }
  }
  
  /**
   * Parse WKT string into coordinates
   * @param {string} wkt - WKT string
   * @returns {object} Parsed geometry object
   */
  parseWKT(wkt) {
    wkt = wkt.trim();
    
    // Extract geometry type and coordinates
    const pointMatch = wkt.match(/POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*\)/i);
    if (pointMatch) {
      return {
        type: 'Point',
        coordinates: [parseFloat(pointMatch[1]), parseFloat(pointMatch[2])]
      };
    }
    
    const linestringMatch = wkt.match(/LINESTRING\s*\(\s*([^)]+)\s*\)/i);
    if (linestringMatch) {
      return {
        type: 'LineString',
        coordinates: this.parseCoordinateString(linestringMatch[1])
      };
    }
    
    const polygonMatch = wkt.match(/POLYGON\s*\(\s*\(([^)]+)\)\s*\)/i);
    if (polygonMatch) {
      return {
        type: 'Polygon',
        coordinates: [this.parseCoordinateString(polygonMatch[1])]
      };
    }
    
    const multipointMatch = wkt.match(/MULTIPOINT\s*\(\s*([^)]+)\s*\)/i);
    if (multipointMatch) {
      const coords = multipointMatch[1].split(',').map(pair => {
        const [lon, lat] = pair.trim().replace(/[()]/g, '').split(/\s+/);
        return [parseFloat(lon), parseFloat(lat)];
      });
      return {
        type: 'MultiPoint',
        coordinates: coords
      };
    }
    
    // Add support for MULTILINESTRING and MULTIPOLYGON if needed
    
    console.warn('Unsupported WKT type:', wkt.substring(0, 50));
    return null;
  }
  
  /**
   * Parse coordinate string like "2.3 48.9, 2.4 49.0, 2.5 49.1"
   * @param {string} coordString 
   * @returns {Array} Array of [lon, lat] pairs
   */
  parseCoordinateString(coordString) {
    return coordString
      .split(',')
      .map(pair => {
        const [lon, lat] = pair.trim().split(/\s+/);
        return [parseFloat(lon), parseFloat(lat)];
      })
      .filter(pair => !isNaN(pair[0]) && !isNaN(pair[1]));
  }
  
  /**
   * Create Leaflet layer from parsed geometry
   * @param {object} geometry - Parsed geometry object
   * @param {object} options - Styling options
   * @returns {L.Layer} Leaflet layer
   */
  createLeafletLayer(geometry, options = {}) {
    const defaultStyle = {
      color: '#059669',
      fillColor: '#d1fae5',
      fillOpacity: 0.4,
      weight: 3,
      opacity: 0.8
    };
    
    const style = { ...defaultStyle, ...options };
    
    switch (geometry.type) {
      case 'Point': {
        const [lon, lat] = geometry.coordinates;
        return L.marker([lat, lon], {
          icon: L.divIcon({
            className: 'geo-marker',
            html: '<div style="background: #059669; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        });
      }
      
      case 'LineString': {
        const latLngs = geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        return L.polyline(latLngs, style);
      }
      
      case 'Polygon': {
        const latLngs = geometry.coordinates[0].map(([lon, lat]) => [lat, lon]);
        return L.polygon(latLngs, style);
      }
      
      case 'MultiPoint': {
        const markers = geometry.coordinates.map(([lon, lat]) => 
          L.marker([lat, lon], {
            icon: L.divIcon({
              className: 'geo-marker',
              html: '<div style="background: #059669; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            })
          })
        );
        return L.layerGroup(markers);
      }
      
      default:
        console.warn('Unsupported geometry type:', geometry.type);
        return null;
    }
  }
  
  /**
   * Add popup with information to a layer
   * @param {L.Layer} layer 
   * @param {string} content - HTML content for popup
   */
  addPopup(layer, content) {
    if (layer && layer.bindPopup) {
      layer.bindPopup(content);
    }
  }
  
  /**
   * Clear all geometries from map
   */
  clearGeometries() {
    if (this.geometryLayer) {
      this.geometryLayer.clearLayers();
    }
  }
  
  /**
   * Destroy the map instance
   */
  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
  
  /**
   * Static helper to extract WKT from nanopub data
   * @param {object} nanopubData - Parsed nanopub data
   * @returns {string|null} WKT string if found
   */
  static extractWKT(nanopubData) {
    // Look for WKT in various possible locations
    if (nanopubData.assertions) {
      for (const assertion of nanopubData.assertions) {
        // Check for asWKT predicate (GeoSPARQL standard)
        if (assertion.predicate && 
            (assertion.predicate.includes('asWKT') || 
             assertion.predicate.includes('wktLiteral'))) {
          return assertion.object;
        }
        
        // Check literal values that look like WKT
        if (typeof assertion.object === 'string' && 
            /^(POINT|LINESTRING|POLYGON|MULTIPOINT)/i.test(assertion.object)) {
          return assertion.object;
        }
      }
    }
    
    return null;
  }
}

export default MapViewer;
