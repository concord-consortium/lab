/*global define: false, window: false */

import $__import_export_codap_interface from 'import-export/codap-interface';
import $__import_export_netlogo_importer from 'import-export/netlogo-importer';


window.Lab = window.Lab || {};

export default window.Lab.importExport = {
  version: "0.0.1",
  // ==========================================================================
  // Functions and modules which should belong to this API:

  codapInterface: $__import_export_codap_interface,
  netlogoImporter: $__import_export_netlogo_importer
    // ==========================================================================
};
