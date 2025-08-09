// @ts-nocheck
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          poster?: string;
          loading?: 'auto' | 'lazy' | 'eager';
          reveal?: 'auto' | 'manual';
          ar?: boolean;
          'ar-modes'?: string;
          'camera-controls'?: boolean;
          'environment-image'?: string;
          'shadow-intensity'?: string | number;
          'shadow-softness'?: string | number;
          'exposure'?: string | number;
          'auto-rotate'?: boolean;
          'rotation-per-second'?: string;
          'field-of-view'?: string;
          'max-camera-orbit'?: string;
          'min-camera-orbit'?: string;
          'camera-orbit'?: string;
          'camera-target'?: string;
          'animation-name'?: string;
          'animation-crossfade-duration'?: string;
          'auto-rotate-delay'?: number;
          'interpolation-decay'?: number;
          'interaction-prompt'?: 'auto' | 'none';
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}

interface ModelViewerProps {
  src: string;
  alt?: string;
  poster?: string;
  loading?: 'auto' | 'lazy' | 'eager';
  reveal?: 'auto' | 'manual';
  ar?: boolean;
  arModes?: string;
  cameraControls?: boolean;
  environmentImage?: string;
  shadowIntensity?: number;
  shadowSoftness?: number;
  exposure?: number;
  autoRotate?: boolean;
  rotationPerSecond?: string;
  fieldOfView?: string;
  maxCameraOrbit?: string;
  minCameraOrbit?: string;
  cameraOrbit?: string;
  cameraTarget?: string;
  animationName?: string;
  animationCrossfadeDuration?: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: (error: ErrorEvent) => void;
  autoRotateDelay?: number;
  interpolationDecay?: number;
  interactionPrompt?: 'auto' | 'none';
}

const ModelViewer: React.FC<ModelViewerProps> = ({
  src,
  alt = 'A 3D model',
  poster,
  loading = 'auto',
  reveal = 'auto',
  ar = false,
  arModes = 'webxr scene-viewer quick-look',
  cameraControls = true,
  environmentImage = 'neutral',
  shadowIntensity = 1,
  shadowSoftness = 1,
  exposure = 1,
  autoRotate = false,
  rotationPerSecond = '30deg',
  fieldOfView = 'auto',
  maxCameraOrbit = 'auto',
  minCameraOrbit = 'auto',
  cameraOrbit = 'auto',
  cameraTarget = 'auto',
  animationName,
  animationCrossfadeDuration = '0.5s',
  className = '',
  style = {},
  onLoad,
  onError,
  autoRotateDelay,
  interpolationDecay,
  interactionPrompt = 'auto',
}) => {
  const modelViewerRef = useRef<HTMLElement>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    if (!isScriptLoaded || !modelViewerRef.current) return;

    if (onLoad) {
      modelViewerRef.current.addEventListener('load', onLoad);
    }

    if (onError) {
      modelViewerRef.current.addEventListener('error', onError as EventListener);
    }

    return () => {
      if (!modelViewerRef.current) return;
      
      if (onLoad) {
        modelViewerRef.current.removeEventListener('load', onLoad);
      }
      if (onError) {
        modelViewerRef.current.removeEventListener('error', onError as EventListener);
      }
    };
  }, [onLoad, onError, isScriptLoaded]);

  return (
    <>
      <Script
        type="module"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"
        onLoad={() => setIsScriptLoaded(true)}
      />
      <model-viewer
        ref={modelViewerRef}
        src={src}
        alt={alt}
        poster={poster}
        loading={loading}
        reveal={reveal}
        ar={ar}
        ar-modes={arModes}
        camera-controls={cameraControls}
        environment-image={environmentImage}
        shadow-intensity={shadowIntensity}
        shadow-softness={shadowSoftness}
        exposure={exposure}
        auto-rotate={autoRotate}
        rotation-per-second={rotationPerSecond}
        field-of-view={fieldOfView}
        max-camera-orbit={maxCameraOrbit}
        min-camera-orbit={minCameraOrbit}
        camera-orbit={cameraOrbit}
        camera-target={cameraTarget}
        animation-name={animationName}
        animation-crossfade-duration={animationCrossfadeDuration}
        class={className}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'transparent',
          ...style,
        }}
        auto-rotate-delay={autoRotateDelay}
        interpolation-decay={interpolationDecay}
        interaction-prompt={interactionPrompt}
      />
    </>
  );
};

export default ModelViewer; 