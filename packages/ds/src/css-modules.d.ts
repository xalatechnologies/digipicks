/**
 * CSS Module Type Declarations
 * 
 * This file provides TypeScript type definitions for CSS modules.
 * It allows importing .module.css files without TypeScript errors.
 */

declare module '*.module.css' {
    const classes: { readonly [key: string]: string };
    export default classes;
}
