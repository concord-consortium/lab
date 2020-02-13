/**
  Tiny module providing global way to show errors to user.

  It's better to use module, as in the future, we may want to replace basic
  alert with more sophisticated solution (for example jQuery UI dialog).
*/
import console from 'common/console';
  // Try to use global alert. If it's not available, use console.error (node.js).
  const alertFunc = typeof window.alert !== 'undefined' ? window.alert : console.error;

export default function(msg) {
  alertFunc(msg);
}
