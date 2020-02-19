const assert = require("assert");
import {Line, Polygon, Rectangle, Ellipse, Ring} from "models/energy2d/models/shape";

describe("Shape", () => {
  describe("Rectangle", () => {
    let rectangle = null;
    beforeEach(() => {
      rectangle = new Rectangle(1, 1, 2, 2);
    });
    it("should contain points laying inside", () => {
      assert.isTrue(rectangle.contains(1.01, 1.01), true);
      assert.isTrue(rectangle.contains(2.00, 2.00), true);
      assert.isTrue(rectangle.contains(2.99, 2.99), true);
      // Boundary
      assert.isTrue(rectangle.contains(1, 1), true);
      assert.isTrue(rectangle.contains(3, 3), true);
    });
    it("should contain points laying outside", () => {
      assert.equal(rectangle.contains(0.99, 1.50), false);
      assert.equal(rectangle.contains(1.50, 0.99), false);
      assert.equal(rectangle.contains(3.01, 1.50), false);
      assert.equal(rectangle.contains(1.50, 3.01), false);
    });
  });

  describe("Ellipse", () => {
    let ellipse = null;
    beforeEach(() => {
      ellipse = new Ellipse(5, 5, 2, 4);
    });
    it("should contain points laying inside", () => {
      assert.isTrue(ellipse.contains(4.01, 5.00));
      assert.isTrue(ellipse.contains(5.00, 5.00));
      assert.isTrue(ellipse.contains(5.00, 6.99));
      // Boundary
      assert.isTrue(ellipse.contains(4, 5));
      assert.isTrue(ellipse.contains(5, 7));
    });
    it("should contain points laying outside", () => {
      assert.isFalse(ellipse.contains(3.99, 5.0));
      assert.isFalse(ellipse.contains(5.0, 2.99));
      assert.isFalse(ellipse.contains(6.01, 5.0));
      assert.isFalse(ellipse.contains(5.0, 7.01));
    });
  });

  describe("Ring", () => {
    let ring = null;
    beforeEach(() => {
      ring = new Ring(5, 5, 2, 4);
    });
    it("should contain points laying inside", () => {
      assert.isTrue(ring.contains(3.01, 5.00));
      assert.isTrue(ring.contains(3.99, 5.00));
      assert.isTrue(ring.contains(5.00, 6.01));
      assert.isTrue(ring.contains(5.00, 6.99));
      // Boundary
      assert.isTrue(ring.contains(3, 5));
      assert.isTrue(ring.contains(4, 5));
      assert.isTrue(ring.contains(5, 3));
      assert.isTrue(ring.contains(5, 4));
      assert.isTrue(ring.contains(5, 6));
      assert.isTrue(ring.contains(5, 7));
      assert.isTrue(ring.contains(6, 5));
      assert.isTrue(ring.contains(7, 5));
    });
    it("should contain points laying outside", () => {
      assert.isFalse(ring.contains(2.99, 5.0));
      assert.isFalse(ring.contains(5.0, 2.99));
      assert.isFalse(ring.contains(4.01, 5.0));
      assert.isFalse(ring.contains(5.0, 4.01));
      assert.isFalse(ring.contains(5.0, 5.0));
      assert.isFalse(ring.contains(5.0, 5.99));
      assert.isFalse(ring.contains(5.99, 5.0));
      assert.isFalse(ring.contains(5.0, 7.01));
      assert.isFalse(ring.contains(7.01, 5.0));
    });
  });

  describe("Polygon", () => {
    let polygon = null;
    beforeEach(() => {
      var
        count = 6,
        x_coords = [1, 3, 5, 7, 9, 5],
        y_coords = [1, 3, 1, 3, 1, -3];
      polygon = new Polygon(count, x_coords, y_coords);
    });
    it("should contain points laying inside", () => {
      assert.isTrue(polygon.contains(1.5, 1.5));
      assert.isTrue(polygon.contains(1.01, 1.00));
      assert.isTrue(polygon.contains(8.99, 1.00));
      assert.isTrue(polygon.contains(5.00, 0.99));
      assert.isTrue(polygon.contains(5.0, -2.99));
      assert.isTrue(polygon.contains(3.00, 2.99));
      assert.isTrue(polygon.contains(7.00, 2.99));
      assert.isTrue(polygon.contains(5.00, 0.00));
    });
    it("should contain points laying outside", () => {
      assert.isFalse(polygon.contains(0.99, 1.00));
      assert.isFalse(polygon.contains(9.01, 1.00));
      assert.isFalse(polygon.contains(5.00, 1.01));
      assert.isFalse(polygon.contains(5.0, -3.01));
      assert.isFalse(polygon.contains(3.00, 3.01));
      assert.isFalse(polygon.contains(7.00, 3.01));
      assert.isFalse(polygon.contains(5.00, 2.00));
    });
  });

  describe("Line", () => {
    let line = null;
    beforeEach(() => {
      line = new Line(1, 1, 10, 10);
    });
    it("should detect intersection", () => {
      var another_line;
      // identical
      another_line = new Line(1, 1, 10, 10);
      //assert.isTrue(line.intersectsLine(another_line));
      another_line = new Line(10, 10, 1, 1);
      assert.isTrue(line.intersectsLine(another_line));
      // intersecting
      another_line = new Line(1, 5, 10, 1);
      assert.isTrue(line.intersectsLine(another_line));
    });
    it("should not detect intersection with parallel lines", () => {
      var another_line;
      another_line = new Line(1, 1.1, 10, 10.1);
      assert.isFalse(line.intersectsLine(another_line));
      another_line = new Line(10, 9.9, 1, 0.9);
      assert.isFalse(line.intersectsLine(another_line));
    });
    it("should not detect intersection with lines laying far away", () => {
      var another_line;
      another_line = new Line(10, 12, 12, 10);
      assert.isFalse(line.intersectsLine(another_line));
      another_line = new Line(9.1, 12, 11.1, 8);
      assert.isFalse(line.intersectsLine(another_line));
    });
  });
});
