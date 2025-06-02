// Self-invoking function to prevent polluting the global namespace
(function () {
  // Function to get the center of an element
  function getCenter(el) {
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY + rect.height / 2,
      left: rect.left + window.scrollX + rect.width / 2
    };
  }

  // Function to check if an element or its ancestors are hidden
  function isVisible(el) {
    let current = el;
    while (current) {
      const style = getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }
      current = current.parentElement;
    }
    return true;
  }

  // Function to update SVG position based on its associated element
  function updateSVGPosition(svgData) {
    const { svg, element } = svgData;
    if (!isVisible(element)) {
      svg.style.display = 'none';
      return;
    }
    
    svg.style.display = 'block';
    const center = getCenter(element);
    svg.style.top = `${center.top - 12}px`;
    svg.style.left = `${center.left - 12}px`;
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  
  // Get all interactive elements that are visible
  const elements = [...document.querySelectorAll('a, label, button, input:not([type=hidden]), select, textarea, [tabindex], [role=button], [role=checkbox], [role=link], [role=menuitem], [role=option], [role=radio], [role=switch], [role=tab]')].filter(isVisible);
  
  const centers = [];
  const svgElements = []; // Store references to SVG elements and their associated DOM elements

  // Iterate through all interactive elements to find their centers and create SVG circles around them
  elements.forEach(el => {
    if(!el.matches('label') && el.closest('label')) { return; }

    const center = getCenter(el);
    centers.push({ element: el, center: center });

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.style.position = 'absolute';
    svg.style.top = `${center.top - 12}px`;
    svg.style.left = `${center.left - 12}px`;
    svg.style.width = '24px';
    svg.style.height = '24px';
    svg.style.zIndex = '9999';
    svg.style.margin = '0';
    svg.style.pointerEvents = 'none';
    svg.setAttribute('aria-hidden', 'true');

    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '12');

    // Create unique clip path ID to avoid conflicts
    const clipId = `clip-${Math.random().toString(36).substr(2, 9)}`;
    const clip = document.createElementNS(SVG_NS, 'clipPath');
    clip.setAttribute('id', clipId);
    clip.appendChild(circle.cloneNode());
    svg.appendChild(clip);
    circle.setAttribute('clip-path', `url(#${clipId})`);

    if (el.getBoundingClientRect().width < 24 || el.getBoundingClientRect().height < 24) {
      circle.setAttribute('fill', 'rgba(0, 0, 255, 0.3)');
    } else {
      circle.setAttribute('fill', 'rgba(0, 200, 0, 0.3)');
      circle.setAttribute('stroke', 'rgba(0, 200, 0, 0.8)');
      circle.setAttribute('stroke-width', '4');
    }

    svg.appendChild(circle);
    document.body.appendChild(svg);
    
    // Store reference for later updates
    svgElements.push({ svg: svg, element: el });
  });

  // Function to update all SVG positions
  function updateAllSVGPositions() {
    svgElements.forEach(updateSVGPosition);
  }

  // Add event listeners for scroll and resize
  let updateTimeout;
  function scheduleUpdate() {
    if (updateTimeout) {
      clearTimeout(updateTimeout);
    }
    updateTimeout = setTimeout(updateAllSVGPositions, 10);
  }

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);

  // Also listen for orientation change on mobile devices
  window.addEventListener('orientationchange', () => {
    setTimeout(updateAllSVGPositions, 100);
  });

  const overlaps = [];

  // Check for overlapping elements
  centers.forEach((item1, index) => {
    centers.slice(index + 1).forEach(item2 => {
      if (Math.sqrt(Math.pow(item2.center.left - item1.center.left, 2) + Math.pow(item2.center.top - item1.center.top, 2)) < 24) {
        overlaps.push(item1.element);
        overlaps.push(item2.element);
      }
    });
  });

  // Remove duplicates and set aria-description to 'overlap'
  const uniqueOverlaps = [...new Set(overlaps)];
  uniqueOverlaps.forEach(el => el.setAttribute('aria-description', 'overlap'));

  // Alert the user about the number of overlapping elements
  alert(`There are ${uniqueOverlaps.length} overlapping controls.`);

  // Cleanup function
  function cleanup() {
    // Remove event listeners
    window.removeEventListener('scroll', scheduleUpdate);
    window.removeEventListener('resize', scheduleUpdate);
    window.removeEventListener('orientationchange', updateAllSVGPositions);
    
    // Remove all SVG circles
    svgElements.forEach(({ svg }) => {
      if (svg.parentNode) {
        svg.parentNode.removeChild(svg);
      }
    });
    
    // Remove aria-description attributes that were added
    uniqueOverlaps.forEach(el => {
      if (el.getAttribute('aria-description') === 'overlap') {
        el.removeAttribute('aria-description');
      }
    });
    
    // Clear timeout
    if (updateTimeout) {
      clearTimeout(updateTimeout);
    }
    
    // Remove the keydown event listener
    document.removeEventListener('keydown', handleKeydown);
  }

  // Keydown event handler
  function handleKeydown(event) {
    if (event.key === 'q' || event.key === 'Q') {
      cleanup();
    }
  }

  // Add keydown event listener for cleanup
  document.addEventListener('keydown', handleKeydown);

  // Store cleanup function globally for potential programmatic cleanup
  window.wcagTargetSizeCleanup = cleanup;
})();