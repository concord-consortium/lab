import sinon from "sinon";

export default {
  _canExportData: false,
  exportData: sinon.spy(),
  logAction: sinon.spy(),
  canExportData() {
    return this._canExportData;
  },
  init() {}
};
