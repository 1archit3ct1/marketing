'use client';

import React from 'react';
import { createPortal } from 'react-dom';

export interface PortalProps {
  children: React.ReactNode;
  containerId?: string;
}

export const Portal: React.FC<PortalProps> = ({
  children,
  containerId = 'portal-root',
}) => {
  const [mounted, setMounted] = React.useState(false);
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  
  React.useEffect(() => {
    setMounted(true);
    
    let element = document.getElementById(containerId);
    if (!element) {
      element = document.createElement('div');
      element.id = containerId;
      document.body.appendChild(element);
    }
    
    setContainer(element);
    
    return () => {
      // Optionally clean up the container if it was created by us
      // For now, we leave it in case other portals need it
    };
  }, [containerId]);
  
  if (!mounted || !container) {
    return null;
  }
  
  return createPortal(children, container);
};
