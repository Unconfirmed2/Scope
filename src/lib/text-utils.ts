/**
 * Text formatting utilities for human-friendly display
 */

/**
 * Formats AI-generated text by converting markdown-style formatting to human-readable text
 */
export function formatAIText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    // Convert **bold** to "quoted" text for better readability
    .replace(/\*\*(.*?)\*\*/g, '"$1"')
    // Convert *italic* to regular text
    .replace(/\*(.*?)\*/g, '$1')
    // Clean up any remaining markdown-style formatting
    .replace(/`([^`]+)`/g, '$1')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formats JSON-like content for human display
 */
export function formatJSONForDisplay(data: any): string {
  if (data == null) return '';
  if (typeof data === 'string') {
    // If it's already a string, format it as AI text
    return formatAIText(data);
  }
  
  try {
    // If it's an object, convert to readable string
    const jsonString = JSON.stringify(data, null, 2);
    // Apply text formatting to the result
    return formatAIText(jsonString);
  } catch {
    return String(data);
  }
}

/**
 * Formats toast messages to be user-friendly
 */
export function formatToastMessage(message: any): string {
  if (typeof message === 'string') {
    return formatAIText(message);
  }
  
  if (typeof message === 'object' && message !== null) {
    // Extract meaningful text from objects
    if (message.message) return formatAIText(message.message);
    if (message.text) return formatAIText(message.text);
    if (message.description) return formatAIText(message.description);
    
    // If it's a simple object, convert to readable format
    try {
      return formatAIText(JSON.stringify(message));
    } catch {
      return 'An operation completed successfully';
    }
  }
  
  return String(message);
}

/**
 * Pretty-print JSON for human-readable preview with proper formatting
 */
export function prettyPrintForDisplay(data: any): string {
  if (data == null) return '';
  if (typeof data === 'string') return formatAIText(data.trim());
  
  try {
    const formatted = JSON.stringify(data, null, 2);
    return formatAIText(formatted);
  } catch {
    return formatAIText(String(data));
  }
}