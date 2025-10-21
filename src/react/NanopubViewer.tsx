// src/react/NanopubViewer.tsx
import { useEffect, useRef } from 'react';
import { NanopubViewer as CoreViewer } from '../index.js';

export interface NanopubViewerProps {
  /** Nanopublication URI to fetch and display */
  uri?: string;
  
  /** Nanopublication content (TriG format) to display directly */
  content?: string;
  
  /** Viewer options */
  options?: {
    apiEndpoint?: string;
    theme?: string;
    showMetadata?: boolean;
    fetchTimeout?: number;
  };
  
  /** Callback when nanopub is successfully loaded */
  onLoad?: (data: any) => void;
  
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  
  /** Additional CSS class names */
  className?: string;
  
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * React component wrapper for the NanopubViewer library
 * 
 * @example
 * ```tsx
 * // Display from URI
 * <NanopubViewer uri="https://w3id.org/np/RA..." />
 * 
 * // Display from content
 * <NanopubViewer content={trigContent} />
 * 
 * // With callbacks
 * <NanopubViewer 
 *   uri="https://w3id.org/np/RA..."
 *   onLoad={(data) => console.log('Loaded:', data)}
 *   onError={(err) => console.error('Error:', err)}
 * />
 * ```
 */
export function NanopubViewer({
  uri,
  content,
  options,
  onLoad,
  onError,
  className = '',
  style = {}
}: NanopubViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CoreViewer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create viewer instance
    if (!viewerRef.current) {
      viewerRef.current = new CoreViewer(options);
    }

    // Render nanopub
    async function render() {
      try {
        let data;
        
        if (uri) {
          data = await viewerRef.current!.renderFromUri(containerRef.current!, uri);
        } else if (content) {
          data = await viewerRef.current!.render(containerRef.current!, content);
        } else {
          throw new Error('Either uri or content prop is required');
        }
        
        if (onLoad) {
          onLoad(data);
        }
      } catch (error) {
        console.error('Error rendering nanopub:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    }

    render();
  }, [uri, content, options, onLoad, onError]);

  return (
    <div 
      ref={containerRef} 
      className={className}
      style={style}
    />
  );
}
