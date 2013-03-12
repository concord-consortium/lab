define(function() {
  return (function() {
    function withinRect() {
      return function(x1, y1, w, h) {
        var inX, inY;
        inX = this.x >= x1 && this.x <= x1 + w;
        inY = this.y >= y1 && this.y <= y1 + h;
        return inX && inY;
      };
    }
    function withinRadius() {
      return function(x1, y1, r) {
        var dx = x1 - this.x,
            dy = y1 - this.y;
            dist = Math.sqrt(dx * dx + dy * dy);
        return dist <= r;
      };
    }
    function radialBonds() {
      return function() {
        return engine.getRadialBondsForAtom();
      };
    }
    return function(i, engine) {
      this.index = i;
      this.engine        = engine;
      this.withinRect    = withinRect();
      this.withinRadius  = withinRadius();
      this.radialBonds   = radialBonds(i);
      return this;
    };
  })();
});