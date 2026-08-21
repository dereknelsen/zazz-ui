import "react";

declare module "react" {
  interface ButtonHTMLAttributes<T> {
    /** Invoker Commands API — action to perform on `commandfor` element */
    command?: string;
    /** Invoker Commands API — id of the element this button controls */
    commandfor?: string;
    /** Popover target (HTML `popover`) */
    popoverTarget?: string;
  }

  interface DialogHTMLAttributes<T> {
    /** Native dialog dismiss behavior (HTML `closedby`) */
    closedby?: "any" | "closerequest" | "none";
  }
}
