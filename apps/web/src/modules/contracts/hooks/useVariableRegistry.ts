import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "musicos360_variable_registry";

export interface RegistryVariable {
  id: string;
  name: string;
  group: string;
  field: string;
  placeholder: string;
  createdAt: string;
}

function generateId(): string {
  return `rv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function load(): RegistryVariable[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RegistryVariable[];
  } catch {
    return [];
  }
}

function save(vars: RegistryVariable[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vars));
  } catch {
    // storage full or unavailable — fail silently
  }
}

export function useVariableRegistry() {
  const [variables, setVariables] = useState<RegistryVariable[]>(load);

  useEffect(() => {
    save(variables);
  }, [variables]);

  const addVariable = useCallback(
    (name: string, group: string, field: string): RegistryVariable => {
      const normalGroup = group.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
      const normalField = field.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
      const placeholder = `{{${normalGroup}.${normalField}}}`;
      const newVar: RegistryVariable = {
        id: generateId(),
        name: name.trim(),
        group: normalGroup,
        field: normalField,
        placeholder,
        createdAt: new Date().toISOString(),
      };
      setVariables((prev) => [...prev, newVar]);
      return newVar;
    },
    [],
  );

  const updateVariable = useCallback(
    (id: string, updates: Partial<Pick<RegistryVariable, "name" | "group" | "field">>) => {
      setVariables((prev) =>
        prev.map((v) => {
          if (v.id !== id) return v;
          const group = (updates.group ?? v.group).toUpperCase().replace(/[^A-Z0-9_]/g, "_");
          const field = (updates.field ?? v.field).toUpperCase().replace(/[^A-Z0-9_]/g, "_");
          return {
            ...v,
            name: updates.name?.trim() ?? v.name,
            group,
            field,
            placeholder: `{{${group}.${field}}}`,
          };
        }),
      );
    },
    [],
  );

  const removeVariable = useCallback((id: string) => {
    setVariables((prev) => prev.filter((v) => v.id !== id));
  }, []);

  return { variables, addVariable, updateVariable, removeVariable };
}
