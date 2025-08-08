/**
 * Video Animation Utilities
 * Provides FFmpeg filter generation for various animation effects
 */

export type AnimationType = 
  | 'none' 
  | 'ken-burns-zoom-in' 
  | 'ken-burns-pan-diagonal' 
  | 'ken-burns-pan-left' 
  | 'ken-burns-pan-right' 
  | 'slow-zoom' 
  | 'gentle-pan';

export type AnimationIntensity = 'subtle' | 'moderate' | 'strong';

export interface AnimationSettings {
  type: AnimationType;
  intensity: AnimationIntensity;
}

/**
 * Get intensity multiplier based on intensity level
 */
function getIntensityMultiplier(intensity: AnimationIntensity): number {
  switch (intensity) {
    case 'subtle': return 0.6;
    case 'moderate': return 1.0;
    case 'strong': return 1.4;
    default: return 1.0;
  }
}

/**
 * Easing functions for smooth animation curves
 */
const EasingFunctions = {
  // Smooth ease-in-out curve (cubic bezier approximation)
  easeInOut: (t: number): number => {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  },
  
  // Gentle ease-in-out with sine wave
  easeInOutSine: (t: number): number => {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  },
  
  // Smooth start, linear middle, smooth end
  easeInOutQuad: (t: number): number => {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  },
  
  // Very gentle easing for subtle animations
  easeInOutGentle: (t: number): number => {
    const smoothed = Math.sin(t * Math.PI - Math.PI / 2) * 0.5 + 0.5;
    return smoothed;
  }
};

/**
 * Get appropriate easing function based on intensity
 */
function getEasingFunction(intensity: AnimationIntensity): (t: number) => number {
  switch (intensity) {
    case 'subtle': return EasingFunctions.easeInOutGentle;
    case 'moderate': return EasingFunctions.easeInOutSine;
    case 'strong': return EasingFunctions.easeInOut;
    default: return EasingFunctions.easeInOutSine;
  }
}

/**
 * Generate animation filter for Ken Burns zoom in effect using scale filter
 * Uses enhanced easing curves for ultra-smooth motion
 */
function generateKenBurnsZoomInFilter(
  duration: number, 
  width: number, 
  height: number, 
  intensity: AnimationIntensity
): string {
  const multiplier = getIntensityMultiplier(intensity);
  
  // Enhanced zoom range for more noticeable effect
  const startScale = 1.0;
  const endScale = 1.0 + (0.18 * multiplier); // 1.108 to 1.252 depending on intensity
  
  // Generate smooth easing curve for zoom effect
  const easingExpression = intensity === 'subtle' 
    ? `sin(t/${duration}*PI-PI/2)*0.5+0.5` // Very gentle sine wave
    : intensity === 'moderate'
    ? `-(cos(PI*t/${duration})-1)/2` // Smooth ease-in-out sine
    : `if(lt(t/${duration},0.5),2*pow(t/${duration},2),1-pow(-2*t/${duration}+2,2)/2)`; // Cubic ease-in-out
  
  // Create smooth zoom using scale filter with eased time-based interpolation
  const scaleExpression = `${startScale}+(${endScale}-${startScale})*(${easingExpression})`;
  
  return `scale=w='iw*(${scaleExpression})':h='ih*(${scaleExpression})':eval=frame,crop=${width}:${height}`;
}

/**
 * Generate animation filter for Ken Burns diagonal pan effect
 * Uses enhanced easing curves for ultra-smooth motion
 */
function generateKenBurnsPanDiagonalFilter(
  duration: number, 
  width: number, 
  height: number, 
  intensity: AnimationIntensity,
  fps: number = 30
): string {
  const multiplier = getIntensityMultiplier(intensity);
  const easingFunction = getEasingFunction(intensity);
  
  // Increased zoom for more travel distance and smoother motion
  const zoom = 1 + (0.15 * multiplier); // ~1.09–1.21 depending on intensity
  const scaledW = Math.round(width * zoom);
  const scaledH = Math.round(height * zoom);
  
  // Calculate available travel distance
  const travelX = scaledW - width;
  const travelY = scaledH - height;
  
  // Generate smooth easing curve using time-based interpolation
  // Create a curved diagonal path instead of straight line
  const easingExpression = intensity === 'subtle' 
    ? `sin(t/${duration}*PI-PI/2)*0.5+0.5` // Very gentle sine wave
    : intensity === 'moderate'
    ? `-(cos(PI*t/${duration})-1)/2` // Smooth ease-in-out sine
    : `if(lt(t/${duration},0.5),2*pow(t/${duration},2),1-pow(-2*t/${duration}+2,2)/2)`; // Cubic ease-in-out
  
  // Multi-stage pipeline with enhanced smoothness:
  // 1. Lock frame rate for consistent timing
  // 2. Scale with bicubic interpolation for quality
  // 3. Apply smooth curved motion with time-based easing
  return [
    `fps=${fps}`,
    `scale=w=iw*${zoom}:h=ih*${zoom}:flags=bicubic:eval=frame`,
    `crop=w=${width}:h=${height}:x='${travelX}*(${easingExpression})':y='${travelY}*(${easingExpression})':exact=1`
  ].join(',');
}

/**
 * Generate animation filter for Ken Burns pan left effect
 * Uses enhanced easing curves for ultra-smooth motion
 */
function generateKenBurnsPanLeftFilter(
  duration: number, 
  width: number, 
  height: number, 
  intensity: AnimationIntensity,
  fps: number = 30
): string {
  const multiplier = getIntensityMultiplier(intensity);
  
  // Increased zoom for more travel distance and smoother motion
  const zoom = 1 + (0.15 * multiplier); // ~1.09–1.21 depending on intensity
  const scaledW = Math.round(width * zoom);
  
  // Available travel distance (horizontal only)
  const travelX = scaledW - width;
  
  // Generate smooth easing curve for right-to-left motion
  const easingExpression = intensity === 'subtle' 
    ? `${travelX}*(1-(sin(t/${duration}*PI-PI/2)*0.5+0.5))` // Very gentle sine wave (inverted)
    : intensity === 'moderate'
    ? `${travelX}*(1-(-(cos(PI*t/${duration})-1)/2))` // Smooth ease-in-out sine (inverted)
    : `${travelX}*(1-if(lt(t/${duration},0.5),2*pow(t/${duration},2),1-pow(-2*t/${duration}+2,2)/2))`; // Cubic ease-in-out (inverted)
  
  // Add slight vertical drift for more natural movement
  const verticalDrift = intensity !== 'subtle' ? `sin(t/${duration}*PI*2)*${Math.round(height * 0.01)}` : '0';
  
  // Multi-stage pipeline with enhanced smoothness:
  // 1. Lock frame rate for consistent timing
  // 2. Scale with bicubic interpolation for quality
  // 3. Apply smooth eased motion with time-based interpolation
  return [
    `fps=${fps}`,
    `scale=w=iw*${zoom}:h=ih*${zoom}:flags=bicubic:eval=frame`,
    `crop=w=${width}:h=${height}:x='${easingExpression}':y='${verticalDrift}':exact=1`
  ].join(',');
}

/**
 * Generate animation filter for Ken Burns pan right effect
 * Uses enhanced easing curves for ultra-smooth motion
 */
function generateKenBurnsPanRightFilter(
  duration: number, 
  width: number, 
  height: number, 
  intensity: AnimationIntensity,
  fps: number = 30
): string {
  const multiplier = getIntensityMultiplier(intensity);
  
  // Increased zoom for more travel distance and smoother motion
  const zoom = 1 + (0.15 * multiplier); // ~1.09–1.21 depending on intensity
  const scaledW = Math.round(width * zoom);
  
  // Available travel distance (horizontal only)
  const travelX = scaledW - width;
  
  // Generate smooth easing curve for left-to-right motion
  const easingExpression = intensity === 'subtle' 
    ? `${travelX}*(sin(t/${duration}*PI-PI/2)*0.5+0.5)` // Very gentle sine wave
    : intensity === 'moderate'
    ? `${travelX}*(-(cos(PI*t/${duration})-1)/2)` // Smooth ease-in-out sine
    : `${travelX}*if(lt(t/${duration},0.5),2*pow(t/${duration},2),1-pow(-2*t/${duration}+2,2)/2)`; // Cubic ease-in-out
  
  // Add slight vertical drift for more natural movement
  const verticalDrift = intensity !== 'subtle' ? `sin(t/${duration}*PI*2)*${Math.round(height * 0.01)}` : '0';
  
  // Multi-stage pipeline with enhanced smoothness:
  // 1. Lock frame rate for consistent timing
  // 2. Scale with bicubic interpolation for quality
  // 3. Apply smooth eased motion with time-based interpolation
  return [
    `fps=${fps}`,
    `scale=w=iw*${zoom}:h=ih*${zoom}:flags=bicubic:eval=frame`,
    `crop=w=${width}:h=${height}:x='${easingExpression}':y='${verticalDrift}':exact=1`
  ].join(',');
}

/**
 * Generate animation filter for slow zoom effect
 */
function generateSlowZoomFilter(
  duration: number, 
  width: number, 
  height: number, 
  intensity: AnimationIntensity
): string {
  const multiplier = getIntensityMultiplier(intensity);
  
  // Very gentle zoom using scale filter
  const startScale = 1.0;
  const endScale = 1.0 + (0.08 * multiplier); // Subtle zoom
  
  // Slow, smooth zoom
  return `scale=w='iw*${startScale}+(iw*(${endScale}-${startScale}))*t/${duration}':h='ih*${startScale}+(ih*(${endScale}-${startScale}))*t/${duration}':eval=frame,crop=${width}:${height}`;
}

/**
 * Generate animation filter for gentle pan effect
 * Uses enhanced easing curves for ultra-smooth circular motion
 */
function generateGentlePanFilter(
  duration: number, 
  width: number, 
  height: number, 
  intensity: AnimationIntensity,
  fps: number = 30
): string {
  const multiplier = getIntensityMultiplier(intensity);
  
  // Increased zoom for more travel distance and smoother motion
  const zoom = 1 + (0.12 * multiplier); // ~1.072–1.168 depending on intensity
  const scaledW = Math.round(width * zoom);
  const scaledH = Math.round(height * zoom);
  
  // Calculate available travel distance
  const travelX = scaledW - width;
  const travelY = scaledH - height;
  
  // Create gentle circular motion using sine and cosine
  const panRadius = Math.min(travelX, travelY) * 0.3; // 30% of available space
  const centerX = travelX / 2;
  const centerY = travelY / 2;
  
  // Generate smooth circular motion with time-based easing
  const easingExpression = intensity === 'subtle' 
    ? `sin(t/${duration}*PI-PI/2)*0.5+0.5` // Very gentle sine wave
    : intensity === 'moderate'
    ? `-(cos(PI*t/${duration})-1)/2` // Smooth ease-in-out sine
    : `if(lt(t/${duration},0.5),2*pow(t/${duration},2),1-pow(-2*t/${duration}+2,2)/2)`; // Cubic ease-in-out
  
  // Circular motion expressions
  const xExpression = `${centerX}+${panRadius}*cos(2*PI*t/${duration}*(${easingExpression}))`;
  const yExpression = `${centerY}+${panRadius}*sin(2*PI*t/${duration}*(${easingExpression}))`;
  
  // Multi-stage pipeline with enhanced smoothness
  return [
    `fps=${fps}`,
    `scale=w=iw*${zoom}:h=ih*${zoom}:flags=bicubic:eval=frame`,
    `crop=w=${width}:h=${height}:x='${xExpression}':y='${yExpression}':exact=1`
  ].join(',');
}


/**
 * Generate FFmpeg animation filter based on animation settings
 */
export function generateAnimationFilter(
  animationSettings: AnimationSettings,
  duration: number,
  width: number = 1920,
  height: number = 1080
): string {
  console.log(`🎬 [Animation] Generating ${animationSettings.type} filter with ${animationSettings.intensity} intensity for ${duration}s`);

  switch (animationSettings.type) {
    case 'none':
      return '';
    
    case 'ken-burns-zoom-in':
      return generateKenBurnsZoomInFilter(duration, width, height, animationSettings.intensity);
    
    case 'ken-burns-pan-diagonal':
      return generateKenBurnsPanDiagonalFilter(duration, width, height, animationSettings.intensity);
    
    case 'ken-burns-pan-left':
      return generateKenBurnsPanLeftFilter(duration, width, height, animationSettings.intensity);
    
    case 'ken-burns-pan-right':
      return generateKenBurnsPanRightFilter(duration, width, height, animationSettings.intensity);
    
    case 'slow-zoom':
      return generateSlowZoomFilter(duration, width, height, animationSettings.intensity);
    
    case 'gentle-pan':
      return generateGentlePanFilter(duration, width, height, animationSettings.intensity);
    
    default:
      console.warn(`🔗 [Animation] Unknown animation type: ${animationSettings.type}, using no animation`);
      return '';
  }
}

/**
 * Get default animation settings
 */
export function getDefaultAnimationSettings(): AnimationSettings {
  return {
    type: 'ken-burns-pan-diagonal', // Default to diagonal pan effect
    intensity: 'subtle'
  };
}

/**
 * Validate animation settings
 */
export function validateAnimationSettings(settings: AnimationSettings): boolean {
  const validTypes: AnimationType[] = [
    'none', 'ken-burns-zoom-in', 'ken-burns-pan-diagonal', 
    'ken-burns-pan-left', 'ken-burns-pan-right', 
    'slow-zoom', 'gentle-pan'
  ];
  
  const validIntensities: AnimationIntensity[] = ['subtle', 'moderate', 'strong'];
  
  if (!validTypes.includes(settings.type)) {
    console.error(`❌ [Animation] Invalid animation type: ${settings.type}`);
    return false;
  }
  
  if (!validIntensities.includes(settings.intensity)) {
    console.error(`❌ [Animation] Invalid animation intensity: ${settings.intensity}`);
    return false;
  }
  
  return true;
}

/**
 * Get human-readable description for animation type
 */
export function getAnimationDescription(type: AnimationType): string {
  switch (type) {
    case 'none':
      return 'No animation - static image';
    case 'ken-burns-zoom-in':
      return 'Ken Burns: Slow zoom in effect';
    case 'ken-burns-pan-diagonal':
      return 'Ken Burns: Diagonal pan from top-left to bottom-right';
    case 'ken-burns-pan-left':
      return 'Ken Burns: Pan from right to left';
    case 'ken-burns-pan-right':
      return 'Ken Burns: Pan from left to right';
    case 'slow-zoom':
      return 'Slow zoom: Very subtle zoom in';
    case 'gentle-pan':
      return 'Gentle pan: Soft circular movement';
    default:
      return 'Unknown animation type';
  }
}

/**
 * Get all available animation types with descriptions
 */
export function getAvailableAnimations(): Array<{ type: AnimationType; description: string }> {
  const types: AnimationType[] = [
    'none', 'ken-burns-zoom-in', 'ken-burns-pan-diagonal', 
    'ken-burns-pan-left', 'ken-burns-pan-right', 
    'slow-zoom', 'gentle-pan'
  ];
  
  return types.map(type => ({
    type,
    description: getAnimationDescription(type)
  }));
}
