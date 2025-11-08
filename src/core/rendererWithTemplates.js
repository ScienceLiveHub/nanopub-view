// src/core/rendererWithTemplates.js
// Enhanced renderer that integrates template customization system

import templateDetector from './templateDetector.js';
import templateRegistry from '../templates/registry.js';

/**
 * Detect and apply template customization to nanopub display
 */
export function detectAndApplyTemplate(container, data) {
  // 1. Extract template URI from nanopub data
  const templateUri = templateDetector.extractTemplateUri(data);
  
  if (!templateUri) {
    console.log('No template URI found in nanopub');
    return null;
  }
  
  console.log('Detected template URI:', templateUri);
  
  // 2. Get template customization from registry
  const template = templateRegistry.get(templateUri, data.templateMetadata);
  
  if (!template) {
    console.log('No template customization available');
    return null;
  }
  
  console.log(`Applying template: ${template.name} (${template.type})`);
  
  // 3. Apply visual customizations
  applyVisualCustomizations(container, template);
  
  // 4. Return template for further use
  return template;
}

/**
 * Apply visual customizations from template
 */
function applyVisualCustomizations(container, template) {
  // Add template CSS class
  container.classList.add(template.getClassName());
  
  // Apply color variables
  const colors = template.getColors();
  Object.entries(colors).forEach(([key, value]) => {
    container.style.setProperty(`--template-${key}`, value);
  });
  
  // Inject custom CSS if provided
  const customCSS = template.getCustomCSS();
  if (customCSS) {
    injectTemplateCSS(container, customCSS, template.type);
  }
}

/**
 * Inject template-specific CSS into the document
 */
function injectTemplateCSS(container, css, templateType) {
  const styleId = `template-style-${templateType}`;
  
  // Check if style already exists
  if (document.getElementById(styleId)) {
    return;
  }
  
  // Create style element
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = css;
  
  // Append to document head
  document.head.appendChild(style);
  
  console.log(`✅ Injected CSS for ${templateType} template`);
}

/**
 * Apply semantic grouping to structured data fields
 */
export function applySemanticGrouping(container, data, template) {
  if (!template || !data.structuredData) return;
  
  const groups = template.detectSemanticGroups(data.structuredData);
  
  if (!groups || groups.length === 0) return;
  
  console.log(`Applying ${groups.length} semantic group(s)`);
  
  // Find the assertion section
  const assertionSection = container.querySelector('.section');
  if (!assertionSection) return;
  
  // Process each group
  groups.forEach(group => {
    const groupFields = group.fields;
    if (!groupFields || groupFields.length === 0) return;
    
    // Create group container
    const groupContainer = document.createElement('div');
    groupContainer.className = `field-group ${group.cssClass || ''}`;
    groupContainer.dataset.groupId = group.id;
    
    // Create group header
    const groupHeader = document.createElement('div');
    groupHeader.className = 'field-group-header';
    groupHeader.innerHTML = `
      <h3 class="field-group-title">${group.label}</h3>
      ${group.description ? `<p class="field-group-description">${group.description}</p>` : ''}
    `;
    
    // Find and move fields into group
    groupFields.forEach(field => {
      const fieldElement = findFieldElement(assertionSection, field);
      if (fieldElement) {
        groupContainer.appendChild(fieldElement);
      }
    });
    
    // Make collapsible if requested
    if (group.collapsible) {
      const collapsibleGroup = template.createCollapsibleSection(
        group.label,
        groupContainer.innerHTML,
        false // Start collapsed
      );
      assertionSection.appendChild(collapsibleGroup);
    } else {
      groupContainer.insertBefore(groupHeader, groupContainer.firstChild);
      assertionSection.appendChild(groupContainer);
    }
  });
}

/**
 * Apply field customizations from template
 */
export function applyFieldCustomizations(container, data, template) {
  if (!template || !data.structuredData) return;
  
  console.log('Applying field customizations...');
  
  data.structuredData.forEach(field => {
    const fieldElement = findFieldElement(container, field);
    if (!fieldElement) return;
    
    // 1. Apply highlighting if needed
    if (template.shouldHighlight(field)) {
      fieldElement.classList.add('field-highlighted');
    }
    
    // 2. Add field icon if provided
    const icon = template.getFieldIcon(field);
    if (icon) {
      const labelElement = fieldElement.querySelector('.field-label');
      if (labelElement) {
        labelElement.innerHTML = `${icon} ${labelElement.textContent}`;
      }
    }
    
    // 3. Apply custom field rendering
    const customRendered = template.customizeField(fieldElement, field);
    
    // 4. Add field hint if not custom rendered
    if (!customRendered) {
      const hint = template.getFieldHint(field);
      if (hint) {
        const hintElement = template.createHint(hint);
        fieldElement.appendChild(hintElement);
      }
    }
    
    // 5. Format field value
    const valueElement = fieldElement.querySelector('.field-value');
    if (valueElement && !customRendered) {
      const formattedValue = template.formatFieldValue(field.value || field.object, field);
      if (formattedValue !== (field.value || field.object)) {
        valueElement.innerHTML = formattedValue;
      }
    }
    
    // 6. Update label with template-aware version
    const labelElement = fieldElement.querySelector('.field-label');
    if (labelElement) {
      const betterLabel = template.getFieldLabel(field);
      if (betterLabel && betterLabel !== labelElement.textContent) {
        // Preserve icon if already added
        const hasIcon = labelElement.textContent.match(/^[\u{1F000}-\u{1F9FF}]/u);
        if (hasIcon) {
          labelElement.innerHTML = `${hasIcon[0]} ${betterLabel}`;
        } else {
          labelElement.textContent = betterLabel;
        }
      }
    }
  });
  
  console.log('✅ Field customizations applied');
}

/**
 * Apply title enhancements
 */
export function enhanceTitle(container, data, template) {
  if (!template) return;
  
  const titleElement = container.querySelector('.pub-title');
  if (!titleElement) return;
  
  const enhancedTitle = template.enhanceTitle(data.title, data);
  if (enhancedTitle !== data.title) {
    titleElement.textContent = enhancedTitle;
  }
}

/**
 * Add template badge
 */
export function addTemplateBadge(container, template) {
  if (!template) return;
  
  const headerElement = container.querySelector('.pub-header');
  if (!headerElement) return;
  
  // Check if badge already exists
  if (headerElement.querySelector('.template-badge')) return;
  
  const badgeText = template.getTemplateBadge();
  const badge = template.createBadge(badgeText);
  
  // Insert badge at the beginning of header
  headerElement.insertBefore(badge, headerElement.firstChild);
}

/**
 * Helper: Find field element in container
 */
function findFieldElement(container, field) {
  // Try to find by predicate or placeholder ID
  const fields = container.querySelectorAll('.field');
  
  for (const fieldEl of fields) {
    const label = fieldEl.querySelector('.field-label');
    const value = fieldEl.querySelector('.field-value');
    
    if (!label || !value) continue;
    
    // Match by predicate label
    if (field.predicateLabel && label.textContent.includes(field.predicateLabel)) {
      return fieldEl;
    }
    
    // Match by value
    if (field.value && value.textContent.includes(field.value)) {
      return fieldEl;
    }
    
    // Match by object
    if (field.object && value.textContent.includes(field.object)) {
      return fieldEl;
    }
  }
  
  return null;
}

/**
 * Main integration function to call from renderer
 * Call this after the basic nanopub rendering is complete
 */
export function applyTemplateCustomizations(container, data) {
  console.log('=== Applying Template Customizations ===');
  
  // 1. Detect and apply template
  const template = detectAndApplyTemplate(container, data);
  
  if (!template) {
    console.log('No template customization applied');
    return;
  }
  
  // 2. Add template badge
  addTemplateBadge(container, template);
  
  // 3. Enhance title
  enhanceTitle(container, data, template);
  
  // 4. Apply semantic grouping
  applySemanticGrouping(container, data, template);
  
  // 5. Apply field customizations
  applyFieldCustomizations(container, data, template);
  
  // 6. Add template-specific badges
  template.addBadges(container, data);
  
  console.log('=== Template Customizations Complete ===');
}
