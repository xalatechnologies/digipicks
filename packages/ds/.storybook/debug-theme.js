// Debug script to inspect Storybook's DOM structure
// Run this in browser console to see what selectors Storybook actually uses

console.log('=== Storybook DOM Inspector ===');

// Find top bar
const topBar = document.querySelector('[role="banner"]') || 
               document.querySelector('header') ||
               document.querySelector('[class*="header"]') ||
               document.querySelector('[class*="toolbar"]');
console.log('Top bar:', topBar);
if (topBar) {
  console.log('Top bar classes:', topBar.className);
  console.log('Top bar computed background:', window.getComputedStyle(topBar).backgroundColor);
  console.log('Top bar inline style:', topBar.getAttribute('style'));
}

// Find sidebar
const sidebar = document.querySelector('aside') ||
                document.querySelector('nav') ||
                document.querySelector('[class*="sidebar"]') ||
                document.querySelector('[class*="Sidebar"]');
console.log('Sidebar:', sidebar);
if (sidebar) {
  console.log('Sidebar classes:', sidebar.className);
}

// Find selected item
const selected = document.querySelector('[data-selected="true"]') ||
                 document.querySelector('[aria-current="true"]') ||
                 document.querySelector('[class*="selected"]') ||
                 document.querySelector('[class*="active"]');
console.log('Selected item:', selected);
if (selected) {
  console.log('Selected classes:', selected.className);
  console.log('Selected computed background:', window.getComputedStyle(selected).backgroundColor);
  console.log('Selected inline style:', selected.getAttribute('style'));
  console.log('Selected parent:', selected.parentElement);
}

// Find all elements with yellow backgrounds
const allYellow = Array.from(document.querySelectorAll('*')).filter(el => {
  const bg = window.getComputedStyle(el).backgroundColor;
  return bg.includes('rgb(255') || bg.includes('rgb(254') || bg.includes('#FF');
});
console.log('Elements with yellow/orange backgrounds:', allYellow);
allYellow.forEach((el, i) => {
  console.log(`Yellow element ${i}:`, el, 'classes:', el.className, 'bg:', window.getComputedStyle(el).backgroundColor);
});

