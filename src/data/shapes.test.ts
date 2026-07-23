import { describe, expect, test } from "vitest";
import { DESTINATIONS } from "./gateway";
import { SHAPE_REGISTRY } from "../components/ShapeGrid";

describe("shape registry coverage", () => {
  test("contains a component for every destination", () => {
    for (const destination of DESTINATIONS) {
      expect(SHAPE_REGISTRY[destination.shapeIndex]).toBeDefined();
    }
  });
});
