// Minimal, dependency-free JSON Schema validator covering the subset this pack's
// own contracts actually use: type, required, enum, const, properties, items,
// additionalProperties=false, and $ref to a sibling file in the same directory.
// Not a general-purpose ajv replacement — deliberately small (ponytail: no new
// dependency for a few dozen lines of structural checks) and covered by tests.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const schemaCache = new Map();

export function loadSchema(schemaPath) {
  if (schemaCache.has(schemaPath)) return schemaCache.get(schemaPath);
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  schemaCache.set(schemaPath, schema);
  return schema;
}

function resolveRef(ref, baseDir) {
  const refPath = join(baseDir, ref);
  if (!existsSync(refPath)) throw new Error(`SCHEMA_REF_NOT_FOUND: ${ref} (resolved ${refPath})`);
  return loadSchema(refPath);
}

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function checkType(expected, value, path, errors) {
  const types = Array.isArray(expected) ? expected : [expected];
  const actual = typeOf(value);
  const ok = types.some((t) => t === actual || (t === "integer" && actual === "number" && Number.isInteger(value)));
  if (!ok) errors.push(`${path}: expected type ${types.join("|")}, got ${actual}`);
}

function validateNode(schema, value, path, baseDir, errors) {
  if (schema.$ref) schema = resolveRef(schema.$ref, baseDir);
  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path}: expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(value)}`);
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: ${JSON.stringify(value)} not in enum [${schema.enum.join(", ")}]`);
    return;
  }
  if (schema.type) checkType(schema.type, value, path, errors);
  if (schema.type === "object" || (Array.isArray(schema.type) && schema.type.includes("object"))) {
    if (typeOf(value) !== "object") return;
    for (const req of schema.required || []) {
      if (!(req in value)) errors.push(`${path}: missing required property "${req}"`);
    }
    for (const [key, val] of Object.entries(value)) {
      const propSchema = schema.properties?.[key];
      if (propSchema) validateNode(propSchema, val, `${path}.${key}`, baseDir, errors);
      else if (schema.additionalProperties === false) errors.push(`${path}: unexpected property "${key}"`);
    }
  }
  if (schema.type === "array" && Array.isArray(value) && schema.items) {
    value.forEach((item, i) => validateNode(schema.items, item, `${path}[${i}]`, baseDir, errors));
  }
}

/** validate(schemaPath, data) -> { valid, errors } */
export function validate(schemaPath, data) {
  const schema = loadSchema(schemaPath);
  const errors = [];
  validateNode(schema, data, "$", dirname(schemaPath), errors);
  return { valid: errors.length === 0, errors };
}
