interface InitDialogLifecycleFn {
  (): void;
  _bound?: boolean;
}
/**
 * @description Starts the page-wide dialog watcher. Idempotent — safe to call
 * from double script loads.
 */
declare const initDialogLifecycle: InitDialogLifecycleFn;
export { initDialogLifecycle };
//# sourceMappingURL=dialog-lifecycle.d.ts.map
