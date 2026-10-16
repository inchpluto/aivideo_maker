import { useCallback, useLayoutEffect, useRef } from 'react';

// An operation belongs to a committed project lifetime, not merely an ID:
// A → B → A must never reactivate a response from the first visit to A.
export function useProjectOperations(projectId) {
  const scopeRef = useRef(null);
  useLayoutEffect(() => {
    const scope = { projectId, active: true, operations: new Map() };
    scopeRef.current = scope;
    return () => {
      scope.active = false;
      for (const controller of scope.operations.values()) controller.abort();
      scope.operations.clear();
    };
  }, [projectId]);

  return useCallback(key => {
    const scope = scopeRef.current;
    if (!projectId || !scope?.active || scope.projectId !== projectId || scope.operations.has(key)) return null;
    const controller = new AbortController();
    scope.operations.set(key, controller);
    return {
      projectId, signal: controller.signal,
      isActive: () => scope.active && scopeRef.current === scope && !controller.signal.aborted,
      isCurrent: () => scope.active && scopeRef.current === scope && scope.operations.get(key) === controller && !controller.signal.aborted,
      finish: () => { if (scope.operations.get(key) === controller) scope.operations.delete(key); },
    };
  }, [projectId]);
}
